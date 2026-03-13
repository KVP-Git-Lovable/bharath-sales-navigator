

# Show User Names & Designations in Level Config + Exclude Top User from Targets

## Problem
1. The "Configure Target Distribution" panel only shows "L1 (4 users)", "L2", "L3" — no user names or roles
2. The top-level user (root) should not receive a target — their job is only to distribute to subordinates

## Changes

### 1. LevelStrategyConfig — Show user details per level (`TargetStrategySelector.tsx`)

Update the `LevelInfo` interface and `LevelStrategyConfig` component:

- Add `users: Array<{ fullName: string; designation?: string }>` to `LevelInfo`
- Display user names (and designations if available) under each level row as small chips/tags
- Example: "L1 — 3 users: Rajesh (Regional Manager), Sunil (Regional Manager), Priya (Regional Manager)"

### 2. Fetch designation alongside profiles (`AllocationTable.tsx`)

In the hierarchy query (line 338), add `designation` to the profiles select:
```
profiles.select('id, full_name, profile_picture_url, designation')
```

Pass designation data into `SubordinateAllocation` (add `designation?: string` field) and populate `LevelInfo.users` from the allocations map.

### 3. Exclude top user from target assignment (`AllocationTable.tsx`)

- The root user (parentUserId / L0) should NOT appear in the allocation tree — they are the distributor, not a target holder
- This is already the case since `subordinatesOnly` filters `level > 0` (line 329-331)
- However, the save mutation (line 605-618) saves a plan for the root user with `quantity_target: totalQuantity` — change this to save with `quantity_target: 0` and mark the strategy as `roll_down` only (the root just distributes)
- In the auto-calculate logic, the root's total is the source, not their own target

### 4. Add a note in the config panel

Add a small info line: "The root user distributes targets but does not hold a personal target."

### Files to Modify

| File | Change |
|------|--------|
| `TargetStrategySelector.tsx` | Update `LevelInfo` interface, show user names/designations per level |
| `AllocationTable.tsx` | Fetch designation, populate level user info, set root target to 0 on save |

