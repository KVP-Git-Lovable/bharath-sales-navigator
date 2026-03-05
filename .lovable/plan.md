

## Enhanced Team Attendance Report with Filter Modal

### Overview
Replace the current instant-download PDF/Excel buttons with a single "Generate Report" button that opens a configuration modal. The modal lets managers select date range, choose fields, and pick export format before generating.

### New Component: `TeamAttendanceReportModal.tsx`

A dialog component with three sections:

**1. Date Range Selection**
- Preset buttons: Today, Yesterday, Last 7 Days, Last Week, Last Month, Custom Range
- When "Custom Range" selected, show Start Date and End Date pickers (using existing Calendar/Popover pattern)

**2. Field Selection**
- Checkboxes for toggleable columns, all checked by default:
  - Employee Name, Date, Check-in Time, Check-out Time, Work Hours, Attendance Status, Check-in Location, Check-out Location, Notes/Remarks
- "Select All / Deselect All" toggle

**3. Export Actions**
- Two buttons: "Generate PDF" and "Generate Excel"
- Loading state while fetching + generating

### Data Fetching Logic (inside the modal)

When user clicks Generate:
1. Query `attendance` table with `.in('user_id', subordinateIds)` filtered by the selected date range
2. Join with profiles (already have them from parent) to get employee names
3. Map results to selected fields only
4. Generate PDF (jspdf + autotable) or Excel (xlsx) with only the chosen columns
5. Use existing `downloadPDF` / `downloadExcel` utilities

### Changes to `TeamAttendanceTab.tsx`

- Replace the two separate PDF/Excel icon buttons with a single "Report" button
- Add state `reportModalOpen` to control the modal
- Pass `subordinateIds` to the modal component

### File Summary

| File | Action |
|------|--------|
| `src/components/attendance/TeamAttendanceReportModal.tsx` | **New** — filter modal with date range, field selection, and export |
| `src/components/attendance/TeamAttendanceTab.tsx` | **Edit** — replace two export buttons with single button that opens modal |

### No database changes needed
- Uses existing `attendance` table and `profiles` data
- Scoped to `subordinateIds` (manager hierarchy already enforced)

