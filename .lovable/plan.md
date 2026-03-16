

# Plan: Beat Filter Chips on My Visits Page

## What
When multiple beats are planned for a day, display each beat name as a clickable chip/pill. Clicking a beat filters the retailer visit cards to show only retailers belonging to that beat. An "All" option shows all retailers (default).

## How

### Modify `src/pages/MyVisits.tsx`

1. **Add state**: `selectedBeatFilter` — stores the selected `beat_id` or `'all'` (default).

2. **Include `beat_id` in processed retailers**: Add `beatId: retailer.beat_id` to the return object in the `retailers` useMemo (~line 352-373).

3. **Replace the static beat name text** (~line 1199) with clickable beat chips:
   - Render an "All" chip + one chip per beat from `optimizedBeatPlans`
   - Active chip gets a highlighted style (e.g., solid bg), inactive gets outline
   - On click, set `selectedBeatFilter` to that beat's `beat_id` (or `'all'`)
   - Chips are horizontally scrollable on mobile

4. **Filter retailers by selected beat**: Add a `filteredRetailers` useMemo that filters `retailers` by `beatId` when `selectedBeatFilter !== 'all'`. Use this filtered list wherever retailers are rendered (visit cards list).

### No other files need changes
All data (`beat_id` on retailers, `beat_name` on beat plans) is already available from the existing hooks.

