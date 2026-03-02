
## Show Regularization Time Details on Approvals Page

### Current State
- The hook already fetches `requested_check_in_time` and `requested_check_out_time` and maps them to `requestedCheckIn` / `requestedCheckOut` on the `PendingApproval` object.
- The approval handler already updates the attendance record with the requested times (via explicit upsert + a database trigger `apply_regularization_to_attendance`). So the auto-update on approval is **already working correctly**.
- **The only problem**: The `TeamApprovals.tsx` UI card for regularization requests does not display the requested check-in/check-out times. The manager sees only the date and reason, not the actual time change being requested.

### What Needs to Change

#### 1. Fetch actual attendance times for comparison
In `useTeamAttendance.ts`, for regularization requests, also fetch the current attendance record for that date so the manager can see the **actual** check-in/check-out vs. the **requested** times.

- Add `actualCheckIn` and `actualCheckOut` fields to the `PendingApproval` interface.
- After fetching regularization entity data, batch-fetch attendance records for those user+date combinations and merge the actual times into each approval item.

#### 2. Display times in TeamApprovals.tsx
In the regularization card's details section, add two lines showing:
- **Actual Check-in**: The current recorded time (or "No record" if absent)
- **Requested Check-in**: The time the employee wants it changed to
- Same for check-out times

This gives the manager clear visibility before approving.

### Technical Details

**File: `src/hooks/useTeamAttendance.ts`**
- Add `actualCheckIn?: string | null` and `actualCheckOut?: string | null` to `PendingApproval` interface.
- In both pending and processed queries, after building `regMap`, fetch attendance records for regularization dates and merge actual times.

**File: `src/pages/TeamApprovals.tsx`**
- In the details section, when `approval.type === 'regularization'`, render the actual vs. requested times in a compact format:
```
Actual:    09:45 AM - --:--
Requested: 09:00 AM - 06:00 PM
```

### Summary
- **Time visibility**: Fixed by displaying `requestedCheckIn`/`requestedCheckOut` (already in data) plus newly fetched actual times.
- **Auto-update on approval**: Already implemented correctly -- no changes needed. The attendance record is updated via both an explicit upsert in the handler and a database trigger.
