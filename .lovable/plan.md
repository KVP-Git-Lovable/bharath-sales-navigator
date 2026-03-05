

## Analysis: Current Report Does NOT Respect Manager Hierarchy

The current `AttendanceReportGenerator` has two security/scoping issues:

1. **Employee dropdown** uses `get_limited_profiles_for_admin` RPC, which returns ALL employees (admin-only). A manager would either get an error or see everyone.

2. **Attendance query** has no `user_id` scoping — when "All Employees" is selected, it fetches attendance records for the entire organization, not just the manager's hierarchy.

### What Needs to Change

**File: `src/components/attendance/AttendanceReportGenerator.tsx`**

1. **Import `useSubordinates`** hook (already exists, used in TeamAttendanceTab) and `useAdminAccess`
2. **Employee list logic**:
   - If user is admin → keep using `get_limited_profiles_for_admin` (sees everyone)
   - If user is manager (not admin) → populate employee dropdown from `subordinateIds` fetched via `useSubordinates`, querying profiles for those IDs only
3. **Report query scoping**:
   - If user is admin → no `user_id` filter (current behavior, sees all)
   - If user is manager → add `.in('user_id', subordinateIds)` to the attendance query, so "All Employees" only returns their hierarchy's data
   - If a specific employee is selected → still apply `.eq('user_id', selectedEmployee)` (already done)
4. **Edge case**: If user is neither admin nor manager, show an empty state or disable the report

### Summary of behavior after fix

| User Role | Employee Dropdown | "All Employees" Query Scope |
|-----------|------------------|---------------------------|
| Admin | All employees | Entire organization |
| Manager | Direct reports + hierarchy only | Subordinates only |

No database changes needed — uses existing `useSubordinates` hook and `get_all_subordinates` RPC.

