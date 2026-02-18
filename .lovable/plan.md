
## Root Cause: Data Update Was Never Executed

The previous plan proposed this SQL to reset balances from 12 → 2 (February = month 2 × 1 day/month), but it was never actually run against the database. The database still shows `opening_balance = 12` for all 21 users.

Confirmed from live database:
- Leave policy: `Sick Leave`, accrual_type = `monthly`, yearly_entitlement = `12`
- All 21 leave_balance rows for 2026 still have `opening_balance = 12`
- Current month = February 2026 = month 2
- Correct opening_balance = ROUND(2 × (12 / 12)) = 2

## What Will Be Done

### Step 1 — Run the Data Fix SQL (via Insert Tool)

```sql
UPDATE leave_balance lb
SET 
  opening_balance = ROUND(
    EXTRACT(MONTH FROM CURRENT_DATE) * (lp.yearly_entitlement / 12.0)
  ),
  updated_at = now()
FROM leave_policy lp
WHERE lb.leave_type_id = lp.leave_type_id
  AND lp.accrual_type = 'monthly'
  AND lp.is_active = true
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
```

This will update all 21 rows: opening_balance goes from 12 → 2.

Since `remaining_balance` is a generated column (computed as `opening_balance - used_balance`), it will automatically update to 2 as well.

### Step 2 — Schedule the pg_cron Job

```sql
SELECT cron.schedule(
  'monthly-leave-accrual',
  '0 0 1 * *',
  $$SELECT public.process_monthly_leave_accrual();$$
);
```

This ensures that on March 1, April 1, etc. the balances automatically increment by 1 day.

## Expected Result After Fix

| Before | After |
|--------|-------|
| Opening Balance: 12 | Opening Balance: 2 |
| Remaining Balance: 12 | Remaining Balance: 2 |
| (February 2026 — month 2 of 12) | Correctly reflects 2 months elapsed |

The Leave Balances page and the user-facing Leave Balance card will both show 2 days available.
