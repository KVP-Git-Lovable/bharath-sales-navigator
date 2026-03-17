

## Plan: Add Petty Cash Spent to Overview Summary

### What Changes
Add a "Petty Cash" summary card to the Overview tab's top-level summary cards (alongside TA, DA, Additional, Total Expenses, Order Value), and include petty cash amounts in the Total Expenses calculation.

### Changes

#### File: `src/components/ProductivityTracking.tsx`

1. **Add Petty Cash state** — new `useState` for `pettyCashTotal` (number, default 0)

2. **Fetch petty cash data** in `fetchProductivityData` — query `petty_cash_transactions` for the same date range, filter by `status in ('submitted', 'approved')`, sum the amounts:
   ```
   const { data: pettyCashData } = await supabase
     .from('petty_cash_transactions')
     .select('amount, status')
     .gte('transaction_date', startStr)
     .lte('transaction_date', endStr)
     .in('status', ['submitted', 'approved']);
   ```

3. **Add summary card** — insert a new "Petty Cash" card (Wallet icon, amber/yellow color) into the `summaryCards` array between "Additional" and "Total Expenses"

4. **Include in Total Expenses** — update `totalExpenses` calculation:
   ```
   const totalExpenses = totalTA + totalDA + additionalTotal + pettyCashTotal;
   ```

5. **Update grid** — change `sm:grid-cols-5` to `sm:grid-cols-6` (or keep 5 and let it wrap) to accommodate the 6th card

6. **Include in XLS export** — add a "Petty Cash (₹)" column to the download

### Files to Modify
- `src/components/ProductivityTracking.tsx` — Add petty cash fetch, summary card, and include in totals

