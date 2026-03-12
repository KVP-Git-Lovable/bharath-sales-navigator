

# Fix Expense Details Tables for Desktop + Mobile Responsiveness

## Problem
The TA, DA, and Additional Expenses tables inside `BeatAllowanceManagement.tsx` were optimized for mobile with tiny fixed column widths (60px, 62px, 38px). On desktop (1021px+), this creates huge empty gaps — especially visible in the TA table where "Beat" stretches across most of the screen while "TA Amt" is crammed to the right.

The header buttons (Report, XLS, Add Expense) also use `hidden sm:inline` which hides text on some breakpoints unnecessarily.

## Changes

### `src/components/BeatAllowanceManagement.tsx`

**TA Table (TACardList):**
- Use responsive column widths: `w-[60px] sm:w-[100px]` for Date, `sm:w-[80px]` for TA Amt, remove `table-fixed` on desktop or use `max-w-4xl mx-auto` to constrain table width on large screens
- On desktop, show the "More" columns (Visits, Orders) by default since there's room

**DA Table (DACardList):**
- Same responsive width treatment for Date and DA Amt columns
- Show Start/End columns by default on desktop

**Additional Expenses Table (AdditionalCardList):**
- Widen Status and Action columns on desktop

**Card container:**
- Add `max-w-4xl` to the Card to prevent the table from stretching across ultra-wide screens, keeping a readable density

### `src/components/expenses/ExpenseSummaryCards.tsx`
- On desktop (sm+), use a 5-column grid instead of 3+2 split so summary cards sit in one row and use space better

### `src/pages/MyExpenses.tsx`
- Add `max-w-4xl mx-auto` wrapper for desktop content centering (the page already has `max-w-7xl` but the expense content should be narrower for readability)

## Scope
- 3 files modified
- Pure CSS/layout changes — no logic or data changes

