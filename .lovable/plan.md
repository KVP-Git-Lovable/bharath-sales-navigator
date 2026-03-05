

## Add PDF and Excel Export to Attendance → My Team

### What We're Building
Two export buttons ("PDF" and "Excel") in the Team Attendance tab header, allowing managers to download the currently visible team attendance data. Follows the same pattern as Today's Summary exports.

### Changes

**File: `src/components/attendance/TeamAttendanceTab.tsx`**

1. **Add imports**: `Download`, `FileSpreadsheet` from lucide-react; `downloadPDF`, `downloadExcel` from `@/utils/fileDownloader`; `toast` from sonner
2. **Add two handler functions**:
   - `handleExportPDF`: dynamically import `jspdf` + `jspdf-autotable`, build a table with columns (Employee Name, Designation, Status, Check-in, Check-out, Hours, Monthly Present) from `filteredMembers`, generate PDF with title "Team Attendance Report" + date, call `downloadPDF()`
   - `handleExportExcel`: dynamically import `xlsx`, build worksheet with same columns from `filteredMembers`, call `downloadExcel()`
3. **Add UI buttons**: Place two small buttons (PDF icon + Excel icon) next to the "Team Members (N)" heading / search bar area, disabled when `filteredMembers` is empty
4. **Data source**: Uses the already-computed `filteredMembers` array which contains `profile.full_name`, `profile.designation`, `todayStatus`, `checkInTime`, `checkOutTime`, `totalHours`, `monthlyPresent`

### No other files changed
- No database changes
- No new dependencies (jspdf, xlsx already installed)
- Uses existing cross-platform `downloadPDF`/`downloadExcel` utilities for native APK compatibility

