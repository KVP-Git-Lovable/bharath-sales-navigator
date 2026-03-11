

# Redesign Expenses Page

## New Layout

```text
┌─────────────────────────────────────┐
│  Expenses              [help btn]   │
├─────────────────────────────────────┤
│    < Mar 2026 >   (month nav)       │
├─────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌──────┐ ┌───────┐ │
│ │ TA  │ │ DA  │ │Addtl │ │ Total │ │
│ │ ₹X  │ │ ₹X  │ │ ₹X   │ │ ₹X    │ │
│ └─────┘ └─────┘ └──────┘ └───────┘ │
├─────────────────────────────────────┤
│  (Click Total → weekly breakdown)   │
│  Week 1: TA ₹X | DA ₹X | Add ₹X   │
│  Week 2: TA ₹X | DA ₹X | Add ₹X   │
│  ...                                │
├─────────────────────────────────────┤
│  [+ Additional Expenses] [Report]   │
│  [Download XLS]                     │
├─────────────────────────────────────┤
│  (For managers only)                │
│  [My Expenses] [Team Summary] tabs  │
│  Team: user cards with totals       │
│  Click user → their monthly detail  │
└─────────────────────────────────────┘
```

## Changes

### 1. Restructure `MyExpenses.tsx`
- **Header**: "Expenses" + inline help button
- **Month Navigator**: Left/right arrows with "MMM yyyy" label (like screenshot). Uses `addMonths`/`subMonths` to navigate. Replaces the current tabs and dropdown selectors.
- **Summary Cards**: 4 cards in a row — TA, DA, Additional Expenses, Total. Styled like screenshot (colored backgrounds, icons). Data fetched for selected month.
- **Expandable Breakdown**: Clicking "Total" card toggles a weekly breakdown section showing TA/DA/Additional per week of the month.
- **Action Buttons**: "+ Additional Expenses" and "Download XLS" buttons below summary.
- **Manager Tab**: If `isManager`, show tabs "My Expenses" / "Team Summary". Team Summary lists subordinates with their monthly TA/DA/Additional/Total. Clicking a user expands their weekly breakdown.
- **Approval rule**: Only `manager_approved` or `paid` additional expenses count toward totals.

### 2. Modify `ExpenseMonthlySummary.tsx` → Repurpose as data-fetching hook
Extract the monthly calculation logic into a reusable hook `useMonthlyExpenseSummary(userId, month)` that returns TA, DA, additional breakdown, and weekly splits. Both the self-view and team-view will use this.

### 3. Keep `BeatAllowanceManagement.tsx` accessible
The detailed daily view (TA table, DA table, Additional table) will be accessible via drill-down from the summary cards or via a "View Details" link, opening in a dialog or inline expansion.

### Files to create/modify:
- **`src/hooks/useMonthlyExpenseSummary.ts`** (new) — Hook that fetches monthly TA/DA/additional for a given user+month, with weekly grouping
- **`src/pages/MyExpenses.tsx`** — Complete redesign with month nav, summary cards, expandable weekly breakdown, manager team view
- **`src/components/expenses/ExpenseMonthlySummary.tsx`** — Simplified or replaced by the new page layout
- **`src/components/BeatAllowanceManagement.tsx`** — Keep as-is, rendered inside a dialog when user wants daily detail view

### Technical Details

**`useMonthlyExpenseSummary` hook:**
- Accepts `userId: string`, `yearMonth: string`
- Fetches attendance, beat_plans, expense_master_config, additional_expenses for the month
- Computes TA, DA, additional (approved only for totals, all statuses for breakdown)
- Groups data by week (week 1 = days 1-7, week 2 = 8-14, etc.) for the weekly breakdown
- Returns `{ ta, da, additionalApproved, additionalPending, additionalRejected, total, weeklyBreakdown[], loading }`

**Team Summary (managers):**
- Uses `useSubordinates()` to get subordinate IDs
- Calls the same hook per subordinate (or a batch query) to show each user's monthly totals
- Clicking a user row expands to show their weekly breakdown
- Pending approvals count shown as a badge

**Month Navigator component:**
- `< [ChevronLeft]  Mar 2026  [ChevronRight] >`
- State: `selectedMonth` as Date, navigate with `addMonths`/`subMonths`

