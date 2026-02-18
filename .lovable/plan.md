
# Leave Management System Audit Report

## Executive Summary

The leave management system in `/attendance-management` is architecturally well-designed but has **4 critical bugs** that will cause failures in production, and **2 policy-linkage gaps** that mean the Attendance Policy configuration is only partially connected to leave balances.

---

## How the System is Structured

The system has 5 interconnected components:

```text
[Leave Types]  ->  [Attendance Policy / Leave Entitlements]  ->  [Leave Balances]
     |                                                                  ^
     v                                                                  |
[Leave Applications]  -- on approval triggers -->  [used_balance updated]
                                                         |
                                                [remaining_balance = GENERATED]
                                                (opening_balance - used_balance)
```

**Tab-by-tab breakdown:**

| Tab | Table | Purpose |
|---|---|---|
| Leave Types | `leave_types` | Define leave categories (e.g., Sick Leave) |
| Attendance Policy | `leave_policy` | Set yearly entitlement, accrual type, carry-forward |
| Leave Balances | `leave_balance` | Track per-user balances (opening / used / remaining) |
| Leave Management | `leave_applications` | Employee leave requests, approval workflow |
| Leave Ledger | `leave_accrual_log` | Audit trail of all balance changes |

---

## Is the Attendance Policy Linked to Leave Balance?

**Partially — but not automatically.**

### What IS linked:
1. **"Initialize Year" button** in Leave Balances tab reads `leave_policy.yearly_entitlement` and creates `leave_balance` records for all active users — this IS the link between policy and balance.
2. **Leave validation trigger** (`validate_leave_application`) checks `leave_policy` for backdated limits, advance notice, max per month, and sandwich rules before allowing an application.
3. **Monthly accrual function** (`process_monthly_leave_accrual`) reads `leave_policy.yearly_entitlement / 12` to calculate monthly credits.

### What is NOT automatically linked:
1. **When a policy is created/updated, existing `leave_balance` records are NOT updated.** An admin must manually click "Initialize Year" or "Recalculate" to sync. There is no trigger on `leave_policy` that cascades to `leave_balance`.
2. **No scheduled job** runs `process_monthly_leave_accrual` automatically. It exists as a function but nothing calls it on a schedule — monthly accrual only happens if triggered manually.

---

## Critical Bugs Found

### Bug 1 (CRITICAL): "Initialize Year" will always fail silently or error

**Location:** `LeaveBalancesManager.tsx` → `handleInitializeBalances()`

**Problem:** The code tries to insert `remaining_balance` directly:
```typescript
balancesToInsert.push({
  ...
  remaining_balance: policy.yearly_entitlement,  // ❌ CANNOT WRITE THIS
  ...
});
```

But `remaining_balance` is a **STORED GENERATED COLUMN** in the database:
```sql
remaining_balance INTEGER GENERATED ALWAYS AS (opening_balance - used_balance) STORED
```

PostgreSQL will **reject any INSERT or UPDATE** that includes a value for a generated column. The "Initialize Year" button will throw an error and no balances will be created.

**Fix:** Remove `remaining_balance` from all insert/update payloads. The DB computes it automatically. The correct insert is:
```typescript
balancesToInsert.push({
  user_id: user.id,
  leave_type_id: policy.leave_type_id,
  opening_balance: policy.yearly_entitlement,
  used_balance: 0,
  year,
  // NO remaining_balance field
});
```

---

### Bug 2 (CRITICAL): `process_monthly_leave_accrual` will always fail

**Location:** DB function `process_monthly_leave_accrual`

**Problem:** The function tries to directly `UPDATE remaining_balance` — but since it's a generated column, this will throw a PostgreSQL error every time:
```sql
UPDATE leave_balance
SET remaining_balance = COALESCE(remaining_balance, 0) + v_credit  -- ❌ CANNOT UPDATE GENERATED COLUMN
```

**Fix:** Change the monthly accrual logic to increment `opening_balance` instead (since `remaining_balance = opening_balance - used_balance`, increasing `opening_balance` is the correct way to credit days):
```sql
UPDATE leave_balance
SET opening_balance = opening_balance + v_credit,
    updated_at = now()
WHERE ...
```

---

### Bug 3 (MODERATE): `update_leave_balance_on_approval` ignores half-day and sandwich rules

**Location:** DB trigger function `update_leave_balance_on_approval`

**Problem:** When a leave is approved, this trigger calculates days as:
```sql
leave_days := NEW.end_date - NEW.start_date + 1;
```
It **ignores** `NEW.days_requested` (which already accounts for half-days, sandwich rule, etc., calculated by `validate_leave_application`). This means a 0.5-day half-day leave will deduct 1 full day from the balance.

**Fix:** Change to:
```sql
leave_days := COALESCE(NEW.days_requested, NEW.end_date - NEW.start_date + 1);
```

---

### Bug 4 (MODERATE): `handleSaveBalance` in LeaveBalancesManager writes `remaining_balance`

**Location:** `LeaveBalancesManager.tsx` → `handleSaveBalance()`

**Problem:** The edit/create dialog saves:
```typescript
const balanceData = {
  user_id, leave_type_id, opening_balance, used_balance, year,
  // remaining_balance is NOT written here ✅ - this one is OK
};
```
Actually the save logic is correct — it only writes `opening_balance` and `used_balance`. But the `handleRecalculateBalances` function does:
```typescript
await supabase.from('leave_balance').update({
  used_balance: usedDays,
  remaining_balance: remaining,   // ❌ CANNOT WRITE GENERATED COLUMN
})
```
The **"Recalculate" button will also fail** for the same reason as Bug 1.

**Fix:** Remove `remaining_balance: remaining` from the update payload.

---

## Summary of Issues

| # | Severity | Location | Issue | Impact |
|---|---|---|---|---|
| 1 | Critical | `LeaveBalancesManager.tsx` `handleInitializeBalances` | Writes to generated column `remaining_balance` | "Initialize Year" always fails |
| 2 | Critical | `process_monthly_leave_accrual` DB function | Updates generated column directly | Monthly accrual never works |
| 3 | Moderate | `update_leave_balance_on_approval` trigger | Ignores `days_requested`, uses raw date diff | Half-day leaves deduct wrong amount |
| 4 | Moderate | `LeaveBalancesManager.tsx` `handleRecalculateBalances` | Writes to generated column `remaining_balance` | "Recalculate" button always fails |

---

## What IS Working Correctly

- **Leave type creation** and policy configuration saves correctly to `leave_policy`
- **Leave application validation** (balance check, overlap check, advance notice) works via DB trigger
- **Leave approval → attendance marking** works (trigger marks attendance table)
- **Leave accrual log** structure is correct
- **`remaining_balance` reads** work everywhere since generated columns are fully readable
- **Policy-to-balance link** concept is correct (policy → initialize year → balances), just broken by the generated column bug

---

## Proposed Fixes

### Files to modify:
1. **`src/components/attendance/LeaveBalancesManager.tsx`** — Remove `remaining_balance` from `handleInitializeBalances()` and `handleRecalculateBalances()` payloads (2 fixes)

### Database migrations needed:
2. **Fix `update_leave_balance_on_approval`** trigger function — use `days_requested` instead of raw date diff
3. **Fix `process_monthly_leave_accrual`** function — update `opening_balance` instead of `remaining_balance`

All 4 bugs can be fixed with targeted changes.
