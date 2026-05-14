# Fix Operations date filters

## Problem
On `/operations`, the **Week** and **Month** filters are computed as "last 7 days" and "last 30 days" (rolling windows) instead of the current calendar week and current calendar month. That's why "This Month" on May 14 returns data from Apr 14 → May 14.

The custom date range works because it uses explicit start/end dates.

## Root cause
In `src/pages/Operations.tsx`, every filter section repeats the same buggy pattern:

```ts
// week
const weekAgo = new Date(startOfToday);
weekAgo.setDate(weekAgo.getDate() - 7);   // rolling 7 days, not Mon–Sun

// month
const monthAgo = new Date(startOfToday);
monthAgo.setMonth(monthAgo.getMonth() - 1); // rolling 30 days, not 1st–last
```

This pattern is duplicated in ~6 sections (check-ins, orders, stock, competitor, return stock, cancelled orders).

## Fix

1. Add a small helper in `src/utils/dateUtils.ts` (file already centralizes date logic):
   - `getCurrentWeekRange()` → `{ start, end }` Date objects, Monday 00:00 → Sunday 23:59:59 local
   - `getCurrentMonthRange()` → 1st of current month 00:00 → last day 23:59:59 local
   - `getLastMonthRange()` → 1st → last day of previous calendar month
   Uses local-time constructors (`new Date(y, m, d)`), matching the existing `parseLocalDate` / `toLocalISODate` convention. No UTC shift.

2. In `src/pages/Operations.tsx`, replace each `week` / `month` branch (6 occurrences) to use these helpers and apply both `.gte(start)` and `.lte(end)` so the upper bound is also bounded (today's "month" filter currently has no upper bound either, which is fine for now, but bounding it is cleaner and required for "Last Month").

3. Extend the filter type from `'today' | 'week' | 'month'` to `'today' | 'week' | 'month' | 'lastMonth'` in each section's state, and add a "Last Month" option to the corresponding filter UI dropdowns/segments in Operations so users can select it.

## Files touched
- `src/utils/dateUtils.ts` — add 3 helpers
- `src/pages/Operations.tsx` — swap rolling-window math for helpers in all 6 sections; add "Last Month" option to each filter UI

## Out of scope
Other pages (Analytics, PerformanceDashboard, Attendance, etc.) also use the same rolling-window pattern. I'll leave those untouched per your message which is scoped to Operations. Say the word if you want the same fix applied project-wide.
