

# Nested Mini Target Boxes for Sub-Managers

## What Changes

In `StepAssignManagers.tsx`, when rendering direct reports inside a manager's card, sub-managers (those with `subordinateCount > 0`) will get a **mini nested target input box** instead of just a name row. Regular users (no subordinates) remain as simple name rows.

## Current vs Proposed

**Current**: Shravya shows as a flat row with name + badge + strategy selector
**Proposed**: Shravya gets a small bordered card with:
- Name + team badge + strategy selector (top row)
- Strategy description text
- Target input fields (Qty/Revenue/Visits) matching enabled metrics
- "Distributed to team" label when strategy is roll_down

## Changes

### `StepAssignManagers.tsx`

1. **Extend `TeamNode` interface** to include target fields: `quantityTarget`, `revenueTarget`, `visitsTarget`, `targetStrategy`

2. **Replace `renderDirectReports`** logic:
   - For nodes with `subordinateCount === 0`: render simple name row (current behavior)
   - For nodes with `subordinateCount > 0`: render a mini card with:
     - Name + badge + strategy selector header
     - Strategy description
     - Editable target inputs (same style as parent but slightly smaller/indented)
     - Uses existing `onTargetChange(node.userId, field, value)` and `onStrategyChange(node.userId, strategy)`

3. **Pass `enabledMetrics` and `quantityUnit`** into `renderDirectReports` (already available in scope)

### `AllocationTable.tsx`

4. **Ensure `TeamNode` children carry target data**: When building manager rows, populate each child's `quantityTarget`, `revenueTarget`, `visitsTarget`, and `targetStrategy` from the allocations map so the mini boxes show current values.

### Visual Layout

```text
┌─ Prajwal Card ──────────────────────────────┐
│ [Avatar] Prajwal (8 members)  [Roll Down ▾] │
│ Target will be distributed to subordinates   │
│                                              │
│ ▾ Reporting structure (5 direct)             │
│ ┌──────────────────────────────────────────┐ │
│ │ ↳ Alice                                  │ │
│ │ ↳ Dharmesh                               │ │
│ │ ↳ Nishdeep                               │ │
│ │ ↳ Suyog                                  │ │
│ │                                          │ │
│ │ ↳ Shravya  [👥 3]  Manages 3 members     │ │
│ │   ┌────────────────────────────────────┐ │ │
│ │   │ [Roll Down ▾]                      │ │ │
│ │   │ Distributed to team                │ │ │
│ │   │ Qty [____] Kg                      │ │ │
│ │   └────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Qty [____] Kg                                │
└──────────────────────────────────────────────┘
```

## Files to Modify
- `StepAssignManagers.tsx` — Extend TeamNode, add mini target card for sub-managers
- `AllocationTable.tsx` — Populate target data on TeamNode children

