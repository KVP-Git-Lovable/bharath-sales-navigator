

# Fix: Shravya's targets blank after "Split by Team Size"

## Root Cause

`handleEqualSplit` only assigns targets to **L1 direct reports** (top manager's direct children). It does NOT recurse into sub-managers like Shravya (who is L2, under Prajwal). So Prajwal gets 218,182 but his children (including Shravya) remain at 0.

The recursive `autoDistributeTargets` function exists and handles this correctly — but it's only called in `handleAutoCalculate` (Step 2), not after `handleEqualSplit`.

## Fix

**File: `src/components/admin/AllocationTable.tsx`**

After `handleEqualSplit` sets L1 targets, immediately call `autoDistributeTargets` on the resulting allocations to recursively distribute down the entire tree. This ensures:

1. Prajwal's 218,182 gets split among his 5 direct reports (each ~27,273 weighted by their contributor count)
2. Shravya (Independent) gets her personal target (27,273) + team target (81,819) properly calculated
3. M1, M2, M3 under Shravya each get ~27,273

The change is small — inside `handleEqualSplit`'s `setAllocations` callback, after setting L1 targets, call `autoDistributeTargets(directReports, ..., next, enabledMetrics)` before returning `next`.

