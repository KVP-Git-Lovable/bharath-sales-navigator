

## Plan: Fix Beat Removal Not Updating My Visits Page

### Problem
When you remove an individual beat from the planned journey in "Plan My Journey", the My Visits page doesn't refresh. This is because:

1. The `handleRemoveBeat` function in `BeatPlanning.tsx` correctly deletes the beat_plan from the database and clears the snapshot, but it **does not dispatch** the `visitDataChanged` event that the visits page listens for.
2. The "Save Plan" and "Clear All" buttons already dispatch this event, but the individual "Remove" action was missed.

### Fix

**File: `src/pages/BeatPlanning.tsx`**

Add `window.dispatchEvent(new Event('visitDataChanged'))` inside `handleRemoveBeat` after the successful database deletion and snapshot clearing (around line 410, after the toast). This single line will trigger the My Visits page (`useVisitsDataOptimized` hook) to reload its data from the updated database/snapshot.

### Technical Details

| What | Detail |
|------|--------|
| Root cause | Missing `visitDataChanged` event dispatch in `handleRemoveBeat` |
| Fix location | `src/pages/BeatPlanning.tsx`, line ~410 |
| Change size | 1 line addition |
| Risk | None -- follows the exact same pattern already used by "Save Plan" and "Clear All" |

