

## Attendance Calendar View - My Attendance and Team View

### Overview
Add a monthly calendar view with color-coded attendance indicators to two places:
1. **My Attendance tab** -- below Start/End My Day buttons, replacing the current list-only attendance view with a Calendar/List toggle
2. **Team Member Detail Sheet** -- when viewing a specific team member (e.g., Gyangopal Varma), replace the attendance list with a similar monthly calendar

### Color Scheme for Date Indicators
| Status | Color |
|---|---|
| Present | Green (#22c55e) |
| Absent | Red (#ef4444) |
| On Leave | Orange (#f97316) |
| Half Day Leave | Split Green/Orange (half-and-half) |
| Week Off | Grey (#9ca3af, muted) |
| Holiday | Grey (same as week off) |

Each date appears as a small **round indicator** with the status color.

### Changes

#### 1. New Component: `src/components/attendance/AttendanceCalendarView.tsx`

A reusable monthly calendar grid component that:
- Displays a 7-column grid (Mon-Sun) with month/year header and prev/next navigation
- Each date cell is a **round colored indicator** (approx 32x32px circle) showing the attendance status color
- Tapping a date shows a small tooltip or detail below the calendar with check-in/out times
- Accepts props: `attendanceRecords`, `leaveRecords`, `weekOffConfig`, `holidays`, `currentMonth`, `onMonthChange`
- Determines status per date:
  - Check attendance records for `present`, `regularized` -> Green
  - Check leave_applications for approved leaves overlapping that date -> Orange
  - Check if leave is half-day (`is_half_day = true`) -> Split indicator (half green, half orange via CSS gradient)
  - Check `isWeekOffDate()` from weekOffConfig or holidayDates -> Grey
  - Remaining working days in the past with no record -> Red (absent)
  - Future dates -> no color / subtle outline only
- A small legend row below the calendar showing color meanings

#### 2. Modify: `src/pages/Attendance.tsx` -- My Attendance Tab

- Remove the "current-week" (This Week) filter option from the date filter Select (keep only "This Month" and "Last Month")
- Add a view toggle (Calendar / List) above the attendance records area
- In Calendar mode, render `<AttendanceCalendarView>` using existing `cachedAttendanceRecords`, `weekOffConfig`, `holidays`, and leave data
- In List mode, show the existing detailed attendance list (current behavior)
- The calendar is placed between the "Start My Day / End My Day" buttons section and the Market Hours section
- Fetch leave applications for the current user for the selected month to identify leave/half-day dates

#### 3. Modify: `src/components/attendance/TeamMemberDetailSheet.tsx` -- Team Member View

- Add `<AttendanceCalendarView>` to the Attendance tab, shown above the existing list
- Add month navigation (prev/next) to browse different months
- Fetch week-off config and holidays for the selected month
- Fetch leave applications for the team member to color leave/half-day dates
- Keep the Leaves and Regularization tabs unchanged

#### 4. Remove Filters
- In the My Attendance "Recent Attendance" card, remove the "This Week" (`current-week`) option from the date filter dropdown -- only "This Month" and "Last Month" remain
- The "Today" filter does not currently exist in the code (the existing filters are This Week, This Month, Last Month), so no change needed there

### Technical Details

**Half-day indicator CSS**: Use a CSS `background: linear-gradient(to right, #22c55e 50%, #f97316 50%)` on the round circle to show the split color effect.

**Week-off detection**: Reuse the existing `isWeekOffDate()` function from `useWorkingDaysConfig.ts` by exporting it, or duplicate the logic in the calendar component.

**Leave data fetching**: Query `leave_applications` with `status = 'approved'` for the user and month range. Check `is_half_day` field to distinguish full leave vs half-day leave.

**Data flow for My Attendance**:
- `attendanceRecords` from `useAttendanceCache` (already available)
- `weekOffConfig` and `holidays` from `useWorkingDaysConfig` (already available)
- New query for user's approved leave applications for the month

**Data flow for Team Member Detail**:
- Attendance records already fetched in `TeamMemberDetailSheet`
- Add queries for `week_off_config`, `holidays`, and `leave_applications` for that user

**No database changes required** -- all data sources already exist.

