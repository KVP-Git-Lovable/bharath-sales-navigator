

## Issue Analysis: Team Attendance Not Showing Present Users

### Root Cause

After investigating the database and code:

- **The database has correct data**: 10 of Girish's subordinates have `present` status for today (2026-03-27).
- **The code logic is correct**: The attendance query correctly fetches by date and filters statuses.
- **The problem is stale data / no live refresh**: The attendance query has a `staleTime` of 2 minutes and no `refetchInterval`. Once a manager opens the "My Team" tab, the data doesn't update automatically. If opened before subordinates check in, it stays showing all as "Absent" until the user manually refreshes.

### Fix: Add Auto-Refresh to Team Attendance Queries

**File: `src/hooks/useTeamAttendance.ts`**

Add `refetchInterval` to the three key queries so team data stays current while the tab is open:

1. **Today's attendance query** (line 96): Add `refetchInterval: 30 * 1000` (30 seconds) — this is the most critical one for live status
2. **Today's leaves query** (line 118): Add `refetchInterval: 60 * 1000` (1 minute) — leaves change less frequently
3. **Monthly counts query** (line 137): Add `refetchInterval: 60 * 1000` (1 minute)
4. **Reduce staleTime** on the attendance query from 2 minutes to 30 seconds for fresher data on tab switches

This ensures managers always see up-to-date team status without manually refreshing the page.

### Additional Safety: Add refetchOnMount

Set `refetchOnMount: 'always'` on the today attendance query to ensure fresh data whenever the My Team tab is opened, even if stale cache exists.

### Technical Summary

| File | Change |
|------|--------|
| `src/hooks/useTeamAttendance.ts` | Add `refetchInterval` (30s-60s) and `refetchOnMount: 'always'` to attendance, leaves, and monthly count queries |

