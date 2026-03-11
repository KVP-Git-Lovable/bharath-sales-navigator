

## Plan: Compact Expense + Order Value Summary Row

### What the user wants
1. **Compact single-line summary** showing TA, DA, Additional Expense, Total Expense, and **Order Value** (total orders for the month) -- replacing or supplementing the current 2x2 grid cards.
2. This should appear in both **My Expenses** and **Team Summary > Overview**.
3. For Team Summary, it aggregates all subordinates' expenses AND their total order values.

### Design

**New compact summary strip** — a single horizontal row (or a small card) showing:
`TA: ₹X | DA: ₹X | Add: ₹X | Total: ₹X | Orders: ₹X`

This will be rendered as a compact row above or instead of the current 4-card grid, with each metric as a small labeled value in a single flex row.

### Changes

#### 1. `src/components/expenses/ExpenseSummaryCards.tsx`
- Add optional `orderValue` prop (number) and `showCompact` prop (boolean).
- When `showCompact` is true, render a single-line compact strip with all 5 values (TA, DA, Additional, Total Expense, Order Value) in a horizontal scrollable flex row.
- Keep the existing 2x2 grid as the default view.
- Add a toggle button (e.g., grid/list icon) to switch between compact and expanded views.

#### 2. `src/hooks/useMonthlyExpenseSummary.ts`
- Add `orderValue` to the `MonthlyExpenseSummary` interface.
- Fetch from `orders` table: `SUM(total_amount)` where `user_id = userId`, `created_at` within month range, and `status = 'confirmed'`.
- Return it alongside existing expense data.

#### 3. `src/pages/MyExpenses.tsx`
- Pass `summary.orderValue` to `ExpenseSummaryCards`.

#### 4. `src/components/expenses/TeamExpenseSummary.tsx`
- In `useTeamAggregatedExpenses`, also fetch orders for all subordinate IDs and sum `total_amount`.
- Pass aggregated `orderValue` to `ExpenseSummaryCards` in `TeamOverview`.
- In `TeamMemberRow`, show individual order value alongside expense totals.

### Data Query (orders)
```sql
SELECT COALESCE(SUM(total_amount), 0) 
FROM orders 
WHERE user_id = ? 
  AND created_at >= ? AND created_at < ?
  AND status = 'confirmed'
```

No database migrations needed -- just reading existing `orders` table data.

