

# Simplify Hierarchy Target Allocation — Plan

## Problem
Currently, the hierarchy allocation requires going into each row to set strategy and manually enter values. The user wants a **configure-once, auto-calculate** approach.

## Proposed Flow

### New 2-Step Configuration Panel (replaces current inline editing)

**Step 1 — Strategy Configuration (by level/role)**
A simple card at the top where admin selects the target strategy per hierarchy level:
- L1 (e.g., Regional Manager): Roll Down / Roll Up / Independent
- L2 (e.g., Area Manager): Roll Down / Roll Up / Independent
- Apply same strategy to all users at that level automatically

**Step 2 — Split Method**
After strategy is set, choose how to split:
- **Equal Split** — divide equally among children at each level
- **Percentage Split** — enter % per user (with a quick preset like weighted by historical performance)
- **Manual** — type values directly

Once configured, the system **auto-calculates all targets** down the entire tree recursively. The existing tree UI then shows the **final result as read-only** (with an "Edit" toggle to fine-tune individual values if needed).

### UI Changes to AllocationTable.tsx

1. **Replace** the current `TargetStrategySelector` (3 full cards) + per-row `InlineStrategySelector` dropdowns with a **Level-wise Strategy Config** section:
   ```
   ┌─────────────────────────────────────────────┐
   │  Configure Target Distribution              │
   │                                             │
   │  Level 1 (3 users):  [Roll Down ▾]          │
   │  Level 2 (8 users):  [Roll Down ▾]          │
   │  Level 3 (15 users): [Independent ▾]        │
   │                                             │
   │  Split Method:  ● Equal  ○ Percentage  ○ Manual │
   │                                             │
   │  [Auto-Calculate & Preview]                 │
   └─────────────────────────────────────────────┘
   ```

2. **"Auto-Calculate & Preview" button** triggers recursive distribution:
   - For Roll Down levels: parent target ÷ number of children (equal) or by % 
   - For Roll Up levels: children's values bubble up
   - Results populate the tree below

3. **Tree view stays the same** but defaults to read-only showing calculated values. A toggle "Fine-tune" enables manual editing per row.

4. **Remove** the inline `InlineStrategySelector` dropdown from each row (strategy is now set at level, not per user).

### Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/AllocationTable.tsx` | Add level-wise config panel, auto-calculate logic, default to read-only tree with edit toggle |
| `src/components/admin/TargetStrategySelector.tsx` | Add new `LevelStrategyConfig` component |
| No DB changes needed | Strategies still save to `user_business_plans.target_strategy` per user |

### Auto-Calculation Logic

```
function autoDistribute(node, levelStrategies, splitMethod):
  strategy = levelStrategies[node.level]
  
  if strategy == 'roll_down':
    if splitMethod == 'equal':
      each child.target = node.target / childCount
    elif splitMethod == 'percentage':
      each child.target = node.target * child.percentage
    recurse into each child
    
  elif strategy == 'roll_up':
    recurse into children first
    node.target = sum(children.targets)
    
  elif strategy == 'independent':
    keep node.target as-is
    recurse children independently
```

### What Stays the Same
- Tree/Table view toggle, Compact/Expanded toggle
- Save button and save logic
- Distribution progress bars and status dots
- Split dialog for fine-tuning individual managers
- Daily average panel

