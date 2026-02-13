
# Fix "Unknown" User Names in Productivity Summary

## Root Cause

The `ProductivitySummarySection` component has a **timing/data-flow bug**. During the data fetch (line 221 of `ProductivitySummarySection.tsx`), user names are resolved and baked into the `dayData` state:

```
userName: userNameMap.get(userId) || 'Unknown'
```

The problem: `userNameMap` is built from the `allUsers` prop, which comes from a separate `useEffect` in `Analytics.tsx` that fetches profiles. If the productivity data fetch completes before the profiles load, all user names are permanently stored as "Unknown" in state. Even when profiles load later, the `dayData` is not re-derived -- it retains the stale "Unknown" values.

Additionally, the `userSummaries` grouping (line 248) groups by `userName`, so all "Unknown" entries merge into a single aggregated row -- which is exactly what the screenshot shows: 16 users collapsed into 1 "Unknown" row.

## Why It Affects Abhishek Pai and Harshith

These users likely have many subordinates (16 users in scope). The subordinate IDs resolve quickly, triggering the productivity data fetch before the profiles query completes. For admins or users with fewer subordinates, the timing may coincidentally work.

## Solution

**Decouple name resolution from data fetching.** Store only `userId` in `dayData` and resolve names at render time using the always-up-to-date `userNameMap`.

### Changes to `src/components/analytics/ProductivitySummarySection.tsx`:

1. **Stop baking `userName` into fetched data** (line 221): Store only `userId`, remove the name lookup at fetch time.

2. **Fix the `useEffect` dependency** (line 242): Add `userNameMap` (or `allUsers`) as a dependency so the component re-derives summaries when profiles load. Alternatively (and better), change the grouping logic to group by `userId` instead of `userName`.

3. **Resolve names at render/summary time**: In the `userSummaries` memo (line 245-277), group by `userId` instead of `userName`, and look up `userNameMap` for display. This ensures names are always current.

4. **Update drilldown filtering**: The drilldown filter (line 302) currently matches on `userName`. Change to match on `userId`.

### Specific code changes:

- **Line 221**: Change `userName: userNameMap.get(userId) || 'Unknown'` to just keep `userId` (already stored)
- **Lines 245-277 (`userSummaries` memo)**: Group by `row.userId` instead of `row.userName`, resolve `full_name` from `userNameMap` at grouping time, and add `userNameMap` to the memo dependencies
- **Line 302 (drilldown filter)**: Filter by `row.userId === selectedUserForDrilldown` instead of `row.userName`
- **Line 45 (`selectedUserForDrilldown`)**: Change type to store userId instead of userName
- **Render sections**: Update table rows to use `userNameMap.get(userId)` for display

This ensures that even if profiles load after productivity data, names will always render correctly since they are resolved from the live `userNameMap` rather than stale state.
