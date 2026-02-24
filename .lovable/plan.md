

## Update Leave Balance on Application (Not Just Approval)

### Problem
Currently, the `update_leave_balance_on_approval` trigger only updates leave balance when a leave is approved. The user expects balance to decrease immediately when a leave is applied.

### Solution
Modify the database trigger to handle three scenarios:
1. **On INSERT** (new application): Immediately deduct `days_requested` from the balance (increase `used_balance`)
2. **On status change to 'rejected' or 'cancelled'**: Restore the balance (decrease `used_balance`)
3. **On approval**: No additional change needed since balance was already deducted on application

### Technical Details

**Database Migration** -- Replace `update_leave_balance_on_approval` function and re-attach trigger:

```sql
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_status_change()
RETURNS trigger AS $$
DECLARE
  leave_days NUMERIC;
BEGIN
  leave_days := COALESCE(NEW.days_requested, NEW.end_date - NEW.start_date + 1);

  -- NEW application (INSERT): deduct immediately
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.leave_balance (user_id, leave_type_id, year, opening_balance, used_balance)
    VALUES (NEW.user_id, NEW.leave_type_id, EXTRACT(YEAR FROM NEW.start_date)::INTEGER, 0, leave_days)
    ON CONFLICT (user_id, leave_type_id, year)
    DO UPDATE SET
      used_balance = leave_balance.used_balance + leave_days,
      updated_at = now();
    RETURN NEW;
  END IF;

  -- UPDATE: if status changed to rejected/cancelled, restore balance
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('rejected', 'cancelled') AND OLD.status NOT IN ('rejected', 'cancelled') THEN
      UPDATE public.leave_balance
      SET used_balance = GREATEST(0, used_balance - leave_days), updated_at = now()
      WHERE user_id = NEW.user_id
        AND leave_type_id = NEW.leave_type_id
        AND year = EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

- Drop old trigger `update_leave_balance_trigger` on `leave_applications`
- Create new trigger that fires on both INSERT and UPDATE

**No frontend changes needed** -- `LeaveBalanceCards` already reads `used_balance` and `remaining_balance` (which is a generated column = `opening_balance - used_balance`), so it will automatically reflect the updated values.

### Edge Cases Handled
- **Rejection**: Balance is restored when leave is rejected
- **Cancellation**: Balance is restored if status changes to cancelled
- **Half-day leaves**: `days_requested` already stores 0.5 for half-days, so deduction is correct
- **Double-deduction prevention**: The old approval trigger deducted on approval; the new one deducts on insert only, so no double-counting
