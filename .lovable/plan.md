

# Fix Duplicate Data & Restructure Expenses Page

## Problem
The MyExpenses page currently renders two separate components that both show TA/DA/Additional summaries:
1. `ExpenseMonthlySummary` — monthly summary card with month selector
2. `BeatAllowanceManagement` — has its own highlight panel (Total TA, Total DA, Additional cards) + filter bar + tabs

This creates duplicate/confusing data. The user wants:
- A main "Expenses" heading with the help button inline
- Day-wise view as default, with option to see monthly summary
- Remove duplicate summary displays

## Plan

### 1. Restructure `MyExpenses.tsx`
- Add a main heading: **"Expenses"** with the help button next to it (not floating in corner)
- Add a toggle/tabs at the top: **"Daily View"** | **"Monthly Summary"**
- Daily View → shows `BeatAllowanceManagement` (the detailed day-wise breakdown)
- Monthly Summary → shows `ExpenseMonthlySummary`
- Default to Daily View

### 2. Remove duplicate summary boxes from `BeatAllowanceManagement.tsx`
- Remove the 3-card highlight panel (Total TA, Total DA, Additional) since the monthly summary already covers this
- OR keep them but as compact inline stats (single row, smaller) since they show filtered-range totals which is useful
- **Decision**: Keep them compact — they show totals for the *selected date range* which is different from the monthly summary. But make them smaller (single-line chips instead of full cards)

### 3. Clean up the header in `MyExpenses.tsx`
- Replace the floating help button with: `<h1>Expenses <ModuleHelpButton /></h1>` in a flex row

### Files to modify:
- **`src/pages/MyExpenses.tsx`** — Add heading with inline help button, add Daily/Monthly toggle, conditionally render components
- **`src/components/BeatAllowanceManagement.tsx`** — Compact the 3 summary cards into a smaller inline format (single row with smaller text) to avoid visual duplication with the monthly summary

