

# Plan: Add Team Expense Summary Cards to Expense Master Overview

## What
Add aggregated summary cards (TA, DA, Additional Expenses, Total Expenses, Order Value) at the top of the Overview tab in Expense Master, showing totals across all users for the selected date range. The UI will match the style from the uploaded screenshot — a horizontal row of colored cards with icons.

## How

### Modify `src/components/ProductivityTracking.tsx`
1. **Compute aggregated totals** from the existing `productivityData` array after it's fetched:
   - Sum `travel_allowance` → Total TA
   - Sum `daily_allowance` → Total DA
   - Sum `total_order_value` → Total Order Value
   - Total Expenses = TA + DA + Additional

2. **Fetch additional expenses** for the same date range (all users, approved status) to get the "Additional" total.

3. **Render summary cards** at the top of the component (above the table/calendar view) using the same card style as `ExpenseSummaryCards.tsx`:
   - Travel (TA) — blue
   - Daily (DA) — green
   - Additional — purple
   - Total Expenses — primary
   - Order Value — orange

   Each card shows an icon, label, and formatted ₹ value in a 5-column grid (2-col on mobile).

### Files to Modify
- **`src/components/ProductivityTracking.tsx`** — Add summary aggregation logic and render the cards row above the existing productivity table.

No database changes needed — all data is already available from existing queries plus one additional query for `additional_expenses`.

