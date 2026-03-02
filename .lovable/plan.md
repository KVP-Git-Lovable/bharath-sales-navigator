
## Fix Monthly Leave Accrual: Auto-Scheduling + March Credit

### Problem
The `process_monthly_leave_accrual()` database function exists but is **never called automatically**. There is no cron job. As a result:
- Opening balance is stuck at 2 (manually set for Jan + Feb)
- March credit has not been applied
- The accrual log table is empty

By March, with a 12-leave/year monthly policy, employees should have **3 leaves accrued** (1 per month x 3 months).

### Root Cause
No `pg_cron` schedule was ever created to invoke `process_monthly_leave_accrual()` on the 1st of each month.

### Changes

**New migration file** to:

1. **Add duplicate-prevention** to `process_monthly_leave_accrual()` -- check if the current month's accrual has already been logged in `leave_accrual_log` for each user+leave_type before crediting. This prevents double-credits if the function is called more than once in a month.

2. **Schedule pg_cron job** -- run `process_monthly_leave_accrual()` on the 1st of every month at midnight UTC:
   ```sql
   SELECT cron.schedule('monthly-leave-accrual', '0 0 1 * *', 'SELECT process_monthly_leave_accrual()');
   ```

3. **Run it immediately for March** -- execute `SELECT process_monthly_leave_accrual()` so that all employees get their March credit right away (opening_balance goes from 2 to 3).

### Technical Detail: Updated Function Logic

```text
FOR each active monthly policy:
  FOR each active user:
    IF no accrual_log entry exists for this user+leave_type+year+month:
      - Ensure balance record exists
      - Increment opening_balance by monthly credit
      - Insert accrual_log entry
    END IF
  END FOR
END FOR
```

### Expected Result
- All employees' Sick Leave opening_balance updates from 2.00 to 3.00
- "Available" displays correctly (3 - used)
- Future months auto-credit on the 1st
- No risk of double-crediting
