

## Add Date Filters to Attendance "My Team" Tab

### What Changes
Add a date filter row at the top of the My Team tab with options: **Today** (default/current behavior), **This Week**, **Last Week**, and **Date Range** (custom start/end pickers).

The filter will control which date's attendance data is shown in the summary cards and member list.

### UI Layout
Above the summary cards (Present/On Leave/Absent), a compact row will appear:
- A Select dropdown with: Today, This Week, Last Week, Date Range
- When "Date Range" is selected, two date picker buttons appear beside it (Start date / End date)

### Technical Details

**1. `src/hooks/useTeamAttendance.ts`** -- Make date-aware

Currently `today`, `monthStart`, `monthEnd` are hardcoded at module scope (line 50-52). Changes:
- Add a `targetDate` parameter (defaults to today's date string) and optional `dateRangeStart`/`dateRangeEnd` parameters
- Move the date constants inside the hook so they respond to the filter
- For "Today": query attendance for that single date, leaves overlapping that date
- For "This Week" / "Last Week": query attendance `.gte(start).lte(end)`, leaves overlapping the range; compute present/absent/on_leave per unique user across the range
- For "Date Range": same as week logic but with custom start/end
- The summary cards (presentCount, onLeaveCount, absentCount) will reflect: how many team members had at least one present day, approved leave, or were fully absent during the selected range
- The `todayStatus` field on each member will adapt: for single-day filters it stays as-is; for range filters it becomes "majority status" or latest day status

**2. `src/components/attendance/TeamAttendanceTab.tsx`** -- Add filter UI

- Add state: `dateFilter` (string: 'today' | 'this-week' | 'last-week' | 'custom'), `customStartDate`, `customEndDate`
- Compute `dateRangeStart` and `dateRangeEnd` from the filter selection using date-fns (`startOfWeek`, `endOfWeek`, `subWeeks`)
- Pass these to `useTeamAttendance(subordinateIds, directReportIds, dateFilter, dateRangeStart, dateRangeEnd)`
- Render a Select dropdown + conditional date pickers above `TeamSummaryCards`
- Use the existing Popover + Calendar pattern (shadcn) for the date range pickers, with `pointer-events-auto` on Calendar
- Import `format, startOfWeek, endOfWeek, subWeeks` from date-fns and `Calendar, CalendarIcon` from shadcn/lucide

**3. `src/components/attendance/TeamSummaryCards.tsx`** -- Minor label update

- Update the "Present Today" label to dynamically show the period (e.g., "Present" without "Today" when a range filter is active)
- Add an optional `periodLabel` prop to control the card subtitle

**4. No backend changes required** -- all queries already support date range filtering via `.gte()` / `.lte()`.

### Files Modified
| File | Change |
|------|--------|
| `src/hooks/useTeamAttendance.ts` | Accept date range params; make attendance/leave queries date-aware |
| `src/components/attendance/TeamAttendanceTab.tsx` | Add filter dropdown + date pickers; pass dates to hook |
| `src/components/attendance/TeamSummaryCards.tsx` | Accept optional period label prop |

