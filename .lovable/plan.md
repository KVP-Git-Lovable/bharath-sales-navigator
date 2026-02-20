
## Hierarchy-Wise Attendance & Approval Flow — Complete Diagnosis & Fix Plan

### The Actual Hierarchy

```text
Abhishek KP (top manager, no manager)
├── Prabhu KVP     (L1 under Abhishek)
├── Prajwal KVP    (L1 under Abhishek)
│   ├── Alice      (L1 under Prajwal, L2 under Abhishek)
│   ├── Nishdeep   (L1 under Prajwal, L2 under Abhishek)
│   ├── Saurav     (L1 under Prajwal, L2 under Abhishek)
│   ├── Shravya K  (L1 under Prajwal, L2 under Abhishek)
│   │   └── Vikhyath (L1 under Shravya, L3 under Abhishek)
│   └── Suyog      (L1 under Prajwal, L2 under Abhishek)
└── Satyaprakash   (L1 under Abhishek)
```

---

### Issues Found (5 distinct problems)

---

#### Problem 1 — Orphan Pending Leaves (No Approval Engine Entry)

**What:** Prajwal's leave (`99b45f02`) and Suyog's leave (`0c99ba44`) were submitted **before** the `trg_leave_approval_request` trigger was added. They have `status = 'pending'` but zero entries in `approval_requests`. Because the `pendingStepsData` query in `useTeamAttendance.ts` only fetches via `approval_steps`, these leaves are **invisible** to every manager. They will sit pending forever.

**Fix:** A database migration to backfill `approval_requests` and `approval_steps` for every `pending` leave application that has no corresponding approval request. We'll call the existing `create_approval_request` function for each orphaned leave.

```sql
-- Backfill orphan pending leaves
DO $$
DECLARE
  la RECORD;
BEGIN
  FOR la IN
    SELECT id, user_id FROM leave_applications
    WHERE status = 'pending'
      AND id NOT IN (SELECT entity_id FROM approval_requests WHERE entity_type = 'leave')
  LOOP
    PERFORM create_approval_request('leave', la.id, la.user_id);
  END LOOP;
END;
$$;

-- Backfill orphan pending regularizations
DO $$
DECLARE
  rr RECORD;
BEGIN
  FOR rr IN
    SELECT id, user_id FROM regularization_requests
    WHERE status = 'pending'
      AND id NOT IN (SELECT entity_id FROM approval_requests WHERE entity_type = 'regularization')
  LOOP
    PERFORM create_approval_request('regularization', rr.id, rr.user_id);
  END LOOP;
END;
$$;
```

After this, Prajwal will see Suyog's leave in his Team Approvals, and Abhishek will see Prajwal's own leave request.

---

#### Problem 2 — `queryKey` Scoping Bug: Engine Approvals Not Refreshing

**What:** In `useTeamAttendance.ts` line 135, the `pendingStepsData` query key is:
```ts
queryKey: ['team-pending-leaves', approvalUserIds, user?.id]
```
But `approvalUserIds` is `directReportIds || subordinateIds` — a per-instance array. When `handleLeaveAction` invalidates `['team-pending-leaves']` (line 442), **React Query does NOT invalidate** queries whose full key includes extra elements unless you use a prefix match. The invalidation currently uses partial `queryKey` matching but the array deep-comparison may cause cache staleness after an approve/reject action.

**Fix:** Change the invalidation call to use exact key structure, and also invalidate `['team-pending-leaves']` broadly with `exact: false` to ensure all approval-step caches are cleared.

```ts
// In handleLeaveAction and handleRegularizationAction:
queryClient.invalidateQueries({ queryKey: ['team-pending-leaves'], exact: false });
queryClient.invalidateQueries({ queryKey: ['team-pending-regularizations'], exact: false });
```

---

#### Problem 3 — `onLeaveCount` Double-Counts Users Already Marked Present

