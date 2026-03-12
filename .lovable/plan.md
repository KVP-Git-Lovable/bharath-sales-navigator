

# Scalable Target Management — Modular Redesign

## Current State Summary

Your target system currently uses these tables:
- **`fy_target_config`** — single monolithic config per FY (metrics, parameters, totals, lock state)
- **`hierarchy_targets`** — root-level allocation entry per FY
- **`hierarchy_target_allocations`** — per-user splits under hierarchy_targets
- **`user_business_plans`** — synced user-level targets
- **`user_business_plan_months/products/territories/retailers/beats`** — breakdown tables

The problem: `fy_target_config` mixes target type definition, policy rules, and plan values in one row. Only one plan per FY is possible.

## New 4-Layer Architecture

```text
target_types          (What to measure: Sales, Volume, Visits, Collection)
     ↓
target_policies       (How it works: metric, period, breakdowns, unit)
     ↓
target_plans          (Specific FY plan: company totals, lock state)
     ↓
[existing allocation]  (hierarchy_targets → hierarchy_target_allocations → user_business_plans)
```

## Database Changes

### New Tables

**1. `target_types`** — Master list of target categories
```sql
CREATE TABLE target_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,        -- 'Sales Target', 'Volume Target', 'Visit Target'
  metric text NOT NULL,              -- 'revenue', 'quantity', 'visits', 'count'
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**2. `target_policies`** — Configurable rules per target type
```sql
CREATE TABLE target_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                -- 'FY25 Sales Policy'
  target_type_id uuid REFERENCES target_types(id) ON DELETE CASCADE,
  period_type text DEFAULT 'annual', -- 'annual', 'quarterly', 'monthly'
  quantity_unit text,                -- 'Kg', 'Units', etc.
  enabled_parameters jsonb DEFAULT '{}', -- {product, retailer, beat, distributor, territory, monthly}
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**3. `target_plans`** — Concrete FY plans linked to a policy
```sql
CREATE TABLE target_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                -- 'FY 2025 Sales Target'
  policy_id uuid REFERENCES target_policies(id) ON DELETE CASCADE,
  fy_year integer NOT NULL,
  total_target_value numeric DEFAULT 0,  -- company-wide total
  total_secondary_value numeric DEFAULT 0, -- optional secondary metric
  total_visits_target numeric DEFAULT 0,
  target_start_month integer DEFAULT 1,
  target_end_month integer DEFAULT 12,
  status text DEFAULT 'draft',       -- 'draft', 'locked', 'published'
  is_locked boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(policy_id, fy_year)
);
```

### Modify Existing Tables

- **`hierarchy_targets`**: Add `target_plan_id uuid REFERENCES target_plans(id)` column so allocations link to a specific plan
- **`fy_target_config`**: Keep as-is for backward compatibility; new plans use `target_plans` instead. Existing data continues working.

## UI Changes

### Admin Target Management Page (replace current 3-tab layout)

**New 5-tab layout:**

```text
┌──────────────────────────────────────────────────────────┐
│  Target Management              FY: [2024-25 ▼]         │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│  Types   │ Policies │  Plans   │ Allocate │ Target vs    │
│          │          │          │          │ Actual       │
└──────────┴──────────┴──────────┴──────────┴──────────────┘
```

**Tab 1 — Target Types** (new)
- CRUD list of target types (Sales, Volume, Visit, Collection, Retailer Activation)
- Each has name, metric type, description, active toggle
- Simple table with Add/Edit/Delete

**Tab 2 — Target Policies** (new, replaces Step 1 of current ConfigurationStep)
- Create policies linked to a target type
- Configure: period type, quantity unit, enabled parameters (product/retailer/beat/etc.)
- Table list with inline edit or dialog

**Tab 3 — Target Plans** (replaces current TargetConfigTab)
- Create plan for a specific policy + FY year
- Set company-wide totals (revenue, quantity, visits based on policy metric)
- Lock/Unlock plan
- This is a streamlined version of the current config — just totals and lock state

**Tab 4 — Allocate** (current HierarchyAllocationTab, mostly unchanged)
- Select a locked plan to allocate
- Existing hierarchy allocation flow works as-is
- Only change: reads from `target_plans` + `target_policies` instead of `fy_target_config`

**Tab 5 — Target vs Actual** (current TeamTargetDashboard, unchanged)
- Filter by plan (instead of just FY)
- Rest of dashboard logic stays the same

## Files to Change

### Create
1. `src/components/admin/target-config/TargetTypesTab.tsx` — CRUD for target types
2. `src/components/admin/target-config/TargetPoliciesTab.tsx` — CRUD for target policies
3. `src/components/admin/target-config/TargetPlansTab.tsx` — Simplified plan creation (totals + lock)
4. `src/hooks/useTargetTypes.ts` — query/mutation hook for target_types
5. `src/hooks/useTargetPolicies.ts` — query/mutation hook for target_policies
6. `src/hooks/useTargetPlans.ts` — query/mutation hook for target_plans

### Edit
7. `src/pages/admin/TargetVsActual.tsx` — Change from 3 tabs to 5 tabs, wire new components
8. `src/components/admin/HierarchyAllocationTab.tsx` — Read from `target_plans` + `target_policies` instead of `fy_target_config`; add plan selector dropdown
9. `src/components/admin/AllocationTable.tsx` — Accept plan-based props instead of raw config
10. `src/components/admin/TeamTargetDashboard.tsx` — Add plan filter dropdown
11. `src/hooks/useFYTargetConfig.ts` — Add backward-compatible fallback (check `target_plans` first, fall back to `fy_target_config`)

### Database (Migrations)
12. Create `target_types` table
13. Create `target_policies` table
14. Create `target_plans` table
15. Add `target_plan_id` column to `hierarchy_targets`
16. RLS policies for all three new tables

### Keep Unchanged (backward compatible)
- `fy_target_config` — remains for any existing data
- `user_business_plans` and all breakdown tables — no changes needed
- `useUserTargetProgress` / `useTeamTargetProgress` — no changes needed (they read from `user_business_plans`)
- User-facing pages (`/my-target`, `/my-targets`, `/team-targets`) — no changes needed

## Migration Strategy

The existing `fy_target_config` data stays. New plans use the new tables. The allocation and user-level target flow downstream (`hierarchy_target_allocations` → `user_business_plans`) remains identical — only the admin configuration entry point changes.

This is a **large change** spanning ~16 files. I recommend implementing it in phases:
1. **Phase 1**: Database tables + Target Types tab
2. **Phase 2**: Policies tab + Plans tab
3. **Phase 3**: Wire Allocation and Dashboard to use new tables

