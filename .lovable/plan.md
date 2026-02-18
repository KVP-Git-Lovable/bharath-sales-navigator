

# Fix: Interlink Holidays, Week-offs, and Working Days Across Attendance

## Problem Identified

There are **3 disconnected issues** causing holidays not to reduce working days:

### Issue 1: Wrong Column Name (Critical Bug)
In `useWorkingDaysConfig.ts`, the holidays query uses `.select('id, date, name')` but the actual database column is `holiday_name`, not `name`. This causes the query to **fail silently**, meaning holidays are never loaded, so working days are never reduced.

### Issue 2: Empty Week-Off Config
The `week_off_config` table is currently empty. The hook falls back to "Sunday only" as default, but ignores the `alternate_pattern` field that the admin panel uses (e.g., "all Saturdays off", "1st and 3rd Saturdays off").

### Issue 3: Admin Config Not Used
The admin panel in "Working Days Config" calculates working days and saves them to `working_days_config` table. But the user-facing hook (`useWorkingDaysConfig`) **never reads from that table** -- it recalculates everything from scratch. This means the admin's calculated values are ignored on the user side.

---

## The Fix

### Change 1: Fix the column name in `useWorkingDaysConfig.ts`
**File:** `src/hooks/useWorkingDaysConfig.ts`

Change the holidays query from:
```
.select('id, date, name')
```
to:
```
.select('id, date, holiday_name')
```

Also update the `Holiday` interface to use `holiday_name` instead of `name`, and update all references that map holiday data.

### Change 2: Add `alternate_pattern` support to `useWorkingDaysConfig.ts`
The hook currently only checks `is_off` to determine week-off days. It needs to also respect `alternate_pattern` (values: `'all'`, `'1st_3rd'`, `'2nd_4th'`) -- the same logic already used in `WorkingDaysConfig.tsx` and `useWorkingDaysCalculator.ts`.

Update the working days calculation to check each individual date against the pattern, rather than just checking the day-of-week.

### Change 3: Use `working_days_config` as the source of truth (with fallback)
When the admin has already calculated and saved working days via the admin panel, the user-facing hook should read from `working_days_config` for the relevant month/year. If no saved config exists, fall back to the current calculation logic.

This ensures that when an admin clicks "Calculate & Save" in the Working Days Config panel, those values are what users see.

### Change 4: Ensure Team view also uses the correct data
The `useTeamAttendance.ts` hook already uses `useWorkingDaysConfig`, so fixing that hook will automatically fix the team summary cards (present/absent counts) as well.

---

## Technical Details

### Files to modify:

| File | Change |
|------|--------|
| `src/hooks/useWorkingDaysConfig.ts` | Fix column name `name` to `holiday_name`, add `alternate_pattern` support, optionally read from `working_days_config` |
| `src/hooks/useWorkingDaysCalculator.ts` | No changes needed (already uses correct column `date` only) |
| `src/components/attendance/WorkingDaysConfig.tsx` | No changes needed (already correct) |

### Expected Result After Fix:
- February 2026 has 28 days, with Sundays off and 1 holiday (Feb 23) 
- Working days should be 28 - 4 Sundays - 1 holiday = ~23 (exact count depends on week-off config)
- The "Present Days" display will show `5/23` instead of `5/24`
- Absent days will also be calculated correctly
- Attendance percentage will reflect the correct denominator