**What:** In `useTeamAttendance.ts` line 295:
```ts
const onLeaveCount = [...onLeaveUserIds].filter(id => !presentUserIds.has(id)).length;
```
This is correct logic, but `onLeaveUserIds` comes from `leave_applications` (approved leaves covering today). However, `todayAttendance` also contains rows with `status = 'leave'` (inserted by `mark_attendance_on_leave_approval` trigger). If a user has a leave attendance record AND an approved leave application, they're correctly excluded from `presentCount`. But if only the attendance row exists and not the leave application (edge case), the count would be wrong.

**Fix:** Unify the "on leave" detection. A user is on leave if:
- They have an `attendance` row with `status = 'leave'` or `'half_day_leave'` for today, OR
- They have an approved `leave_applications` record covering today

The current code already handles this in `todayStatus` logic via the `att` check (fixed last time). But `onLeaveCount` for the summary cards should be:
```ts
const onLeaveUserIds = new Set([
  ...todayAttendance.filter((a: any) => ['leave', 'half_day_leave'].includes(a.status)).map((a: any) => a.user_id),
  ...todayLeaves.map((l: any) => l.user_id).filter((id: string) => !presentUserIds.has(id))
]);
const onLeaveCount = onLeaveUserIds.size;
const absentCount = Math.max(0, subordinateIds.length - presentUserIds.size - onLeaveUserIds.size);
```

---

#### Problem 4 — My Leave Applications: Missing Approval Status Tracker

**What:** In `MyLeaveApplications.tsx`, the user only sees "Pending" for their leave — they cannot see which level of manager is currently reviewing their request, or who specifically needs to approve it next. Shravya has no way of knowing that Prajwal is her current pending approver.

**Fix:** In `MyLeaveApplications.tsx`, add an additional query to fetch the `approval_requests` for the user's pending leaves, and show a small status tracker: "Pending with Prajwal (Level 1 of 2)".

Specifically, after fetching leave applications, also query:
```ts
SELECT ar.entity_id, ar.current_level, ar.total_levels, p.full_name as approver_name
FROM approval_requests ar
JOIN approval_steps ast ON ast.approval_request_id = ar.id 
  AND ast.level = ar.current_level AND ast.status = 'pending'
JOIN profiles p ON p.id = ast.approver_id
WHERE ar.requester_id = user.id AND ar.status = 'pending'
```

Then display next to the "Pending" badge: `"Awaiting Prajwal (L1/2)"`.

---

#### Problem 5 — `AttendanceManagement` Admin Page Bypasses Approval Engine

**What:** The `AttendanceManagement.tsx` admin Leave Management tab directly updates `leave_applications.status` without calling `process_approval_step`. This bypasses the multi-level hierarchy entirely — an admin can force-approve any leave. While intentional for admins, it also means:
- The `approval_requests` table does NOT get updated (remains `pending` forever after admin directly approves)
- The audit log in `approval_audit_log` gets no entry

**Fix:** In `handleLeaveStatusUpdate` in `AttendanceManagement.tsx`, after directly updating the leave application status, also update the corresponding `approval_request` (if any) to the same status so it's consistent:
```ts
// After updating leave_applications:
await supabase.from('approval_requests')
  .update({ status: newStatus, updated_at: new Date().toISOString() })
  .eq('entity_id', applicationId)
  .eq('entity_type', 'leave');
```

---

### Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/[new].sql` | Backfill orphan pending leaves/regs into approval engine |
| `src/hooks/useTeamAttendance.ts` | Fix `onLeaveCount` logic + fix query invalidation |
| `src/components/MyLeaveApplications.tsx` | Add approval tracker showing "Awaiting [Manager] (L1/2)" |
| `src/pages/AttendanceManagement.tsx` | Sync `approval_requests` table when admin approves/rejects directly |

### Execution Order

1. **Migration first** — backfill orphans so Prajwal/Abhishek see all pending leaves immediately
2. **`useTeamAttendance.ts`** — fix counts and cache invalidation
3. **`MyLeaveApplications.tsx`** — add approval status tracker
4. **`AttendanceManagement.tsx`** — sync approval engine on admin actions
