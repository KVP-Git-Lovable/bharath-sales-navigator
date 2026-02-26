
### What I found (root cause confirmed)

Do I know what the issue is? **Yes.**

Half-day is being saved correctly in `leave_applications`, but it gets rounded to a full day when updating leave balances.

I verified this from live data:

- Latest leave application has:
  - `days_requested = 0.5`
  - `is_half_day = true`
- But `leave_balance` for the same user/type shows:
  - `used_balance = 2`
  - `remaining_balance = 0`
- Expected based on applications:
  - `used_balance = 1.5`
  - `remaining_balance = 0.5`

### Exact problem

`leave_balance` schema currently uses **INTEGER** columns:

- `opening_balance` = integer
- `used_balance` = integer
- `remaining_balance` = generated integer (`opening_balance - used_balance`)

The trigger function calculates `leave_days` as numeric, but when writing into integer columns, PostgreSQL rounds (e.g. `1.5 -> 2`), so half-day increments are lost.

Also, your leave card UI currently shows duration from date-difference logic, so a same-day half leave still displays as “1 day” even when `days_requested` is 0.5.

---

### Implementation plan

## 1) Fix DB precision so half-days persist correctly

**New migration** to convert balance columns to decimal:

1. Drop generated `remaining_balance` column temporarily.
2. Alter:
   - `opening_balance` → `numeric(10,2)`
   - `used_balance` → `numeric(10,2)`
3. Recreate `remaining_balance` as generated `numeric(10,2)`:
   - `GENERATED ALWAYS AS (opening_balance - used_balance) STORED`
4. Keep defaults as `0`.

Why first: without this, any 0.5 will keep getting rounded.

---

## 2) Repair already-corrupted balance data

In the same migration, run a data correction update:

- Recompute `used_balance` from `leave_applications`:
  - sum of `COALESCE(days_requested, end_date - start_date + 1)`
  - include statuses per current policy (all except `rejected`/`cancelled`)
- Update matching `leave_balance` rows by `(user_id, leave_type_id, year)`.

This immediately fixes existing users who already got rounded values.

---

## 3) Ensure validation logic handles decimals safely

Update DB function `validate_leave_application()`:

- Change `v_days_in_month` from `INTEGER` to `NUMERIC`.

Reason: monthly totals using half-days should remain decimal (avoid implicit rounding in policy checks).

---

## 4) Fix leave history card display (user-facing correctness)

**File:** `src/components/MyLeaveApplications.tsx`

- Extend interface usage to rely on existing fields from `leave_applications`:
  - `days_requested`
  - `is_half_day`
  - `half_day_period`
- Replace local date-diff display function for “X days” with `days_requested` (fallback to date diff only if null).
- Show “0.5 day” (or “Half Day”) correctly in UI.

This addresses the screenshot symptom where it currently shows “1 days” for same-day half leave.

---

## 5) Prevent admin recalculation from reintroducing full-day math

**File:** `src/components/attendance/LeaveBalancesManager.tsx`

- In `handleRecalculateBalances`, fetch `days_requested` and aggregate from that, not raw date difference.
- Optional but recommended:
  - switch parse handlers from `parseInt` to `parseFloat` in admin balance form inputs
  - set `step="0.5"` for opening/used fields

This avoids future accidental rounding if admin uses recalculation/manual edits.

---

### File-level change list

1. `supabase/migrations/<new_timestamp>_fix_half_day_leave_balance_precision.sql`
   - alter numeric types
   - recreate generated column
   - backfill used balances
   - replace validation function numeric month accumulator

2. `src/components/MyLeaveApplications.tsx`
   - render `days_requested` / half-day properly

3. `src/components/attendance/LeaveBalancesManager.tsx`
   - recalc via `days_requested`
   - decimal-safe inputs (recommended)

---

### Validation checklist after implementation

1. Apply half-day leave for today.
2. Confirm `leave_applications.days_requested = 0.5`.
3. Confirm `leave_balance.used_balance` increments by `0.5`.
4. Confirm `leave_balance.remaining_balance` decrements by `0.5`.
5. Verify UI:
   - Leave Balance card: Booked +0.5, Available -0.5
   - My Leave Applications: shows 0.5 day / Half Day (not 1 day)
6. Reject/cancel a pending half-day leave and confirm 0.5 is restored correctly.

