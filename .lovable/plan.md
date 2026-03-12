
# Scalable Target Management — Modular Redesign

## Status: ✅ Phase 1-2 Implemented

## Summary
Replaced the monolithic `fy_target_config` admin setup with a modular 4-layer architecture: Target Types → Target Policies → Target Plans → Allocation.

## What Was Done

### Database (Migration) ✅
- Created `target_types` table (name, metric, description, is_active)
- Created `target_policies` table (name, target_type_id, period_type, quantity_unit, enabled_parameters)
- Created `target_plans` table (name, policy_id, fy_year, totals, lock state, status)
- Added `target_plan_id` column to `hierarchy_targets`
- RLS: read by authenticated, write by admin only on all 3 tables

### Hooks ✅
- `useTargetTypes.ts` — CRUD for target_types
- `useTargetPolicies.ts` — CRUD for target_policies with joined target_type
- `useTargetPlans.ts` — CRUD + lock/unlock for target_plans with joined policy+type

### UI Components ✅
- `TargetTypesTab.tsx` — CRUD table with dialog (name, metric, description, active toggle)
- `TargetPoliciesTab.tsx` — CRUD table with dialog (policy name, type, period, unit, parameter checkboxes)
- `TargetPlansTab.tsx` — CRUD table with dialog (plan name, policy, totals, months, lock/unlock)

### Page Update ✅
- `TargetVsActual.tsx` — Changed from 3-tab to 5-tab layout: Types | Policies | Plans | Allocate | Actual
- Removed old `TargetConfigTab` import (still exists for reference)

## What Stays Unchanged (backward compatible)
- `fy_target_config` — remains for existing data
- `HierarchyAllocationTab` — still reads from `fy_target_config` (Phase 3 will wire to `target_plans`)
- `TeamTargetDashboard` — unchanged
- All user-facing pages (`/my-target`, `/my-targets`, `/team-targets`) — unchanged
- `user_business_plans` and breakdown tables — unchanged

## Phase 3 (Future)
- Wire `HierarchyAllocationTab` to read from `target_plans` + `target_policies` instead of `fy_target_config`
- Add plan selector dropdown in Allocate tab
- Add plan filter in Dashboard tab
- Migrate existing `fy_target_config` data to new tables
