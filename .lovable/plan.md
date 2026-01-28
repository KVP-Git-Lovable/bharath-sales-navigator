
# Target Management UI Redesign - Two-Phase Flow

## Overview

This plan redesigns the Target Management UI to match the reference mockup with a clean two-phase workflow:
1. **Phase 1: Create Target** - Define target name, metrics, parameters, units, then lock
2. **Phase 2: Assign to Hierarchy** - Select organization level, allocate to subordinates

The key difference from the current wizard is that this UI is more streamlined with all configuration on one screen before locking, and hierarchy assignment happens on a separate tabbed view with a left sidebar tree.

---

## Proposed UI Structure

```text
TARGET MANAGEMENT
├── Tab: "Targets" (Create/Edit Target Configs)
│   ├── Target Plan Name Input
│   ├── Target Metrics Checkboxes (Quantity, Revenue, Productive Visits)
│   ├── Target Parameters Checkboxes (Product-wise, Retailer-wise, Beat-wise, etc.)
│   ├── Units Section
│   └── [Lock and Assign to Hierarchy] Button
│
├── Tab: "Hierarchy" (Allocate to Users)
│   ├── Left Panel: Organization Tree (CEO > Manager > Rep)
│   │   └── Clickable nodes with drill-down
│   └── Right Panel: Allocation View
│       ├── Target Summary Card (Locked, shows totals)
│       ├── Allocation Table (User, Quantity, Progress Bar)
│       ├── "Remaining" indicator
│       └── [Save Allocation] Button
│
└── Tab: "Dashboard" (Existing - Target vs Actual View)
```

---

## Detailed Component Design

### Tab 1: "Targets" - Create Target Configuration

This is a single-page form (no wizard steps) that contains:

