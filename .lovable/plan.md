

# Custom Target Parameters — Plan

## What You Want
Add a "+ Custom Parameter" button next to the Target Parameters section (similar to the existing "+ Custom Metric" button), allowing admins to create custom breakdown parameters that pull values from existing database tables.

## Current State
- **Target Parameters** are hardcoded: Product, Retailer, Beat, Distributor, Territory, Monthly
- They're stored as a JSON object (`enabled_parameters`) on `fy_target_config`
- The `target_breakdowns` table already supports arbitrary `parameter_type` and `parameter_id`/`parameter_name` — so the downstream allocation already works with any parameter type
- **Custom Metrics** already follow a similar pattern via `target_metric_definitions` table

## Design

### 1. New Database Table: `target_parameter_definitions`

Stores custom parameter types admins create:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| name | text | e.g., "Channel-wise", "Zone-wise" |
| parameter_key | text unique | e.g., "channel", "zone" (used in enabled_parameters JSON) |
| icon | text | Emoji or icon key |
| data_source_table | text | Table to pull values from, e.g., "beats", "products" |
| data_source_id_column | text | Column for the ID, e.g., "id" |
| data_source_name_column | text | Column for the display name, e.g., "name" |
| data_source_filter | jsonb | Optional filter (e.g., `{"type": "channel"}`) |
| is_system | boolean | true for built-in params, false for custom |
| display_order | int | |
| created_at | timestamptz | |

Pre-seed system parameters (product, retailer, beat, distributor, territory, monthly) so everything is unified.

### 2. Frontend Changes

**TargetConfigTab.tsx** — Target Parameters section (lines 790-828):
- Fetch parameter definitions from `target_parameter_definitions` instead of hardcoded list
- Add a "+ Custom Parameter" button (same pattern as Custom Metric)
- Show delete button on non-system parameters

**New: CreateParameterDialog component:**
- Fields: Name, Key (auto-generated from name), Icon (emoji picker)
- Data source selector: dropdown of available tables (curated list: products, retailers, beats, distributors, territories, or a custom table)
- ID column and Name column fields
- Optional filter JSON

**New hook: `useTargetParameters.ts`:**
- `useParameterDefinitions()` — fetch all parameter definitions
- `useCreateParameterDefinition()` — create custom parameter
- `useDeleteParameterDefinition()` — delete (non-system only)

### 3. How Custom Parameters Work Functionally

When a custom parameter is enabled for a plan:
1. During **target allocation**, the system queries `data_source_table` using the configured columns to get the list of values
2. Admin sees those values as breakdown rows (just like Product-wise or Retailer-wise)
3. Breakdown rows are saved to `target_breakdowns` with `parameter_type` = the custom key
4. Dashboard/reports already work since they read `parameter_type` dynamically

### 4. Available Data Sources (Curated List)

Rather than exposing raw table names, we present friendly options:
- Products → `products` table (id, name)
- Retailers → `retailers` table (id, retailer_name)
- Beats → `beats` table (id, name)
- Distributors → `distributors` table (id, name)
- Territories → `territories` table (id, name)
- Custom tables the user may have

### 5. Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `target_parameter_definitions` table + seed system rows |
| `src/hooks/useTargetParameters.ts` | New hook for CRUD |
| `src/components/admin/TargetConfigTab.tsx` | Replace hardcoded params with DB-driven list + add button |
| `src/components/admin/CreateParameterDialog.tsx` | New dialog for creating custom parameters |
| Allocation components | Update to dynamically fetch values from configured data source |

### 6. Summary

The `target_breakdowns` table already supports arbitrary parameter types, so the core infrastructure is in place. The main work is:
1. A new definitions table to store custom parameters with their data source config
2. UI to create/manage custom parameters
3. Dynamic data fetching during allocation based on the configured source table

