

# Fix Plan Status & Enable Multiple Target Plans

## Issue 1: "FY Sales Plan" Shows as Closed Instead of Active

The database confirms the plan `FY Sales Plan` currently has `plan_status = 'closed'`. This is why the Targets tab shows it as a closed/read-only plan. We need to update it back to `'active'`.

**Fix**: Run a data migration to set the plan back to active status.

```sql
UPDATE fy_target_config 
SET plan_status = 'active', is_locked = true 
WHERE id = '728d55ce-9692-4b77-833b-7ac912c62a0b';
```

## Issue 2: Creating a New Target Plan

The current system **already supports multiple plans per FY year**. The "New Plan" button exists in the UI. However, there's no conflict — each plan is independent with its own metrics, parameters, and hierarchy allocations.

**What works today:**
- Click "New Plan" button → fills in a blank form → Save → creates a second plan
- Both plans can be "Active" simultaneously (no constraint preventing it)
- Plan selector (pill buttons at top) lets you switch between plans
- Hierarchy tab respects the selected plan via `selectedPlanId`

**Small improvements needed:**
1. After clicking "New Plan", auto-save isn't triggered — the user must fill in details and click Save. This is fine, but we should make the flow clearer.
2. The plan selector should show status indicators more prominently so it's obvious which plans are active vs draft.

## Changes

| What | How |
|------|-----|
| Fix existing plan status | SQL migration: set `plan_status = 'active'` for the FY Sales Plan |
| No code changes needed | Multiple plans already work — New Plan button, plan selector, and independent save all exist |

This is a simple data fix. The system already supports what you need.

