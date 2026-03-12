

# Scalable Target Management — Plan

## What You Want
- Keep existing UI tabs (Targets, Hierarchy, Target vs Actual)
- Remove the rigid lock mechanism
- Replace with plan status (Draft → Active → Closed)
- Support multiple target plans per FY year
- Add a flexible `target_breakdowns` table for multi-parameter targets
- Add allocation validation (over-allocation warnings)

## Current State
Your system already has:
- `fy_target_config` — one config per FY year, with `is_locked` boolean
- `user_business_plans` — per-user targets linked to a plan
- Separate breakdown tables: `user_business_plan_products`, `_months`, `_retailers`, `_territories`, `_distributors`, `_territory_beats`, `_month_products`
- `HierarchyAllocationTab` blocks allocation unless `is_locked = true`
- `TargetConfigTab` has Lock/Unlock buttons and locked read-only view

## Changes

### 1. Database Migration

**A. Add `plan_status` column to `fy_target_config`**
```sql
ALTER TABLE fy_target_config 
  ADD COLUMN plan_status text NOT NULL DEFAULT 'draft';
-- Migrate existing data
UPDATE fy_target_config SET plan_status = 'active' WHERE is_locked = true;
UPDATE fy_target_config SET plan_status = 'draft' WHERE is_locked = false;
```
Values: `draft`, `active`, `closed`

**B. Create `target_breakdowns` table**
```sql
CREATE TABLE target_breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fy_config_id uuid REFERENCES fy_target_config(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parameter_type text NOT NULL, -- 'product', 'retailer', 'beat', 'distributor', 'territory'
  parameter_id text NOT NULL,
  parameter_name text NOT NULL,
  month_number int, -- nullable; if set, this is a month-specific breakdown
  quantity_target numeric DEFAULT 0,
  revenue_target numeric DEFAULT 0,
  visits_target numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS
ALTER TABLE target_breakdowns ENABLE ROW LEVEL SECURITY;
-- Policy: users can read their own, admins can read/write all
```

This single table replaces the need for 6 separate breakdown tables for new plans. Existing breakdown tables remain untouched for backward compatibility.

**C. Allow multiple plans per FY** — currently `fy_target_config` has a unique constraint on `fy_year`. We need to drop it or make it a composite unique on `(fy_year, target_plan_name)`.

### 2. UI Changes — TargetConfigTab

- **Remove** Lock/Unlock buttons and locked read-only view
- **Replace** with a status dropdown: Draft / Active / Closed
- **Draft**: fully editable
- **Active**: editable with a warning ("Changes will affect allocated targets")
- **Closed**: read-only with "Reopen" option
- **Add plan selector** at the top: dropdown showing all plans for the selected FY, plus a "+ New Plan" button
- Keep all existing metric toggles, parameter toggles, and total target inputs exactly as they are

### 3. UI Changes — HierarchyAllocationTab

- **Remove** the "Configuration Not Locked" blocker
- **Replace** check: allow allocation when `plan_status = 'active'` (or `draft` — your choice)
- **Add allocation validation**: show warning badge when `sum(subordinate targets) > manager target` — this already partially exists in `TargetSplitDialog` (the over-allocation check). Extend it to the main `AllocationTable` view.

### 4. AllocationTable Enhancement

- Add an **over-allocation warning banner** at the top when total allocated exceeds the plan total
- The existing `TargetSplitDialog` already shows remaining/over-allocated — keep as-is

### 5. Hook Changes

- Update `useFYTargetConfig` to accept an optional `planId` parameter for multi-plan support
- Add a new `useFYTargetPlans(fyYear)` hook to fetch all plans for a given FY
- Update `HierarchyAllocationTab` to use `plan_status` instead of `is_locked`

### 6. Backward Compatibility

- Existing `user_business_plan_*` breakdown tables remain untouched
- New `target_breakdowns` table is used for future plans; old data continues working
- `is_locked` column stays in DB but is no longer used in UI (derived from `plan_status`)

## Files to Edit

| File | Change |
|------|--------|
| **Migration SQL** | Add `plan_status`, create `target_breakdowns`, relax unique constraint |
| `TargetConfigTab.tsx` | Remove lock UI, add status dropdown + plan selector |
| `HierarchyAllocationTab.tsx` | Replace `is_locked` check with `plan_status` check |
| `AllocationTable.tsx` | Add over-allocation warning banner |
| `DistributionSummaryHeader.tsx` | Replace `isLocked` badge with status badge |
| `TargetSummaryCard.tsx` | Replace lock badge with status badge |
| `useFYTargetConfig.ts` | Support plan selection |
| New: `useFYTargetPlans.ts` | Fetch all plans for an FY year |

## Execution Order

1. Run database migration (add column + create table + relax constraint)
2. Create `useFYTargetPlans` hook
3. Update `TargetConfigTab` — plan selector + status control
4. Update `HierarchyAllocationTab` — remove lock gate
5. Update `AllocationTable` — over-allocation warning
6. Update `DistributionSummaryHeader` + `TargetSummaryCard` — status badges

