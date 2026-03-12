

# Show GPS Kilometers in Expense UI

## Visual Design

Here's how it would look across the three areas:

### 1. Summary Card (Travel TA)
```text
┌─────────────────────────┐
│ 🚗  Travel (TA)         │
│     ₹1,250  · 50 km     │
└─────────────────────────┘
```
The km value appears as a subtle secondary text next to the amount, only when TA type is `from_gps`.

### 2. Weekly Breakdown
```text
┌─────────────────────────────────────────┐
│ Week 1          01 Mar – 07 Mar         │
│ TA: ₹500 (20 km) · DA: ₹350 · Add: ₹0 │
│                              Total ₹850 │
└─────────────────────────────────────────┘
```

### 3. Daily Breakdown
```text
│ Date     │ TA          │ DA   │ Add  │ Total │
│ 01 Mar ✓ │ ₹100 (4 km) │ ₹50  │ ₹0   │ ₹150  │
│ 02 Mar ✓ │ ₹150 (6 km) │ ₹50  │ ₹0   │ ₹200  │
```

## Implementation

### Data Changes
- **`useMonthlyExpenseSummary.ts`**: When `taType === 'from_gps'`, store `km` alongside `ta` in daily/weekly breakdowns. Add `taKm` field to `DailyBreakdown` and `WeeklyBreakdown` interfaces. Sum km per week.
- **`ExpenseSummaryCards.tsx`**: Accept optional `totalKm` prop; display `· X km` next to TA value when present.

### UI Changes
- **`WeeklyBreakdown.tsx`**: Show `(X km)` after TA amount when `taKm > 0`.
- **`DailyBreakdown.tsx`**: Show `(X km)` after TA amount when `taKm > 0`.
- **`ExpenseSummaryCards.tsx`**: Show `· X km` subtitle on TA card.

### Files
1. Edit `src/hooks/useMonthlyExpenseSummary.ts` — add `taKm` to interfaces and populate from GPS data
2. Edit `src/components/expenses/ExpenseSummaryCards.tsx` — show km on TA card
3. Edit `src/components/expenses/WeeklyBreakdown.tsx` — show km next to TA
4. Edit `src/components/expenses/DailyBreakdown.tsx` — show km next to TA

