

## Fix My Visits Page Flicker

### Root Cause

The flicker occurs at lines 1146-1147 of `useVisitsDataOptimized.ts`:

```typescript
setIsLoading(true);
setHasLoadedOnce(false);
```

This runs on **every mount and date change** via the `useEffect` at line 1142. It resets the UI to a loading/empty state for one render frame, then `loadData()` immediately finds cached data and sets `isLoading(false)`. The user sees a brief flash of empty content.

A secondary flicker source is `smartDeltaSync` (line 539) doing `setVisits(newVisits)` which replaces the entire visits array even when data is identical, triggering unnecessary re-renders of all visit cards.

### Changes

#### 1. `src/hooks/useVisitsDataOptimized.ts` — Skip loading reset when cache exists

**Lines 1142-1149**: Instead of always resetting `isLoading=true` and `hasLoadedOnce=false`, check if in-memory cache already has valid data for the selected date. If so, skip the reset entirely — `loadData` will use the cache path and never show loading state.

```typescript
// Before calling loadData, check if we have instant cache
const hasCachedData = cacheRef.current.has(selectedDate);
if (!hasCachedData) {
  setIsLoading(true);
  setHasLoadedOnce(false);
}
```

#### 2. `src/hooks/useVisitsDataOptimized.ts` — Prevent no-op visit replacements in smartDeltaSync

**Around line 537-543**: Before doing `setVisits(newVisits)`, also compare the actual content (not just count). If visits are identical, skip the state update. The `visitsChanged` flag from `getChangedItems` should handle this, but the `visitCountDifferent` fallback at line 535 triggers unnecessary replacements. Only use the count-based fallback when counts actually differ.

#### 3. `src/hooks/useVisitsDataOptimized.ts` — Batch state updates

Wrap the multiple `setState` calls in the cache-hit path (lines 762-773) with `React.startTransition` or `ReactDOM.flushSync` to ensure they render as a single frame, preventing intermediate empty states.

### Files to Edit

| File | Change |
|------|--------|
| `src/hooks/useVisitsDataOptimized.ts` | Skip loading reset when cache exists; prevent no-op visit replacements; batch state updates |

