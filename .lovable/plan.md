

## Fix: Half-Day Leave Not Working

### Problem
Two bugs are causing half-day leave to be recorded as a full day:

1. **Frontend**: The `LeaveApplicationModal` collects the half-day selection (`leaveDay` state) but **never sends** `is_half_day`, `half_day_period`, or `days_requested` to the database. Only `user_id`, `leave_type_id`, `start_date`, `end_date`, `reason`, and `status` are inserted.

2. **Database trigger**: The `update_leave_balance_on_status_change` trigger calculates leave days as `COALESCE(NEW.days_requested, end_date - start_date + 1)`. Since `days_requested` is never set, it always falls back to full-day math.

### Fix 1: Frontend -- Send half-day fields on insert

**File: `src/components/LeaveApplicationModal.tsx`**

Update the `.insert()` call (around line 93-102) to include:
- `is_half_day: leaveDay === 'half'`
- `half_day_period`: when half-day, default to `'first_half'` (or add a selector)
- `days_requested`: use `calculateLeaveDays()` to send the correct value (0.5 for half-day, full count otherwise)

```typescript
const { error } = await supabase
  .from('leave_applications')
  .insert({
    user_id: user.id,
    leave_type_id: leaveTypeId,
    start_date: format(startDate, 'yyyy-MM-dd'),
    end_date: format(endDate, 'yyyy-MM-dd'),
    reason: reason.trim(),
    status: 'pending',
    is_half_day: leaveDay === 'half',
    half_day_period: leaveDay === 'half' ? 'first_half' : null,
    days_requested: calculateLeaveDays(),
  });
```

### Fix 2: Database trigger -- Respect `is_half_day` flag

Update the trigger function so that when `days_requested` is provided, it uses that value directly (which it already does via `COALESCE`). Since we're now sending `days_requested` from the frontend, the existing trigger logic will work correctly without modification.

No trigger change needed -- the `COALESCE(NEW.days_requested, ...)` already prioritizes `days_requested` when provided.

### Fix 3 (optional): Add half-day period selector

Currently the UI only has Full Day / Half Day radio buttons. Optionally add a "First Half" / "Second Half" selector when Half Day is chosen, and send that as `half_day_period`.

### Summary of Changes

| File | Change |
|------|--------|
| `src/components/LeaveApplicationModal.tsx` | Add `is_half_day`, `half_day_period`, and `days_requested` to the insert payload |

This single frontend fix ensures:
- Half-day leave is recorded as 0.5 days in `days_requested`
- The existing DB trigger uses `days_requested` to deduct 0.5 from the balance
- Available decrements by 0.5 and Booked increments by 0.5

