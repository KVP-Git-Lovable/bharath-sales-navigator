

# Add Date Range Presets to GPS Track - Day Tracking

## Problem

Currently, the Day Tracking tab only supports selecting a single date via a calendar picker. Users want quick preset options like "This Week" and "This Month" to view aggregated GPS tracking data across a date range.

## Solution

Add date range preset buttons (Today, This Week, This Month) alongside the existing date picker. When a range is selected, the system fetches GPS data, visit stats, and distance for all dates in that range and displays combined results.

---

## Changes

### 1. Update `src/pages/GPSTrack.tsx`

**Add date range state and preset buttons:**
- Add state for `dateRangeMode` ('single' | 'week' | 'month') and computed `startDate`/`endDate` based on selection
- Add three toggle buttons above/alongside the date picker: **Today**, **This Week**, **This Month**
  - Today: sets single date to today
  - This Week: calculates Monday-to-Sunday (or Sunday-to-Saturday) of the current week using `date-fns` helpers (`startOfWeek`, `endOfWeek`)
  - This Month: uses `startOfMonth` and `endOfMonth` from `date-fns`
- Show the selected range label (e.g., "Feb 3 - Feb 9, 2026") beneath the buttons

**Update data loading functions to support date ranges:**
- `loadGPSData`: modify query to use `.gte('date', startDateStr).lte('date', endDateStr)` instead of `.eq('date', dateStr)`
- `loadVisitStats`: modify query to use `.gte('planned_date', startDateStr).lte('planned_date', endDateStr)`
- `loadBeatInfo`: for ranges, either skip or show "Multiple beats" label
- `loadRetailerLocations`: modify beat_plans and visits queries to use date range filters

**Update distance calculation:**
- The existing Haversine-based total KM calculation already works on the full `gpsData` array, so it will automatically sum distance across all days in the range

**Update GPS info card at bottom:**
- Show date range instead of single date
- Show total GPS points across all days

### 2. UI Layout for Day Tracking Filters

```text
+--------------------------------------------------+
| Select Date Range                                 |
| [Today] [This Week] [This Month] [Calendar Icon] |
|                                                   |
| Showing: Feb 3 - Feb 9, 2026                     |
|                                                   |
| Select Team Member (if manager)                   |
| [UserSelector dropdown]                           |
+--------------------------------------------------+
```

- The three preset buttons use the existing `Button` component with `variant="outline"` (active = `variant="default"`)
- The calendar picker remains available for custom single-date selection; selecting a calendar date switches mode back to "single"

### 3. Imports to Add

- `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth` from `date-fns`

---

## Technical Details

### Date range calculation

```text
Today:      startDate = today, endDate = today
This Week:  startDate = startOfWeek(today, { weekStartsOn: 1 }), endDate = endOfWeek(today, { weekStartsOn: 1 })
This Month: startDate = startOfMonth(today), endDate = endOfMonth(today)
```

### Modified queries (conceptual)

```text
GPS:    .gte('date', startDateStr).lte('date', endDateStr)
Visits: .gte('planned_date', startDateStr).lte('planned_date', endDateStr)
Beats:  .gte('plan_date', startDateStr).lte('plan_date', endDateStr)
```

### Files changed

| File | Action | What Changes |
|------|--------|-------------|
| `src/pages/GPSTrack.tsx` | Edit | Add date range state, preset buttons, update all queries to support ranges |

