

## Auto-Initialize Balances When New Leave Policy is Created

### Problem
When an admin creates a new monthly leave policy (e.g., Casual Leave, 6 days/year), nothing happens until the next cron run on the 1st of the following month. Users get no balance records and no backfilled credits for months already passed in the current year.

### Current State (Verified)
- pg_cron job is active and working correctly for existing policies
- March accrual for Sick Leave ran successfully for all users
- But: no mechanism exists to initialize balances when a NEW policy is created mid-year

### Changes

#### 1. New database function: `initialize_leave_policy_balances(p_policy_id uuid)`

Called after a new monthly policy is created. It will:
- Look up the policy's leave_type_id, yearly_entitlement, and accrual_type
- For each active user:
  - Create a `leave_balance` record for the current year (opening_balance = 0)
  - For each month from January to the current month, check if an accrual_log entry exists; if not, credit the monthly amount and log it
- This handles both initial record creation and backfilling past months

```text
FOR each active user:
  Create leave_balance record (opening = 0, used = 0)
  FOR month = 1 TO current_month:
    IF no accrual_log for this user+type+year+month:
      Increment opening_balance by monthly_credit
      Insert accrual_log entry
    END IF
  END FOR
END FOR
```

#### 2. Database trigger on `leave_policy` INSERT

Automatically call `initialize_leave_policy_balances()` when a new monthly policy row is inserted. This means the admin doesn't need to do anything extra -- saving the policy triggers the initialization.

#### 3. Update `process_monthly_leave_accrual()` -- no changes needed

The existing function already handles new policies correctly for future months because it queries all active monthly policies each run. The backfill function covers past months.

### Technical Details

**New migration file** with:

1. `initialize_leave_policy_balances(p_policy_id uuid)` function:
   - Queries the policy to get leave_type_id, yearly_entitlement
   - Calculates monthly_credit = ROUND(yearly_entitlement / 12.0, 2)
   - Loops through active profiles, creates balance records, backfills each month from Jan to current month with duplicate-prevention via accrual_log check

2. Trigger `trigger_initialize_leave_policy_balances`:
   - AFTER INSERT ON `leave_policy`
   - Only fires when `accrual_type = 'monthly'`
   - Calls `initialize_leave_policy_balances(NEW.id)`

### Expected Result
- Admin adds "Casual Leave" policy (6 days/year, monthly accrual) in March
- Immediately: all active users get a leave_balance record with opening_balance = 1.50 (0.50 x 3 months)
- April 1st onward: cron job credits 0.50/month automatically
- No manual intervention needed at any point
- Accrual log tracks all backfilled credits for audit

### Files Changed
- One new SQL migration file (database function + trigger)
- No frontend code changes needed (the existing policy creation UI and balance display already work)
