

## Attendance Report Generation

### What We're Building
A new "Reports" sub-tab under Attendance Management > Overview that lets admins generate, filter, view, and export attendance data.

### Changes

**1. New file: `src/components/attendance/AttendanceReportGenerator.tsx`**

A self-contained component with:
- **Filters**: Date range (two Popover+Calendar date pickers), Employee selector (fetched via `get_limited_profiles_for_admin` RPC), Status filter (All/Present/Absent/Late/On Leave/Half Day/Regularized), and a "Generate Report" button
- **Results table**: Date, Employee Name, Check-in Time, Check-out Time, Total Work Hours, Attendance Status -- with color-coded status badges
- **Export**: Two buttons (CSV, Excel) using `downloadCSV` from `fileDownloader.ts` and dynamic `import('xlsx')` for Excel export
- **Data fetching**: Query `attendance` table with `.select('*')`, join with `profiles` for employee names (same pattern as existing leave/regularization fetching in AttendanceManagement.tsx), apply date range (`.gte`/`.lte` on `date`), user filter (`.eq('user_id', ...)`), and status filter (`.eq('status', ...)`)
- **Batching**: If results exceed 1000 rows, use paginated fetching (range-based) to get all records

**2. Modified file: `src/pages/AttendanceManagement.tsx`**

- Add `{ id: 'reports', label: 'Reports', icon: BookOpen }` to `overviewSubTabs` array (line 74-79). `BookOpen` is already imported.
- Add `import AttendanceReportGenerator from '@/components/attendance/AttendanceReportGenerator';` at top
- Add `{subTab === 'reports' && <AttendanceReportGenerator />}` after the leave-balances render block (around line 599)

### Technical Details
- No database migration needed -- all data comes from existing `attendance` and `profiles` tables
- Uses `useAdminAccess` hook for access control
- Date formatting with `date-fns` `format()`
- Status colors: present/regularized = green, absent = red, leave = orange, half_day = amber, late = yellow
- Default date range: last 7 days

