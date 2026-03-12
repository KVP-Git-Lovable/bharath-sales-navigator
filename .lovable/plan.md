

# Auto-populate Beat TA Based on Admin Expense Config

## Problem
When creating or editing a beat, the Travel Allowance field is always a free-form input. It should be context-aware based on the admin's expense policy configuration:
- If TA is **"fixed"** → auto-populate the fixed amount and make it read-only (since it's the same for all beats)
- If TA is **"from_beat"** → show the input field so users can enter the per-beat TA value (or per-KM rate info)

DA is already working correctly — it's a flat daily amount applied per present day, independent of beats. The approval flow for additional expenses also works via the existing rule-based engine and doesn't need changes.

## What Changes

### 1. `src/pages/MyBeats.tsx` — Create Beat Dialog
- On dialog open, fetch `expense_master_config` to get `ta_type` and `fixed_ta_amount`
- If `ta_type === 'fixed'`: auto-populate `travelAllowance` with `fixed_ta_amount`, make the input **read-only**, and show a helper text: "Fixed TA set by admin policy"
- If `ta_type === 'from_beat'`: show the input as-is with helper text: "Enter travel allowance for this beat"
- Also check for user-level override from `user_expense_config` — if a custom fixed TA is set for this user, use that value instead

### 2. `src/components/EditBeatModal.tsx` — Edit Beat Dialog
- Same logic: fetch `expense_master_config` on open
- If `ta_type === 'fixed'`: show the fixed amount (read-only) with info text
- If `ta_type === 'from_beat'`: allow editing the beat-specific TA value as before

### 3. Beat save logic adjustment
- When `ta_type === 'fixed'`: always save the fixed TA amount from config (not user input), ensuring consistency
- When `ta_type === 'from_beat'`: save user-entered value as before

## Files to Edit
- `src/pages/MyBeats.tsx` — fetch config on create dialog open, conditionally render TA field
- `src/components/EditBeatModal.tsx` — same conditional TA field logic

## What Already Works (No Changes Needed)
- **DA calculation**: Uses `resolveExpenseConfig()` to get DA per present day — works correctly
- **TA calculation in expenses**: `useMonthlyExpenseSummary.ts` already handles both `fixed` (uses `fixedTa` per day) and `from_beat` (sums beat TAs from plans) — works correctly
- **Approval flow**: Rule-based routing trigger handles additional expenses — works correctly
- **Productivity tracking**: Already reads beat TA and resolved config — works correctly

