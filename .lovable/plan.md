
## Root Cause: Leave Application Data Silently Blocked → Card Filtered Out

### What's happening (confirmed by database investigation)

The approval engine backend is **working perfectly**:
- Shravya's leave application ID: `898b885d`
- `approval_request` created: `fe52609f`, `current_level: 1`, `total_levels: 2`, status: `pending`
- Prajwal's `approval_step` exists: level 1, `approver_id = Prajwal`, status: `pending`
- Database query returns the step correctly

**The failure is in the frontend hook**, in two places:

### Bug 1 — Silent data fetch failure (primary cause)

In `useTeamAttendance.ts` lines 179-183, after identifying the leave IDs to fetch:

```ts
const { data: leaves } = await supabase
  .from('leave_applications')
  .select('id, user_id, start_date, end_date, reason, leave_type_id')
  .in('id', leaveIds);
// ⚠️ No error handling — if this returns empty due to RLS, we never know
```

The `leave_applications` SELECT RLS policy for managers (`Managers can view their direct reports' leave applications`) does work for Prajwal. However, this fetch is done inside the same `queryFn` as the `approval_steps` fetch — and the **`enabled` flag** on this query is `enabled: !!user?.id`. This means it fires correctly. But the RLS on `leave_applications` only allows access if `employees.manager_id = auth.uid()`. There is a timing issue where `leaves` may come back empty or there's a subtle fetch issue.

### Bug 2 — `entityData` undefined → card silently filtered out (consequence)

At lines 291-295 in `pendingApprovals` builder:
```ts
const ed = item.entityData;
if (!ed) return null;  // ← card is dropped silently
```

If the `leave_applications` fetch returns empty (for any reason), `leaveMap.get(entityId)` = `undefined`, `entityData` = `undefined`, and the entire approval card is **removed from the list**. Prajwal sees zero pending approvals.

### Bug 3 — Profile display names show "Unknown"

Even if the card renders, `profileMap` is built from `profiles` which are fetched separately with `enabled: subordinateIds.length > 0`. On first render, profiles may not be loaded yet, so cards show "Unknown" instead of Shravya's name.

### Bug 4 — Missing `profiles` SELECT RLS for approvers

The profiles query uses `.in('id', subordinateIds)` — but the profiles table may have RLS policies restricting which profiles Prajwal can view. If Shravya's profile isn't fetchable, her name won't appear.

---

### Fix Plan

**File: `src/hooks/useTeamAttendance.ts`**

**Fix 1 — Fetch leave and profile details within the step query itself using a direct `profiles` join:**

Instead of relying on the separate `profiles` query (which has its own loading lifecycle), fetch the requester's profile **directly inside the `pendingStepsData` queryFn** using an additional Supabase call keyed on the `requester_id` from `approval_requests`.

**Fix 2 — Add error handling to the `leave_applications` fetch and log errors to console:**

```ts
const { data: leaves, error: leavesError } = await supabase
  .from('leave_applications')
  .select('id, user_id, start_date, end_date, reason, leave_type_id')
  .in('id', leaveIds);

if (leavesError) console.error('Leave fetch error:', leavesError);
```

**Fix 3 — Add a fallback: if `entityData` is undefined but we have the `entity_id` and `requester_id`, fetch the data directly inside the queryFn by user_id instead of just by IDs:**

The key insight: the `leave_applications` RLS policy allows managers to SELECT by checking `employees.manager_id = auth.uid()`. But we're fetching by `id` (the leave application ID). This should still work because the RLS checks the `user_id` field on the row, not the query filter.

**Fix 4 — Fetch requester profiles directly in the `pendingStepsData` queryFn** using the `requester_id` values from `approval_requests`, bypassing the race condition with the separate `profiles` query:

```ts
// After fetching steps, collect all requester IDs
const requesterIds = myTurnSteps.map((s: any) => s.approval_requests.requester_id);
const { data: requesterProfiles } = await supabase
  .from('profiles')
  .select('id, full_name, profile_picture_url, designation')
  .in('id', requesterIds);
```

Then use this `requesterProfileMap` inside the queryFn itself (no dependency on the outer `profileMap`), and return `fullName`, `profilePictureUrl`, etc. directly as part of the returned item — so the `pendingApprovals` builder never needs to look up profiles separately.

**Fix 5 — Add a database-level RLS fix on `leave_applications`:**

Add an additional SELECT policy that allows users to read leave applications where they are the approver in `approval_steps`:

```sql
CREATE POLICY "Approvers can view leave applications in their approval chain"
ON public.leave_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM approval_steps ast
    JOIN approval_requests ar ON ar.id = ast.approval_request_id
    WHERE ar.entity_id = leave_applications.id
      AND ar.entity_type = 'leave'
      AND ast.approver_id = auth.uid()
  )
);
```

This ensures that even if the `employees.manager_id` check fails for any reason (e.g., indirect reports at level 2), the approver can always read the entity they're supposed to approve.

**Same fix for `regularization_requests`:**

```sql
CREATE POLICY "Approvers can view regularizations in their approval chain"
ON public.regularization_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM approval_steps ast
    JOIN approval_requests ar ON ar.id = ast.approval_request_id
    WHERE ar.entity_id = regularization_requests.id
      AND ar.entity_type = 'regularization'
      AND ast.approver_id = auth.uid()
  )
);
```

---

### Implementation Steps

1. **Database migration** — Add two new RLS SELECT policies:
   - `leave_applications`: approvers can read via `approval_steps` chain
   - `regularization_requests`: approvers can read via `approval_steps` chain

2. **Update `useTeamAttendance.ts` `pendingStepsData` queryFn:**
   - Fetch requester profiles directly inside the queryFn (parallel with leave/reg fetches)
   - Add error logging for `leave_applications` and `regularization_requests` fetches
   - Return `fullName`, `profilePictureUrl`, `designation` as direct properties from the queryFn result
   - Remove the dependency on the outer `profileMap` for the engine approvals

3. **Update `pendingApprovals` builder (lines 288-356):**
   - Use `item.fullName`, `item.profilePictureUrl`, `item.designation` (from queryFn) instead of looking up from `profileMap`
   - Keep `profileMap` fallback for legacy regularization path only

These three changes guarantee:
- Prajwal can always read the leave/reg data he needs to approve (RLS fix)
- Profile data is always available when the approval card renders (self-contained fetch)
- Errors are visible in the console for future debugging
