# Fix: Target Summary showing 0 KG for all users

## Root cause

The Analytics → Target Summary card pulls targets from `user_business_plans` filtered by FY year. The convention used everywhere else in the app (table `fy_target_config`, `useFYTargetPlans`, the FY label "FY 2026-27") is **start-year**: `fy_year = 2026` means April 2026 – March 2027.

But `useTeamTargetProgress.ts` uses the opposite convention:

```ts
// src/hooks/useTeamTargetProgress.ts (line 46-50)
const getCurrentFYYear = (date: Date): number => {
  const month = date.getMonth();
  const year = date.getFullYear();
  return month < 3 ? year : year + 1;   // ← returns end-year
};
```

For today (May 15, 2026) this returns **2027**, so the query
`user_business_plans.year = 2027` matches only 1 unrelated row.

DB confirms: 15 plans exist with `year = 2026` (the actual current FY), only 1 with `year = 2027`. That is exactly why every user shows `Target 0.00 KG` while `Actual` is correct.

## Fix

Change `getCurrentFYYear` in `src/hooks/useTeamTargetProgress.ts` to use the start-year convention:

```ts
const getCurrentFYYear = (date: Date): number => {
  const month = date.getMonth();
  const year = date.getFullYear();
  // April–Dec → current year; Jan–March → previous year (still in last FY)
  return month >= 3 ? year : year - 1;
};
```

That single change makes the analytics target query hit `year = 2026` and the 15 existing plans will populate Target columns immediately. No DB changes, no UI changes — purely the FY computation.

## Verification after fix

- Abhishek Pai, Girish, Harshith and members should show their saved KG/revenue targets instead of 0.
- Achievement % and status badges (Not Started → In Progress / Achieved) will recompute automatically since they derive from `target` and `actual`.

## Out of scope

No changes to RLS, schema, or the FY month-breakdown logic (`getFYMonthNumber` is already correct).
