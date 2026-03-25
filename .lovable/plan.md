

## Fix: Future Dates Gray Styling & Cancelled Leave Revert

### Problem 1: Future dates not gray
The `future` status style is currently `border border-border text-muted-foreground` — a hollow white circle with a thin border. The user expects a **gray filled circle** similar to week-off styling.

### Problem 2: Future leaves/week-offs not rendered correctly
The current priority order checks `future` **before** `week-off` and `leave`. This means:
- A future Sunday (week-off) shows as hollow white instead of gray week-off
- A future date with approved leave shows as hollow white instead of orange

When a leave is cancelled, it's already excluded from `leaveMap` (filters `status === 'approved'`), so the date correctly falls through — but it falls to the `future` status which currently looks white, not gray.

### Fix (single file)
**File**: `src/components/attendance/AttendanceCalendarView.tsx`

1. **Move `future` check to the END** — after holiday, week-off, leave, and attendance checks. This way future holidays, week-offs, and approved leaves render with their proper colors. Only truly "empty" future dates get the `future` status.

2. **Change `future` styling** from hollow border to gray filled:
   ```
   case 'future': return 'bg-muted text-muted-foreground';
   ```

Priority order after fix:
1. Outside month → skip
2. Holiday → blue
3. Week off → gray (opacity)
4. Half-day leave → gradient
5. Full leave → orange
6. Present → green
7. Future (no status) → gray filled
8. Absent (past, no record) → red

