

# Fix: Working Days Not Accounting for Week-Offs

## Root Cause

The `week_off_config` database table is **completely empty** -- no week-off rules have been saved there. Even though the admin panel (Working Days Config page) lets you configure week-offs, those changes write to `week_off_config`. If the admin never configured them there, the table stays empty.

The hook's caching logic (`refetchOnMount: false`, 6-hour stale time) makes this worse -- once it sees empty data, it may cache that emptiness and skip re-fetching.

Currently the flow is broken:
- `week_off_config` table: empty
- `working_days_config` table: no Feb 2026 record
- Hook falls back to calculation, but with empty week-off config
- Result: 28 days - 1 holiday = 27 (no Sundays subtracted)

## The Fix: Single Unified Flow

Instead of multiple disconnected data sources with fragile caching, create ONE clear flow:

### Change 1: Remove aggressive caching that hides bugs

**File:** `src/hooks/useWorkingDaysConfig.ts`

The current "6-hour cache freshness" check inside the queryFn (lines 140-147 and 186-193) short-circuits the actual database fetch. This means if localStorage has stale/bad data, the hook returns wrong values for 6 hours. Remove these early-return cache checks and let React Query handle caching properly via `staleTime`.

Also set `refetchOnMount: true` (or remove `refetchOnMount: false`) so fresh data loads when the page is opened.

### Change 2: Always fetch fresh week-off config on mount

**File:** `src/hooks/useWorkingDaysConfig.ts`

Change the week-off query options:
- Remove `refetchOnMount: false` so it fetches on page load
- Reduce `staleTime` to 5 minutes (not 6 hours) so data stays current
- Keep `placeholderData` for instant display while fetching

### Change 3: Ensure default Sunday works when table is empty

**File:** `src/hooks/useWorkingDaysConfig.ts`

The queryFn currently returns `cachedWeekOffSync` when the table is empty. But `cachedWeekOffSync` reads from localStorage first -- if localStorage has `[]` from a prior bad cache, it returns `[]` with no week-offs.

Fix: when the database returns empty data, always return the hardcoded default `[{ id: 'default', day_of_week: 0, is_off: true, alternate_pattern: 'all' }]` directly, ignoring localStorage.

### Change 4: Reduce holiday cache staleness too

**File:** `src/hooks/useWorkingDaysConfig.ts`

Same treatment for holidays query -- reduce staleTime, remove the manual cache freshness check, allow refetch on mount.

## Technical Details

**Single file change:** `src/hooks/useWorkingDaysConfig.ts`

The key changes:
1. Remove lines 139-148 (manual cache freshness check in weekOff queryFn)
2. Remove lines 185-194 (manual cache freshness check in holidays queryFn)
3. In weekOff queryFn: when `data.length === 0`, return hardcoded default instead of `cachedWeekOffSync`
4. Change `staleTime` from `6 * 60 * 60 * 1000` to `5 * 60 * 1000` (5 min) for both queries
5. Remove `refetchOnMount: false` from both queries
6. Keep `placeholderData` for instant UI (no flicker)

No other files need changes -- `Attendance.tsx` and team views all consume this hook.

## Expected Result

- February 2026: 28 days - 4 Sundays - 1 holiday = **23 working days**
- Display will show `5/23` Present Days instead of `5/27`
- Attendance percentage will be `22%` (5/23) instead of `19%` (5/27)
- When admin configures Saturday week-offs in the Working Days Config page, the user view will automatically reflect within 5 minutes

