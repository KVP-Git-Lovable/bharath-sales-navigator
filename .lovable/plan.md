

# Show Only Direct Subordinates + Strategy Selector for Sub-Managers

## Problem
Currently, Step 1 shows the full nested hierarchy under each L1 manager (e.g., Shravya's team members are visible under Prajwal). The user wants:
1. Each manager card in Step 1 should only show **direct subordinate names** (not their sub-teams)
2. If a direct subordinate is also a manager (like Shravya under Prajwal), she should get her own **strategy selector** (Roll Down/Roll Up/Independent)
3. Sub-managers like Shravya manage their own team's targets at their own level -- the parent manager doesn't see or manage those details

## Changes

### 1. `StepAssignManagers.tsx` -- Simplify team tree to direct reports only
- Replace the recursive `renderTeamTree` with a flat list showing only `depth === 0` children (direct subordinates)
- For each direct subordinate who is also a manager (`subordinateCount > 0`), show:
  - Name + team size badge
  - An `InlineStrategySelector` so the parent can set their strategy
  - A note like "Manages X team members" (but don't list those members)
- Remove the recursive rendering of indirect subordinates entirely
- Keep the expand/collapse toggle but now it just shows the flat list of direct reports with strategy options

### 2. `StepAssignManagers.tsx` -- Update interfaces
- Update `TeamNode` usage: only render first level, don't recurse into `node.children`
- Add `onStrategyChange` callback support for sub-manager nodes (not just the L1 manager card)
- The `onStrategyChange` prop already accepts any userId, so sub-manager strategy changes will work with the existing `handleStrategyChange` in `AllocationTable.tsx`

### 3. `AllocationTable.tsx` -- No structural changes needed
- The existing `handleStrategyChange` already works for any userId in the allocations map
- The `autoDistributeTargets` function already recurses through the full tree using per-node strategies
- Preview (Step 2) and Review (Step 3) already show the full hierarchy correctly

## Summary
The only file changing is `StepAssignManagers.tsx`:
- Direct subordinates shown as a simple list (no deeper nesting)
- Sub-managers get an `InlineStrategySelector` + "Manages N members" indicator
- No recursive tree display of indirect reports