**Card: Create Target**
```text
┌──────────────────────────────────────────────────────────────────────┐
│  🎯 Create Target                                                    │
├──────────────────────────────────────────────────────────────────────┤
│  FY Year: [FY 2025-26 ▼]                                             │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ [FY 25 Sales Plan                                              ]│ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Target Metrics                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ☑ Quantity    ☑ Revenue    ☑ Productive Visits                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Target Parameters                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ☑ Product-wise  ☑ Retailer-wise  ☑ Beat-wise  ☑ Distributor    │ │
│  │ ☑ Month         ☐ Territory-wise                                │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Units                                                                │
│  [Kg ▼] for Quantity                                                 │
│                                                                       │
│  Satisfied with the target configuration?                            │
│                              [🔒 Lock and Assign to Hierarchy]       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Target Plan Name is editable text input
- On "Lock and Assign to Hierarchy" click:
  - Save configuration with `is_locked = true`
  - Switch to "Hierarchy" tab
  - Show FY total inputs (Quantity/Revenue/Visits based on selected metrics)

### Tab 2: "Hierarchy" - Assign to Organization

Split-panel layout with organization tree on left and allocation form on right:

```text
┌────────────────────────┬─────────────────────────────────────────────┐
│ Organization Hierarchy │  Target: FY 25 Sales Plan       [🔒 Locked]│
├────────────────────────┼─────────────────────────────────────────────┤
│                        │                                             │
│ ● CEO                  │  Total Target              FY 2025-26       │
│ └ 📋 National Manager  │  ───────────────────────────────────────   │
│   └ 📋 Regional Manager│  Quantity: 1,00,000 KG                     │
│     ├ 📍 ASM-1         │  Revenue: ₹ 55,000,00,000                  │
│     ├ 📍 ASM-2         │  Productive Visits: 12,000                 │
│     └ 📍 ASM-3         │                                   [≡ Tool] │
│                        │─────────────────────────────────────────────│
│                        │                                             │
│                        │  Allocation Method                          │
│                        │  ┌───────────────────────────────────────┐ │
│                        │  │ Target    │ Quantity  │ ₹ Total      │ │
│                        │  ├───────────┼───────────┼──────────────┤ │
│                        │  │ ASM-1     │ 25,000 KG │ ████░░ 25,00 │ │
│                        │  │ ASM-2     │ 35,000 KG │ █████░ 35,000│ │
│                        │  │ ASM-3     │ 40,000 KG │ ██████ 40,000│ │
│                        │  └───────────┴───────────┴──────────────┘ │
│                        │                 Remaining: [0]             │
│                        │                                             │
│                        │              [≡ Save Allocation]           │
└────────────────────────┴─────────────────────────────────────────────┘
```

**Left Panel - Organization Tree:**
- Uses existing `get_all_subordinates` RPC
- Clickable nodes - clicking a manager shows their direct reports in the allocation table
- Icons differentiate managers (📋) from reps (📍)
- Current selected node is highlighted

**Right Panel - Allocation View:**
- Shows locked target summary at top
- FY totals for each enabled metric
- Allocation table shows direct subordinates of selected tree node
- Editable quantity/revenue input with visual progress bar
- "Remaining" shows unallocated amount (auto-calculates)
- "Save Allocation" persists to `user_business_plans`

### Tab 3: "Dashboard" - Target vs Actual (Existing)

Keep the existing `TeamTargetDashboard` component - no changes needed.

---

## Database Schema Changes

Add new columns to `fy_target_config`:

```sql
ALTER TABLE fy_target_config
ADD COLUMN IF NOT EXISTS target_plan_name TEXT DEFAULT 'FY Sales Plan',
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/admin/TargetVsActual.tsx` | Modify | Update tabs to "Targets", "Hierarchy", "Dashboard" |
| `src/components/admin/TargetConfigTab.tsx` | Major Refactor | Convert to single-page "Create Target" form |
| `src/components/admin/HierarchyAllocationTab.tsx` | Create | New split-panel hierarchy allocation view |
| `src/components/admin/OrganizationTree.tsx` | Create | Left panel tree component with clickable nodes |
| `src/components/admin/AllocationTable.tsx` | Create | Right panel allocation table with progress bars |
| `src/components/admin/TargetSummaryCard.tsx` | Create | Locked target summary header component |
| `supabase/migrations/...` | Create | Add target_plan_name and is_locked columns |
| `src/integrations/supabase/types.ts` | Auto-update | Regenerate types |

---

## Detailed Component Breakdown

### 1. TargetConfigTab.tsx (Refactored)

Remove wizard steps, make it a single-page form:

```typescript
interface TargetConfigTabProps {
  fyYear: number;
  onLockedAndAssign: () => void; // Callback to switch to Hierarchy tab
}
```

Key changes:
- Add `target_plan_name` text input at top
- Remove step indicators (WizardProgress)
- Keep all configuration fields on one card
- Add "Lock and Assign to Hierarchy" button
- When locked, show read-only summary with "Edit Configuration" option
- Show FY total inputs (Quantity/Revenue/Visits) in same form

### 2. HierarchyAllocationTab.tsx (New)

Split-panel component with:
- Left: `OrganizationTree` component
- Right: `TargetSummaryCard` + `AllocationTable`

```typescript
interface HierarchyAllocationTabProps {
  fyYear: number;
  config: TargetConfig; // From parent or fetched
}
```

### 3. OrganizationTree.tsx (New)

Recursive tree component:

```typescript
interface OrganizationTreeProps {
  rootUserId: string | null;
  selectedNodeId: string | null;
  onNodeSelect: (userId: string, level: number) => void;
}
```

Features:
- Fetches hierarchy using `get_all_subordinates`
- Renders as collapsible tree with icons
- Clicking a node selects it and updates right panel
- Shows count of direct reports next to manager names

### 4. AllocationTable.tsx (New)

Allocation grid with editable inputs:

```typescript
interface AllocationTableProps {
  parentUserId: string;
  subordinates: SubordinateData[];
  totalQuantity: number;
  totalRevenue: number;
  totalVisits: number;
  quantityUnit: string;
  enabledMetrics: { quantity: boolean; revenue: boolean; visits: boolean };
  onAllocationChange: (userId: string, field: string, value: number) => void;
  onSave: () => void;
}
```

Features:
- Grid with columns: Name, Quantity, Progress, Revenue, Progress
- Progress bars showing % of parent allocation
- Auto-calculate "Remaining" as parent total - sum of children
- Validation: warn if allocations exceed parent total

---

## Workflow Flow

```text
USER FLOW:

