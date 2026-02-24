

## Merge Present/Absent Cards into Calendar Frame

### What Changes
Combine the "Present Days" and "Absent Days" summary boxes and the Calendar View into a single card/frame, making the summary boxes more compact so everything fits cleanly together.

### Technical Details (single file: `src/pages/Attendance.tsx`)

**Step 1 -- Merge into one container (lines 1101-1138)**
Remove the separate `bg-[hsl(210,20%,97%)]` wrapper for the Present/Absent grid (lines 1101-1126) and the separate wrapper for the Calendar View (lines 1128-1138). Replace with a single container that holds both.

**Step 2 -- Make Present/Absent cards compact**
- Reduce padding from `p-4` to `p-2.5`
- Reduce font size of the count from `text-2xl` to `text-lg`
- Reduce icon size from `h-5 w-5` to `h-4 w-4`
- Remove the "Tap to view dates" helper text line to save vertical space
- Keep the click-to-open-dialog functionality

**Step 3 -- Final structure**
```
<div className="bg-[hsl(210,20%,97%)] rounded-2xl p-4 shadow-sm space-y-3">
  <!-- Compact Present/Absent row -->
  <div className="grid grid-cols-2 gap-2">
    <div (Present - compact)> ... </div>
    <div (Absent - compact)> ... </div>
  </div>
  <!-- Calendar directly below -->
  <AttendanceCalendarView ... />
</div>
```

This creates a unified visual frame with the summary stats at the top and the calendar grid below, all within one rounded card.

