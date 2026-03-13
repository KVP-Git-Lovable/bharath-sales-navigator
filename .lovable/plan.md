
# Scalable Target Management — Plan

## Status: ✅ Implemented

## Summary
Upgraded the target management system from a rigid lock-based model to a flexible plan-status-driven architecture with multi-plan support and a unified `target_breakdowns` table.

## What Was Done

### Phase 1: Database Migration ✅
- Added `plan_status` column (`draft` / `active` / `closed`) to `fy_target_config`
- Migrated existing data: `is_locked=true` → `active`, `is_locked=false` → `draft`
- Dropped unique constraint on `fy_year`, replaced with composite `(fy_year, target_plan_name)` to support multiple plans per FY
- Created `target_breakdowns` table for flexible multi-parameter target storage
- RLS enabled on `target_breakdowns`

### Phase 2: Hooks ✅
- Updated `useFYTargetConfig` to support optional `planId` parameter and `plan_status` field
- Created `useFYTargetPlans` hook to fetch all plans for a given FY year

### Phase 3: TargetConfigTab ✅
- Removed Lock/Unlock buttons and locked read-only view
- Added **Plan Selector** bar showing all plans for current FY with status icons + "New Plan" button
- Added **Status Badge** (Draft/Active/Closed) with color-coded indicators
- Replaced "Lock & Assign" with "Activate & Assign" button
- Active plans show warning: "Changes will affect allocated targets"
- Closed plans show read-only view with "Reopen as Draft" option
- `is_locked` is now auto-derived from `plan_status` for backward compatibility

### Phase 4: HierarchyAllocationTab ✅
- Replaced `is_locked` check with `plan_status` check
- Draft plans show "Please activate" message instead of "Configuration not locked"
- Active and Closed plans allow viewing allocations
- Accepts `selectedPlanId` prop for multi-plan support

### Phase 5: DistributionSummaryHeader + TargetSummaryCard ✅
- Replaced `isLocked` badge with status badge (Draft/Active/Closed)
- Backward compatible: falls back to `is_locked` if `plan_status` not set

### Phase 6: TargetVsActual Page ✅
- Added `selectedPlanId` state management
- Passes `selectedPlanId` and `onPlanChange` to TargetConfigTab
- Passes `selectedPlanId` to HierarchyAllocationTab

## Backward Compatibility
- `is_locked` column remains in DB and is auto-synced from `plan_status`
- Existing `user_business_plan_*` breakdown tables untouched
- All existing data migrated automatically
