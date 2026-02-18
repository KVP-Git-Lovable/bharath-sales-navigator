
# Executing the Monthly Accrual Plan — 3 Remaining Changes

## Status Check
- **Change 1 (Frontend - LeaveBalancesManager.tsx)**: ✅ Already done in a previous edit
- **Change 2 (Data fix - reset opening_balance 12→2)**: ❌ Not done — all 21 users still have opening_balance = 12
- **Change 3 (pg_cron job - schedule monthly accrual)**: ❌ Not done
- **Change 4 (Frontend - LeaveBalanceCards.tsx - show annual entitlement)**: ❌ Not done

## What Will Be Executed

### Change 2 — Data Fix (SQL via Insert Tool)
Reset all 2026 leave_balance rows for monthly-accrual leave types from 12 → 2 (February = month 2 × 1 day):
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

### Change 3 — pg_cron Schedule (SQL via Insert Tool)
Schedule `process_monthly_leave_accrual()` to run on the 1st of every month at midnight:
```sql
SELECT cron.schedule(
  'monthly-leave-accrual',
  '0 0 1 * *',
  $$SELECT public.process_monthly_leave_accrual();$$
);
```

### Change 4 — LeaveBalanceCards.tsx (Frontend)
- Fetch `leave_policy` data alongside balances to get `yearly_entitlement` and `accrual_type`
- Add a small label below Available/Booked stats showing:
  `Annual entitlement: 12 days/year (monthly accrual)`
- This helps users understand why they see 2 days instead of 12

## Technical Details

**File changed:** `src/components/LeaveBalanceCards.tsx`

New interface field added:
```typescript
interface LeaveTypeBalance {
  ...
  yearly_entitlement: number | null;
  accrual_type: string | null;
}
```

Additional query in `fetchBalances`:
```typescript
const { data: policies } = await supabase
  .from('leave_policy')
  .select('leave_type_id, yearly_entitlement, accrual_type')
  .eq('is_active', true);
```

New UI label rendered below the Available/Booked row:
```tsx
{balance.yearly_entitlement && balance.accrual_type === 'monthly' && (
  <p className="text-[10px] text-muted-foreground mt-1">
    Annual entitlement: {balance.yearly_entitlement} days/year (monthly accrual)
  </p>
)}
```

## Expected Result After All Changes

| Scenario | Result |
|---|---|
| User views Leave Balance now (Feb 2026) | Available: 2 days, Booked: 0 days |
| Label shown below stats | "Annual entitlement: 12 days/year (monthly accrual)" |
| March 1, 2026 at midnight | Cron fires → +1 day → Available: 3 days |
| Admin re-runs "Initialize Year" in March | opening_balance = 3 (not 12) |
