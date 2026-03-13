

# Redesign Target Allocation — Step-Based Manager-First Flow

## Problem
The current allocation UI dumps everything on one screen: strategy config, level config, auto-calculate, and the full tree. It's confusing. The user wants a clear, guided flow:

1. Set annual target (already done in Target Config tab)
2. Assign targets to **L1 managers only** (direct reports) with per-manager strategy selection
3. Auto-calculate & preview the full tree (cascaded results)
4. Fine-tune any individual user's target
5. Save — and each user can see/edit their own assigned target

## Current State
- `AllocationTable.tsx` (1152 lines) renders everything at once: LevelStrategyConfig panel + tree/table view + fine-tune mode
- `autoDistributeTargets()` already handles roll_down/roll_up/independent recursion
- Strategy explanations exist in `TargetStrategySelector.tsx` but are tooltip-only (not prominently displayed)

## Plan

### 1. Add Strategy Explanation Cards (TargetStrategySelector.tsx)
Add a new `StrategyExplanationPanel` component that shows all three strategies with clear visual explanations:
- **Roll Down** ↓ — "Manager's target is split among subordinates. As subordinates achieve, it fills the manager's target."
- **Roll Up** ↑ — "Subordinates set their own targets. Manager's target = sum of all subordinate targets."
- **Independent** — — "Manager and subordinates have separate targets. They don't affect each other."

Display this as a collapsible info section at the top of the allocation card.

### 2. Restructure AllocationTable into a Step-Based Flow (AllocationTable.tsx)
Replace the current single-view with a **3-step wizard** inside the same card:

**Step 1: "Assign Manager Targets"**
- Show only L1 direct reports (managers)
- Each manager row shows: Avatar, Name, Designation, Subordinate count
- Editable target inputs (Qty/Revenue/Visits) for each manager
- Per-manager strategy dropdown (Roll Down / Roll Up / Independent)
- A remaining-to-allocate bar at the top showing how much of the total is left
- Quick-fill buttons: "Equal Split" and "Percentage Split"

**Step 2: "Auto-Calculate & Preview"**
- Button triggers `autoDistributeTargets()` using per-manager strategies
- Shows the full hierarchy tree (read-only) with calculated values for all levels
- Highlights managers vs leaf users with different styling
- Shows distribution progress bars per manager

**Step 3: "Review & Save"**
- Same tree/table view but now editable (fine-tune mode ON by default)
- Any user's target can be edited manually
- Over/under allocation warnings shown inline
- Save button at the bottom

Navigation: "Next" / "Back" buttons between steps. Step indicators at top.

### 3. Wire the Step State (AllocationTable.tsx)
- Add `currentStep` state (1 | 2 | 3)
- Step 1 renders only L1 manager rows with editable inputs + strategy selectors
- Step 2 calls auto-calculate on entry, renders full tree read-only
- Step 3 enables fine-tune mode, renders full tree editable
- Keep existing save mutation logic

### 4. Show Strategy Descriptions Inline
In each manager row (Step 1), after the strategy dropdown, show a one-line description of what the selected strategy means for that manager's subordinates.

### Files to Modify

| File | Change |
|------|--------|
| `TargetStrategySelector.tsx` | Add `StrategyExplanationPanel` component with visual descriptions |
| `AllocationTable.tsx` | Refactor into 3-step wizard flow, step navigation, L1-only editing in step 1 |

### No Database Changes Required
All data structures (`user_business_plans`, `target_strategy` field) already support this flow.

