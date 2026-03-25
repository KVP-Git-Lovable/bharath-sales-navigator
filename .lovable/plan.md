

## Fix: Future Holidays Not Showing as Blue in Attendance Calendar

### Problem
In `AttendanceCalendarView.tsx`, the calendar grid logic checks if a date is in the future **before** checking if it's a holiday. This means any holiday falling after today (e.g., March 26 "test") is classified as `'future'` (empty circle) instead of `'holiday'` (blue circle).

The priority order is currently:
1. Outside month → skip
2. **Future date → mark as future** (blocks holiday check)
3. Holiday → mark as holiday
4. Week off → mark as week-off
5. Leave / Present / Absent

### Fix
**File**: `src/components/attendance/AttendanceCalendarView.tsx` (lines 111-121)

Move the **holiday check before the future-date check**, so holidays always show as blue regardless of whether they're in the past or future:

```
// Holiday (check before future so future holidays show correctly)
if (holidayDates.has(dateStr)) {
  days.push({ date: new Date(d), dateStr, status: 'holiday', inMonth });
  continue;
}

// Future date
if (isAfter(d, today) && !isToday(d)) {
  days.push({ date: new Date(d), dateStr, status: 'future', inMonth });
  continue;
}
```

This is a 2-line swap — no other files need changes. The `holidayDates` Set is already correctly populated from Supabase via `useWorkingDaysConfig`.

