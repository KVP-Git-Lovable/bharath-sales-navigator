
## Interactive Day-wise Legend with Toggle Filtering

### What Changes
Make the day color legend in the multi-day map view **clickable** so users can toggle individual days on/off. Clicking a day (e.g., "Mon") will show only that day's route and markers. Clicking again will re-enable it. Multiple days can be active at once.

### How It Works
- Each day label in the legend becomes a clickable chip/button
- Active days show with full color; inactive days appear faded/grayed out
- The map re-renders to show only routes and markers for active (selected) days
- By default, all days are active
- Clicking a day toggles it -- users can view Mon only, Mon+Wed, etc.

### Technical Details

**File: `src/components/JourneyMap.tsx`**

1. Add state to track which days are visible:
   ```typescript
   const [visibleDays, setVisibleDays] = useState<Set<string>>(new Set());
   ```

2. Initialize `visibleDays` with all day dates whenever `dayGroups` changes (useEffect).

3. Update the legend rendering (lines 419-427) to make each day item clickable with toggle behavior:
   - Wrap each day chip in a `button` or clickable `div` with `cursor-pointer`
   - Active: full opacity, colored bar
   - Inactive: reduced opacity, gray bar, strikethrough or faded text

4. Update the map rendering logic (lines 231-297) to filter `dayGroups` by `visibleDays` before drawing:
   ```typescript
   const filteredGroups = dayGroups.filter(dg => visibleDays.has(dg.date));
   ```
   Use `filteredGroups` instead of `dayGroups` in the forEach that draws polylines and markers.

5. Add `visibleDays` to the useEffect dependency array for the map update effect (line 401).

**No other files need changes** -- this is entirely contained within JourneyMap.tsx.
