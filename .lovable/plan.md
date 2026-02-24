

## Move Calendar View to Summary Section

### What Changes
1. **Move the Calendar View** from inside the "Recent Attendance" card (where it currently sits alongside a Calendar/List toggle) to the section right below the Present Days / Absent Days summary cards (around line 1127 in `Attendance.tsx`).

2. **Remove the Calendar/List toggle** from the "Recent Attendance" card header -- that card will now show only the List View.

3. **Keep only List View** under "Recent Attendance" -- remove the `calendarViewMode` conditional rendering and always show the list.

### Technical Details (single file: `src/pages/Attendance.tsx`)

**Step 1 -- Insert Calendar below the Present/Absent summary cards (after line 1127)**
- Add the `<AttendanceCalendarView>` component with month navigation directly after the Present Days / Absent Days grid, still inside the `bg-[hsl(210,20%,97%)]` container or as a new card right below it.

**Step 2 -- Remove Calendar/List toggle from "Recent Attendance" card header (lines 1281-1301)**
- Remove the toggle buttons (`LayoutGrid` / `List` icons) from the card header.
- Keep the date filter `Select` dropdown.

**Step 3 -- Remove calendar branch from CardContent (lines 1314-1322)**
- Remove the `calendarViewMode === 'calendar'` conditional and the `AttendanceCalendarView` rendering inside the card.
- Always render the list view directly.

**Step 4 -- Clean up unused state**
- The `calendarViewMode` state and `LayoutGrid` import can be removed since the toggle no longer exists.

No other files need changes -- `AttendanceCalendarView` component stays the same.

