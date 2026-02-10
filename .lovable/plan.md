
## Fix: Day-wise Route Coloring for Multi-Day Map View

### Problem
When "Week" or "Month" is selected in Day Tracking, all retailers from all days are combined into one list and the map draws a single nearest-neighbor route connecting ALL of them, creating a confusing spider-web of overlapping lines.

### Solution

**Group retailers by day and draw separate colored routes per day**, each starting from the attendance check-in location for that day.

### Changes

#### 1. GPSTrack.tsx -- Group data by day

- Modify `loadRetailerLocations()` to also fetch `plan_date` from `beat_plans` and tag each retailer with its `planDate`
- Fetch attendance records for the date range to get each day's check-in location
- Pass new props to `JourneyMap`: `dayGroups` (retailers grouped by date with attendance start point) and `isMultiDay` flag

**Data flow:**
```text
beat_plans (with plan_date) --> retailers per beat per day
attendance (with check_in_location) --> start point per day
```

#### 2. JourneyMap.tsx -- Render day-wise colored routes

- Add new interface `DayGroup` with `date`, `dayLabel` (Mon/Tue/etc.), `color`, `retailers`, and `startLocation` (from attendance)
- Accept `dayGroups` prop alongside existing `retailers` prop for backward compatibility
- When `dayGroups` is provided (multi-day mode):
  - For each day, draw a single continuous polyline: Attendance Location -> Store 1 -> Store 2 -> ... in visit order (check-in time) or nearest-neighbor for pending
  - Each day gets a distinct color from a predefined palette (blue, green, orange, purple, cyan, pink, amber)
  - Add a small "Start" marker at each day's attendance location with day label
- When `dayGroups` is NOT provided, keep existing single-route behavior (backward compatible)
- Replace the status-only legend with a combined legend showing both day colors and status colors when in multi-day mode

#### 3. Route Logic per Day
For each day group:
1. Start point = attendance `check_in_location` for that date (fall back to first GPS point if no attendance)
2. Completed visits (productive/unproductive) sorted by `check_in_time`
3. Pending/planned visits optimized with nearest-neighbor from last completed visit
4. Draw ONE continuous polyline through all points in order

### Day Color Palette

| Day | Color |
|-----|-------|
| Monday | #3b82f6 (blue) |
| Tuesday | #22c55e (green) |
| Wednesday | #f97316 (orange) |
| Thursday | #8b5cf6 (purple) |
| Friday | #06b6d4 (cyan) |
| Saturday | #ec4899 (pink) |
| Sunday | #f59e0b (amber) |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/GPSTrack.tsx` | Fetch `plan_date` from beat_plans, fetch attendance records, group retailers by date, pass `dayGroups` prop to JourneyMap |
| `src/components/JourneyMap.tsx` | Add `DayGroup` interface, accept `dayGroups` prop, render per-day colored routes with attendance start markers, add day-color legend |

### Technical Details

**EnhancedRetailerLocation** -- add optional `planDate` field:
```typescript
interface EnhancedRetailerLocation {
  // ... existing fields
  planDate?: string; // 'yyyy-MM-dd'
}
```

**DayGroup interface** (new in JourneyMap):
```typescript
interface DayGroup {
  date: string;           // 'yyyy-MM-dd'
  dayLabel: string;       // 'Mon', 'Tue', etc.
  color: string;          // hex color
  retailers: EnhancedRetailerLocation[];
  startLocation?: { latitude: number; longitude: number };
}
```

**GPSTrack.tsx loadRetailerLocations changes:**
- Fetch beat_plans with `plan_date` (already fetched, just need to use it)
- Build a map: `beat_id -> plan_date`
- Tag each retailer with its `planDate` based on which beat it belongs to
- Fetch attendance records for the date range: `attendance.check_in_location` per date
- Group retailers by `planDate` and create `DayGroup[]`
- Pass to JourneyMap only when `isRange` is true

**JourneyMap rendering logic:**
- If `dayGroups` prop exists and has entries, use multi-day rendering
- For each day group, run the existing optimize/sort logic independently
- Draw each day's polyline with that day's color (solid line, not dashed)
- Retailer markers keep their status-based colors (green/red/orange/blue)
- Legend shows day colors as horizontal bars with day names
