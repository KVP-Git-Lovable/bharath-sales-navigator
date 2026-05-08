## Issue

Vikhyath has approved leave on **May 7–8, 2026**. In the database:
- `leave_applications`: 1 row, status `approved`, dates `2026-05-07 → 2026-05-08`
- `attendance`: rows for both dates with `status = 'leave'` (correctly synced by the leave-approval trigger)

But the calendar renders both days as **Absent (red)** instead of **Leave (orange)**.

## Root cause

`src/components/attendance/AttendanceCalendarView.tsx` decides leave coloring **only** from the `leaveRecords` prop (the `leave_applications` query). It completely ignores the `status` field on the `attendance` record. The branch that produces "present" only matches `attendance.status === 'present' || 'regularized'`; everything else falls through to "absent".

So if `leaveRecords` is empty for any reason — stale cache, RLS edge case, the leave was approved after the 5-min `staleTime` snapshot, or the calendar is mounted before the leave query resolves — leave days render red even though the attendance row clearly says `status='leave'`.

A second weakness: the present-day branch also doesn't recognize `attendance.status = 'half_day'` or `'on_leave'`.

## Fix

Update `AttendanceCalendarView.tsx` day-classification logic (around lines 123–142) so the attendance row's own status is a trusted source for leave, in addition to `leaveMap`:

```text
priority order per day (in-month, not holiday, not week-off):
  1. half-day  → leaveMap.is_half_day === true
                 OR attendance.status === 'half_day'
  2. leave     → leaveMap has entry
                 OR attendance.status IN ('leave', 'on_leave')
  3. present   → attendance.status IN ('present', 'regularized')
  4. future    → date > today
  5. absent    → otherwise
```

This makes the calendar resilient to either data source missing and matches what the DB already records.

Also tighten the leave-applications query in two places so freshly approved leaves appear immediately:

- `src/pages/Attendance.tsx` (line ~105, `userLeaveRecords` query): drop `staleTime` to 30s and set `refetchOnMount: 'always'`.
- `src/components/attendance/TeamMemberDetailSheet.tsx` (line ~46): same treatment.

## Files to change

- `src/components/attendance/AttendanceCalendarView.tsx` — extend day-status logic to honor `attendance.status` for leave / half-day.
- `src/pages/Attendance.tsx` — refresh `userLeaveRecords` on mount.
- `src/components/attendance/TeamMemberDetailSheet.tsx` — refresh `leaveRecords` on mount.

## Verification

After the change, reload `/attendance` for Vikhyath (and view-as-manager via Harshith): May 7 and May 8 should appear orange (Leave) per the legend, Present count stays at 4, Absent count drops from 3 → 1 (only May 1 remains absent).
