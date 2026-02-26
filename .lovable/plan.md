

## Role-Based Hierarchy Target Management -- Complete UI Overhaul

This plan enhances the existing Hierarchy Allocation tab with clear role-based target assignment, distribution validation, status indicators, split dialogs, and a professional summary header.

---

### Overview of Changes

The existing `AllocationTable.tsx` (1219 lines) and `HierarchyAllocationTab.tsx` already have solid foundations -- hierarchy fetching via `get_all_subordinates`, tree/table views, equal/percentage/manual split methods, and roll-down/roll-up/independent strategies. The improvements focus on **visibility, validation, and usability** without rewriting the core logic.

---

### 1. Distribution Summary Header

**New file: `src/components/admin/DistributionSummaryHeader.tsx`**

A top-level card replacing the current `TargetSummaryCard` usage with richer distribution status:

- Total Company Target (Qty / Revenue / Visits)
- Assigned total (sum of all direct report allocations)
- Unassigned remainder
- Distribution completion percentage with a color-coded progress bar (green >= 90%, orange 50-89%, red < 50%)
- FY period label (e.g., "Apr 2025 -- Mar 2026")

Data computed from existing `allocatedQuantity`, `allocatedRevenue`, `allocatedVisits` already calculated in `AllocationTable`.

---

### 2. Enhanced User Cards with Status Indicators

**Modified: `AllocationTable.tsx` -- `renderUserCard` function**

Each user card gets a richer layout:

- **Status dot**: Color indicator next to name
  - Green = Target assigned and > 0
  - Grey = Not assigned (target = 0)
  - Orange = Partially distributed (manager whose children don't sum to their target)
  - Red = Over-allocated
- **Distribution bar for managers**: Small inline progress bar showing `children sum / this user's target`
- **Distribution warning text**: "15,000 Kg not yet distributed" when children sum < parent target
- **Target display improvement**: Show assigned target prominently even in tree view, with clearer labels

---

### 3. Per-Manager Split Dialog

**New file: `src/components/admin/TargetSplitDialog.tsx`**

A dialog triggered by a "Split" button on any manager card:

- Shows manager's target at top
- Lists all direct children with allocation inputs
- Three split modes:
  - **Even Split**: Divide equally among children
  - **Percentage Split**: Enter % per child, auto-calculate values
  - **Manual Split**: Enter exact values per child
- Live validation: Shows remaining/over-allocation inline
- Preview totals before applying
- "Apply" button updates the parent `AllocationTable` state

This replaces the need for the top-level Equal/Percentage/Manual toggle for sub-levels -- each manager gets their own split control.

---

### 4. Restrict Assignment to Direct Reports Only

**Modified: `AllocationTable.tsx`**

- Input fields are only editable for users whose `manager_id` matches the currently selected parent node
- Non-direct children (L3 under L1 view) show their targets as read-only
- Each manager node gets a "Split" button to distribute to THEIR direct reports
- This enforces: L1 assigns to L2 only, L2 assigns to L3 only

Implementation: Add a `parentOfNode` map during hierarchy construction. In `renderUserCard`, check if `user.level === 1` (direct report of selected node) to enable editing. Deeper nodes show read-only values with a note "Managed by [parent name]".

---

### 5. Distribution Validation Per Manager

**Modified: `AllocationTable.tsx`**

For every manager node in the tree:

- Compute `distributedTarget = sum(children targets)`
- Compute `remainingTarget = thisUser.target - distributedTarget`
- Show inline warning when `remainingTarget > 0`: "X Kg not distributed"
- Show inline error when `remainingTarget < 0`: "Over-allocated by X Kg"
- Block save if any node has over-allocation (existing `hasOverAllocation` logic extended to all levels)

---

### 6. Compact vs Expanded View Toggle

**Modified: `AllocationTable.tsx`**

Add a compact/expanded toggle next to the existing tree/table toggle:

- **Compact mode**: Single line per user -- avatar, name, level badge, target number, status dot
- **Expanded mode** (current): Full card with all inputs, daily average panel, strategy selector

State: `displayDensity: 'compact' | 'expanded'` with default `'compact'`.

---

### 7. Filters and Search

**Modified: `AllocationTable.tsx`**

Add a filter bar below the header controls:

- **Search**: Text input filtering users by name (client-side filter on `allocations` map)
- **Level filter**: Dropdown with "All Levels", "L1", "L2", "L3"
- **Status filter**: "All", "Assigned", "Not Assigned", "Over-allocated"

Filters apply to both tree and table views. In tree view, if a child matches the filter, its parent chain stays visible.

---

### 8. Publish/Lock Mechanism

**Modified: `AllocationTable.tsx` and `HierarchyAllocationTab.tsx`**

- Add a "Publish Targets" button next to "Save Allocation"
- Publishing sets a `published_at` timestamp on each `user_business_plans` record
- Once published, all inputs become read-only with a "Published" badge
- Only admin can unlock/unpublish
- No new DB columns needed -- use the existing `fy_target_config.is_locked` status, or add a `status` field to `user_business_plans` via migration

**Migration: Add `allocation_status` column to `user_business_plans`**

```sql
ALTER TABLE public.user_business_plans
  ADD COLUMN IF NOT EXISTS allocation_status text DEFAULT 'draft'
  CHECK (allocation_status IN ('draft', 'published', 'locked'));
```

---

### Technical Implementation Details

**Files to create:**
1. `src/components/admin/DistributionSummaryHeader.tsx` -- Summary card with progress bar
2. `src/components/admin/TargetSplitDialog.tsx` -- Per-manager split dialog

**Files to modify:**
1. `src/components/admin/AllocationTable.tsx` -- Major enhancements:
   - Add status indicators (colored dots) per user
   - Add per-manager distribution validation (warning/error messages)
   - Add compact/expanded toggle
   - Add search and filter bar
   - Add "Split" button on manager cards (opens `TargetSplitDialog`)
   - Make non-direct-report inputs read-only
   - Add "Publish" button with lock logic
2. `src/components/admin/HierarchyAllocationTab.tsx`:
   - Replace `TargetSummaryCard` with `DistributionSummaryHeader`
   - Pass distribution totals to the summary header
3. `src/components/admin/TargetSummaryCard.tsx` -- Keep as-is (used elsewhere), new component handles hierarchy page

**Database migration:**
- Add `allocation_status` column to `user_business_plans` for publish/lock state

**No new hooks needed** -- all data is already fetched by the existing queries in `AllocationTable`. The enhancements are purely UI computation on existing data.

---

### Implementation Phases

**Phase 1 (This implementation):**
- Distribution Summary Header with progress bar
- Status indicators on user cards
- Per-manager distribution validation warnings
- Split dialog for each manager node
- Direct-reports-only editing restriction
- Compact/expanded view toggle

**Phase 2 (Future):**
- Search and filter bar
- Publish/lock mechanism with DB migration
- Copy previous period targets
- Performance-based auto-suggestion for splits

