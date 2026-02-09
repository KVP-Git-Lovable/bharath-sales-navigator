
# Fix Roll Up / Roll Down Target Strategy

## Problem Summary

Three interconnected bugs in the Organization Hierarchy target allocation:

1. **Roll-up does not auto-calculate from subordinates** -- When Roll Up is selected, the manager's target should be the sum of their subordinates' targets, but currently it just reads the stored value from the database without computing.

2. **No per-manager strategy selection** -- You cannot select Roll Up for a specific manager (e.g., Girish) while viewing from the parent level. The strategy currently applies only to the selected org tree node.

3. **Girish shows incorrect value (25,000)** -- Girish's stored target is from an earlier equal distribution. With Roll Up active, his target should auto-calculate as **256,000 Kg** (sum of his 10 subordinates' targets).

## Root Cause

The current architecture stores a single `target_strategy` per user in `user_business_plans`, but:
- The allocation table only computes roll-up for the TOP-LEVEL selected user's direct reports
- It does NOT cascade downward (Girish's subordinates are not summed into Girish's target)
- Each subordinate-manager's strategy is ignored when viewed from a higher level
- The same `quantity_target` field is used for both "what the boss allocated" and "team roll-up total"

## Solution

### 1. Per-Manager Strategy Indicator in Allocation Table

Add a small strategy toggle (Roll Up / Roll Down / Independent) next to each subordinate who is a manager (has subordinates). This allows setting the strategy per-user from the parent view without needing to navigate the org tree.

```text
+---------------------------------------------------+
| Girish  [L1] [10 subs]  [Roll Up v]   256,000 Kg  |
|   (auto-calculated from subordinates)              |
+---------------------------------------------------+
| Kumar   [L1] [0 subs]               25,000 Kg     |
+---------------------------------------------------+
```

### 2. Cascading Roll-Up Computation

When loading the allocation table data, after fetching all subordinates and their existing plans:

- Check each subordinate's `target_strategy` from their `user_business_plans` record
- For any user with `roll_up` strategy who has subordinates in the tree, compute their target as the **sum of their direct subordinates' targets**
- This cascades recursively (if a sub-manager also has roll_up, their target is computed first from their subordinates, then rolls up to the parent)
- The computed value is displayed as read-only (since it's derived, not manually set)

### 3. Fix Save Logic

When saving allocations:
- For each user with `roll_up` strategy, save the computed sum as their `quantity_target` and `revenue_target`
- For each user with `roll_down` or `independent` strategy, save the manually entered value
- Save each user's `target_strategy` in their own `user_business_plans` record (not just the parent's)

### 4. Visual Indicators

- Show a strategy badge next to each manager-user in both Tree and Table views
- When a user has `roll_up`, their target input becomes **read-only** with a label "Auto-calculated"
- Show the breakdown tooltip: "Sum of 10 subordinates = 256,000 Kg"

## Files to Modify

### `src/components/admin/AllocationTable.tsx`
- Load each subordinate's `target_strategy` from their business plan (already fetched via `plans` query)
- Add recursive `computeRollUpTargets()` function that traverses the tree bottom-up
- Add per-user strategy dropdown for manager-users (users with `subordinateCount > 0`)
- Make target inputs read-only for users with `roll_up` strategy
- Update save mutation to persist each user's strategy alongside their targets
- Fix `rollUpTotals` to use cascaded computed values instead of raw stored values

### `src/components/admin/TargetStrategySelector.tsx`
- Create a compact inline variant for per-row usage (small dropdown instead of 3 card layout)
- Keep the existing card-based selector for the top-level strategy

### `src/components/admin/OrganizationTree.tsx`
- Show strategy badge (arrow-up / arrow-down icon) next to manager nodes
- Helps users visually see which strategy each manager uses

## Technical Details

### Cascading Roll-Up Algorithm

```text
function computeEffectiveTarget(node):
    if node has no children:
        return node.storedTarget  // leaf user

    if node.strategy == 'roll_up':
        total = 0
        for each child in node.children:
            total += computeEffectiveTarget(child)
        node.displayTarget = total  // auto-calculated
        return total
    else:
        return node.storedTarget  // manually set or from DB
```

### Per-User Strategy Storage

Each user's `user_business_plans` row already has the `target_strategy` column. The fix ensures:
- When saving from a parent view, each subordinate-manager's strategy is persisted in THEIR row
- The `quantity_target` for roll-up users is saved as the computed sum (for reporting consistency)

### Data Fix for Girish

After the code fix, when Girish's strategy is set to `roll_up`:
- His displayed target will auto-compute as: 27,000 + 3,000 + 9,000 + 30,000 + 18,000 + 18,000 + 42,000 + 25,000 + 72,000 + 12,000 = **256,000 Kg**
- This value replaces the incorrect 25,000 Kg
- On save, this computed value is written to his `quantity_target`

No database migration is needed -- the `target_strategy`, `manager_own_quantity_target`, and `manager_own_revenue_target` columns already exist.
