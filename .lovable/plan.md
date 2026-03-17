

## Plan: "No Target" in Allocation, Strategy Explanation Visibility, and Target Reassignment Flexibility

### Problem Summary
1. Strategy explanation panel (Roll Down/Roll Up/Independent) is not visible — it's collapsed by default
2. No "No Target" option in the allocation wizard — admin can't mark individual users as having no target
3. No way to handle mid-year changes: new joiners, leavers, or reassigning one user's target to another
4. Managers can't see/toggle "No Target" for their subordinates

---

### Changes

#### 1. Make Strategy Explanation Panel visible by default
**File: `src/components/admin/allocation/StrategyExplanationPanel.tsx`**
- Change `useState(false)` to `useState(true)` so the panel is open by default

#### 2. Add "No Target" as a 4th strategy option in InlineStrategySelector
**File: `src/components/admin/TargetStrategySelector.tsx`**
- Add `'no_target'` to the `TargetStrategy` type: `'roll_down' | 'roll_up' | 'independent' | 'no_target'`
- Add a 4th strategy entry with `Ban` icon, label "No Target", description "This user has no target assigned"
- Add to `strategyIcons`, `strategyLabels`, `strategyColors` (gray), `StrategyBadge`
- Show "No Target" option only for leaf users (non-managers) — or for all, but when selected, zero out all targets

**File: `src/components/admin/allocation/StrategyExplanationPanel.tsx`**
- Add a 4th card for "No Target" explaining: "User will have no target. Their allocation is excluded from distribution calculations."

#### 3. Handle "No Target" in allocation logic
**File: `src/components/admin/AllocationTable.tsx`**
- When a user is set to `no_target`, zero out their targets and set `has_no_target = true`
- In `distributeTargetsDown`, skip `no_target` users when splitting weights — redistribute their share among remaining users
- In `splitByWeights`, filter out entries for `no_target` users
- In the save mutation, include `has_no_target: alloc.targetStrategy === 'no_target'` in the upsert

**File: `src/components/admin/allocation/StepAssignManagers.tsx`**
- When a manager's direct report is set to "No Target", show a "No Target" badge and hide input fields for that user
- For sub-manager nodes with "No Target", hide the target input boxes

**File: `src/components/admin/allocation/StepPreview.tsx`**
- Show "No Target" badge for users marked as `no_target`, skip them from distribution warnings

**File: `src/components/admin/allocation/StepReviewSave.tsx`**
- Show "No Target" indicator, make those rows read-only with grayed-out appearance

#### 4. Target Reassignment — Move/redistribute a user's target
**File: `src/components/admin/AllocationTable.tsx`**
- Add a "Reassign Target" action: when toggling a user to "No Target", show a confirmation dialog asking whether to redistribute their existing target equally among siblings or leave it unallocated
- When switching from "No Target" back to a regular strategy, allow the admin to manually set the target (it starts at 0)

#### 5. Manager self-service: view & toggle "No Target" for subordinates
**File: `src/components/admin/TeamTargetDashboard.tsx`** (or the manager's team targets view)
- Add a toggle/checkbox next to each subordinate showing "No Target" status
- Managers can toggle subordinates to "No Target" (saves `has_no_target` flag to `user_business_plans`)
- When toggled on, the subordinate's target is zeroed; when toggled off, shows input to set new target

---

### Technical Details

**Type change** — `TargetStrategy` becomes a union of 4 values. This impacts:
- `TargetStrategySelector.tsx` (types + UI)
- `AllocationTable.tsx` (distribution logic + save)
- `StepAssignManagers.tsx`, `StepPreview.tsx`, `StepReviewSave.tsx` (rendering)
- DB column `target_strategy` in `user_business_plans` is a text column, so no migration needed — it already stores arbitrary strings

**Distribution logic** — When computing `splitByWeights`, filter out users whose strategy is `no_target`. Their weight becomes 0 and their share is redistributed proportionally among active users. The `getContributors` function should return 0 for `no_target` nodes.

**Reassignment flow** — When a user leaves mid-year and admin sets them to "No Target":
1. Their current target is captured
2. Admin is prompted: "Redistribute ₹X among remaining N team members?" (Yes/No)
3. If Yes, the freed target is split equally among siblings via `splitByWeights`
4. If No, the target is simply zeroed (manager's total decreases for roll_up, or unallocated remainder increases for roll_down)

For new joiners mid-year, the admin simply adds the new user to the hierarchy (via User Management), then in the allocation wizard they appear with 0 target and can be assigned a target normally.

### Files to Modify
- `src/components/admin/TargetStrategySelector.tsx` — Add `no_target` strategy
- `src/components/admin/allocation/StrategyExplanationPanel.tsx` — Open by default + add No Target card
- `src/components/admin/AllocationTable.tsx` — Distribution logic, save mutation, reassignment dialog
- `src/components/admin/allocation/StepAssignManagers.tsx` — No Target UI state
- `src/components/admin/allocation/StepPreview.tsx` — No Target badge/display
- `src/components/admin/allocation/StepReviewSave.tsx` — No Target read-only display
- `src/components/admin/TeamTargetDashboard.tsx` — Manager toggle for subordinate No Target

