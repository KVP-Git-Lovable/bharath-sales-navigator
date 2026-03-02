

## Attendance Regularization Policy -- Implementation Plan

### Overview
Add a configurable "Regularization Policy" section under Admin Panel > Attendance > Configuration > Attendance Policy. This policy will dynamically control how the regularization feature behaves for employees -- no code-level customization needed per client.

### Current State
- `AttendancePolicyConfig.tsx` currently only manages **Leave Entitlements** (leave policy table)
- `RegularizationRequestModal.tsx` has hardcoded behavior: always enabled, no limits, reason always required (min 10 chars), no backdate restriction, always manager approval
- No `regularization_policy` table exists in the database

---

### Phase 1: Database -- Create `regularization_policy` Table

Create a single-row configuration table storing all policy settings.

```text
Table: regularization_policy
+-------------------------------+-----------+---------------------------+
| Column                        | Type      | Default                   |
+-------------------------------+-----------+---------------------------+
| id                            | uuid PK   | gen_random_uuid()         |
| is_enabled                    | boolean   | true                      |
| monthly_limit                 | integer   | null (null = unlimited)   |
| daily_limit                   | integer   | 1                         |
| allow_checkin_edit             | boolean   | true                      |
| allow_checkout_edit            | boolean   | true                      |
| allow_status_edit              | boolean   | false                     |
| reason_mandatory               | boolean   | true                      |
| max_backdate_days              | integer   | 7                         |
| allow_previous_month           | boolean   | false                     |
| restrict_after_payroll_lock    | boolean   | false                     |
| approval_mode                  | text      | 'manager' (auto/manager/multi_level) |
| update_attendance_on_approval  | boolean   | true                      |
| recalculate_hours              | boolean   | true                      |
| adjust_leave_balance           | boolean   | false                     |
| created_at                     | timestamptz | now()                   |
| updated_at                     | timestamptz | now()                   |
+-------------------------------+-----------+---------------------------+
```

Insert a default row so the system works out of the box. Add RLS policies allowing authenticated read and admin-only write.

### Phase 2: Admin UI -- Regularization Policy Config Component

**New file:** `src/components/attendance/RegularizationPolicyConfig.tsx`

A card-based settings form with sections matching the policy structure:

1. **Enable/Disable** -- Master toggle switch at the top
2. **Usage Limits** -- Monthly limit (number input or "Unlimited" toggle), Daily limit per date
3. **Editable Fields** -- Toggle switches for Check-in, Check-out, Status editing; Reason mandatory toggle
4. **Time Restrictions** -- Max backdate days (number), Allow previous month (toggle), Restrict after payroll lock (toggle)
5. **Approval Workflow** -- Select dropdown: Auto Approval / Manager Approval / Multi-Level
6. **Post-Approval Impact** -- Toggles for: Update attendance record, Recalculate working hours, Adjust leave balance

Save button upserts the single policy row. Load on mount with `supabase.from('regularization_policy').select('*').single()`.

### Phase 3: Integrate Config into Attendance Policy Page

**Modify:** `src/components/attendance/AttendancePolicyConfig.tsx`

Add a second card below "Leave Entitlements" that renders the new `RegularizationPolicyConfig` component. Or render it as a sibling in the same parent. The "Attendance Policy" sub-tab will now show both Leave Entitlements and Regularization Policy.

### Phase 4: Enforce Policy in Regularization Request Modal

**Modify:** `src/components/RegularizationRequestModal.tsx`

On mount, fetch the regularization policy. Then enforce:

- **is_enabled = false**: Show "Regularization is not enabled for your organization." message and hide form
- **monthly_limit**: Count pending+approved requests for current month; if >= limit, block with message
- **daily_limit**: Count requests for the selected attendance_date; if >= limit, block
- **allow_checkin_edit / allow_checkout_edit**: Conditionally show/hide the time input fields
- **allow_status_edit**: Show/hide a status dropdown (Present/Half Day/Leave) -- new UI element
- **reason_mandatory**: If false, remove the required validation on reason field
- **max_backdate_days**: Calculate date difference; if attendance_date is older than allowed, block with message
- **allow_previous_month**: If false and attendance_date is in previous month, block
- **approval_mode = 'auto'**: Show info text "This request will be auto-approved" instead of "sent to manager"

### Phase 5: Enforce Policy on Backend (Approval Trigger)

**Modify existing trigger:** `apply_regularization_to_attendance`

Add conditional checks based on policy settings:
- If `update_attendance_on_approval = false`, skip the attendance upsert
- If `recalculate_hours = false`, skip hours recalculation
- If `adjust_leave_balance = true` and status changed, deduct/restore leave balance

For **auto-approval mode**: Create a new trigger `auto_approve_regularization` on `regularization_requests` INSERT that checks if `approval_mode = 'auto'` in the policy table, and if so, immediately sets `status = 'approved'`.

### Phase 6: Hook for Reusable Policy Access

**New file:** `src/hooks/useRegularizationPolicy.ts`

A React Query hook to fetch and cache the policy:
```typescript
export const useRegularizationPolicy = () => {
  return useQuery({
    queryKey: ['regularization-policy'],
    queryFn: async () => {
      const { data } = await supabase
        .from('regularization_policy')
        .select('*')
        .single();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
};
```

This hook will be used by both the admin config page and the employee modal.

---

### Files Summary

| Action | File |
|--------|------|
| Create | `src/components/attendance/RegularizationPolicyConfig.tsx` |
| Create | `src/hooks/useRegularizationPolicy.ts` |
| Modify | `src/components/attendance/AttendancePolicyConfig.tsx` (add regularization section) |
| Modify | `src/components/RegularizationRequestModal.tsx` (enforce all policy rules) |
| Database | Migration: create `regularization_policy` table + default row + RLS |
| Database | Migration: auto-approve trigger + conditional post-approval logic |

### Key Design Decisions
- Single-row config table (not per-user/per-department) -- matches the "organization-wide policy" requirement
- Policy fetched via React Query with 5-min cache to avoid redundant calls
- All validation happens both client-side (UX) and server-side (trigger/insert guards)
- Existing approval workflow (`create_approval_request`) is preserved for manager/multi-level modes
- Auto-approval mode bypasses the approval engine entirely via a direct status update trigger

