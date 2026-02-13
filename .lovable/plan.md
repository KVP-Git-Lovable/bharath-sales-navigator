

# GPS Day Tracking – Full Route Display (OSRM Integration)

## Current State

The `CurrentLocationMap` component already has OSRM road-snapped routing built in. When it receives `journeyPositions`, it draws start/end markers and a continuous road-based route line using the `osrm-route` edge function.

However, the GPS data loading in the Current Location tab (`GPSTrack.tsx`) does **not** filter by attendance check-in/check-out times. It loads all GPS points for the selected date range without considering when the user actually started or ended their day.

## What Needs to Change

### 1. Filter GPS data by Attendance boundaries (GPSTrack.tsx)

Update the `loadClGpsData` effect to:
- Fetch the user's attendance record for each date in the range (check_in_time, check_out_time)
- Filter GPS points to only include those between check-in and check-out timestamps
- This ensures the route starts at Day Start and ends at Day End

### 2. Update Start/End marker labels (CurrentLocationMap.tsx)

Currently the markers say "Day Start" and "Latest Position". Update them to:
- **Start marker**: "Day Start" (with attendance check-in time)
- **End marker**: "Day End" if attendance is completed (check-out exists), or "Latest Position" if the day is still active

Add a new optional prop `attendanceCompleted` to `CurrentLocationMap` so it can label the end marker correctly.

### 3. Show attendance time info in the Current Location tab (GPSTrack.tsx)

Display a small info card showing:
- Check-in time (Day Start)
- Check-out time (Day End) or "Active" if not yet checked out
- This gives context about the route boundaries

## Technical Details

**File: `src/pages/GPSTrack.tsx`**
- In the `loadClGpsData` useEffect, after fetching GPS points, also fetch attendance records for the date range
- Use attendance `check_in_time` and `check_out_time` as timestamp boundaries to filter GPS data
- Store attendance info in state for display and pass `attendanceCompleted` to `CurrentLocationMap`
- Add an attendance info card above the map in the Current Location tab

**File: `src/components/CurrentLocationMap.tsx`**
- Add `attendanceCompleted?: boolean` prop
- Update end marker popup label: show "Day End" when `attendanceCompleted` is true, keep "Latest Position" otherwise
- No changes to OSRM routing logic (already working correctly)

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/GPSTrack.tsx` | Filter GPS data by attendance check-in/check-out times; add attendance info display |
| `src/components/CurrentLocationMap.tsx` | Add `attendanceCompleted` prop; update end marker label |

