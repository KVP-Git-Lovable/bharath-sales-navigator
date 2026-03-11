

# Restore Old Expense Details View

## Problem
The recent redesign removed the `BeatAllowanceManagement` component (the "Expense Details" card with tabs: My Expenses, DA, Additional Expenses — showing daily breakdown tables). The user wants this view restored below the new summary cards.

## Plan

### Modify `src/pages/MyExpenses.tsx`
- Import `BeatAllowanceManagement` component
- Add it below the summary cards and action buttons inside `MyExpenseContent`
- It will sit below the weekly breakdown section, providing the full daily detail view the user had before (Date, Beat, TA Amount, Productive Visits, Order Value, Actions)

### No changes to `BeatAllowanceManagement.tsx`
The component is kept as-is — it already has its own date filters, tabs (My Expenses / DA / Additional Expenses), and the "+ Additional Expenses" button.

### Layout after change:
```text
Expenses [help]
< Month Navigator >
[TA] [DA] [Additional] [Total]  ← summary cards
(pending/rejected badges)
(weekly breakdown if expanded)
[+ Additional Expense] button
─────────────────────────────
BeatAllowanceManagement       ← restored old view
  (Expense Details card)
  (My Expenses | DA | Additional Expenses tabs)
  (Date/Beat/TA table)
```

### Files to modify:
- **`src/pages/MyExpenses.tsx`** — Add `BeatAllowanceManagement` import and render it inside `MyExpenseContent`