1. Admin opens Target Management
   └─► Sees "Targets" tab by default

2. On "Targets" tab:
   ├─► Enters/edits "FY 25 Sales Plan" name
   ├─► Checks Target Metrics (Quantity, Revenue, Visits)
   ├─► Checks Target Parameters (Product-wise, Beat-wise, Monthly, etc.)
   ├─► Selects Quantity Unit (Kg)
   ├─► Enters FY Totals (Quantity: 1,00,000, Revenue: 55Cr, Visits: 12000)
   └─► Clicks "Lock and Assign to Hierarchy"
       └─► Config saved with is_locked=true
       └─► Auto-switches to "Hierarchy" tab

3. On "Hierarchy" tab:
   ├─► Sees organization tree on left
   ├─► Clicks "Regional Manager" in tree
   ├─► Right panel shows:
   │   ├─► Target Summary Card (locked totals)
   │   └─► Allocation table for ASM-1, ASM-2, ASM-3
   ├─► Enters allocation for each ASM
   ├─► Sees "Remaining" update in real-time
   └─► Clicks "Save Allocation"
       └─► Creates/updates user_business_plans for each user

4. Drill-down allocation:
   ├─► Clicks on "ASM-1" in tree
   └─► Right panel now shows ASM-1's direct reports
       └─► Can allocate ASM-1's total to their team

5. On "Dashboard" tab:
   └─► Existing Target vs Actual view (no changes)
```

---

## Parameter-wise Target Setting (After Basic Allocation)

After setting user-level totals, clicking on a user row can expand to show parameter breakdowns:

```text
┌────────────────────────────────────────────────────────────────────┐
│ ASM-1: 25,000 KG | ₹13,75,00,000                          [▼ Expand]│
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [ Beats ] [ Monthly ] [ Retailers ] [ Products ]                   │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ BEAT TAB                                                        ││
│ │ ☑ Equally divide across all beats                               ││
│ │ Beat-1: 8,333 KG   Beat-2: 8,333 KG   Beat-3: 8,334 KG         ││
│ │                                    [Save Beat Targets]          ││
│ └─────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

This reuses the existing `HierarchyUserTargetNode` component with:
- Filtered tabs based on enabled parameters
- `UserBeatTargets`, `UserMonthlyTargets`, `UserRetailerTargets` sub-components

---

## Technical Notes

1. **State Management**: 
   - Config state persisted to `fy_target_config` table
   - User allocations persisted to `user_business_plans` table
   - Parameter breakdowns to respective `user_business_plan_*` tables

2. **Lock Behavior**:
   - Once locked, config cannot be edited without explicit "Unlock" action
   - Locked configs show read-only summary on "Targets" tab
   - "Hierarchy" tab only available when a locked config exists

3. **Hierarchy Tree**:
   - Use `get_all_subordinates` RPC for full hierarchy
   - Build client-side tree structure from flat list
   - Support for clicking any level to allocate to that level's direct reports

4. **Progress Bars**:
   - Visual representation of allocation percentage
   - Color-coded: green (within target), orange (over target)

5. **Validation**:
   - Warn if sum of allocations exceeds parent total
   - "Remaining" can be negative (over-allocation) or positive (under-allocation)

---

## Migration Script

```sql
-- Add new columns for target plan name and lock status
ALTER TABLE fy_target_config
ADD COLUMN IF NOT EXISTS target_plan_name TEXT DEFAULT 'FY Sales Plan',
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
```

---

## Summary of Changes

| Current | New |
|---------|-----|
| 3-step wizard (Configure → Set Targets → Apply to Users) | Single-page form with Lock button |
| Separate tabs: Config, Assign, Dashboard | Tabs: Targets, Hierarchy, Dashboard |
| Step-by-step flow | All config on one screen, then hierarchy |
| No target plan name | Named target plans |
| No lock mechanism | Explicit lock before assignment |
| Hierarchy in Step 3 | Dedicated "Hierarchy" tab with tree view |
| Single-panel hierarchy | Split-panel with tree + allocation table |

This redesign provides a cleaner, more intuitive flow that matches the reference mockup while maintaining all existing functionality.
