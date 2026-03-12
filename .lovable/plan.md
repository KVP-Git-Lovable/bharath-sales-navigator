

# Fix Missing Retailer Activation in Breakdowns + Configurable Metrics

## Issue 1: Retailer Activation Missing from Parameter Breakdown

The FY Overview section shows all 4 metrics correctly, but the **Parameter Breakdown** section (Monthly, Products, etc.) only shows 3 columns: Qty, Revenue, Visits. The `BreakdownItem` interface and all grid layouts are hardcoded for just those 3 fields — `retailer_activation` was never added.

**Affected locations in `TargetConfigTab.tsx`:**
- `BreakdownItem` interface (line 26) — missing `retailer_activation` field
- Grid template columns (lines 1033, 1051, 1316, 1338, 1376) — missing retailer_activation column
- Column headers (lines 1317-1320) — missing header
- Item inputs (lines 1054-1079, 1341-1366) — missing input
- Equal divide logic (line 1233) — missing retailer_activation distribution
- Total calculation (lines 1241-1243, 1380) — missing retailer_activation total
- `ProductCategoryGroups` component — same issues

## Issue 2: Configurable Target Metrics

Currently, the 4 metrics (Quantity, Revenue, Visits, Retailer Activation) are hardcoded as separate boolean columns and separate number fields. The user wants to define custom metrics (e.g., "Demo Calls", "New SKU Listings").

### Approach: Database-Driven Custom Metrics

**A. New table: `target_metric_definitions`**
```sql
CREATE TABLE target_metric_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,           -- "Quantity", "Revenue", "Retailer Activation", "Demo Calls"
  unit text DEFAULT '',         -- "Kg", "₹", "count", etc.
  icon text DEFAULT 'target',  -- lucide icon name
  color text DEFAULT 'blue',   -- tailwind color: blue, emerald, violet, amber, rose, etc.
  is_system boolean DEFAULT false, -- true for the 4 default metrics (non-deletable)
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed the 4 existing metrics as system defaults
INSERT INTO target_metric_definitions (name, unit, icon, color, is_system, display_order) VALUES
  ('Quantity', 'Kg', 'package', 'blue', true, 1),
  ('Revenue', '₹', 'indian-rupee', 'emerald', true, 2),
  ('Visits', '', 'footprints', 'violet', true, 3),
  ('Retailer Activation', '', 'store', 'amber', true, 4);
```

**B. New junction table: `plan_enabled_metrics`**
```sql
CREATE TABLE plan_enabled_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fy_config_id uuid REFERENCES fy_target_config(id) ON DELETE CASCADE,
  metric_id uuid REFERENCES target_metric_definitions(id) ON DELETE CASCADE,
  total_target numeric DEFAULT 0,
  unit_override text,  -- optional override per plan (e.g., Kg vs Tonnes)
  UNIQUE(fy_config_id, metric_id)
);
```

**C. Update `BreakdownItem` to be dynamic**
Instead of hardcoded `quantity`, `revenue`, `visits` fields, use a `metrics: Record<string, number>` map keyed by metric ID.

### Files to Edit

| File | Change |
|------|--------|
| Migration SQL | Create `target_metric_definitions` + `plan_enabled_metrics`, seed defaults |
| `TargetConfigTab.tsx` | Replace hardcoded 4-metric toggles with dynamic list from `target_metric_definitions`. Add "Create Custom Metric" dialog. Update `BreakdownItem` to use dynamic metric map. Fix all grid columns/headers/inputs/totals to be metric-driven. |
| `useFYTargetConfig.ts` | Keep backward-compatible but add metrics data |
| New: `useTargetMetrics.ts` | Hook to fetch `target_metric_definitions` and `plan_enabled_metrics` |

### UI Changes

1. **Target Metrics section** — Instead of 4 hardcoded cards, render dynamically from `target_metric_definitions`. Add a "+ Custom Metric" button that opens a dialog to create a new metric (name, unit, color).

2. **FY Overview section** — Render one card per enabled metric dynamically, using the metric's color.

3. **Parameter Breakdown grids** — Column count is dynamic based on enabled metrics. Each metric gets a column header and input.

4. **Custom Metric Dialog** — Simple form: Name, Unit (optional), Color picker (preset options).

### Execution Order

1. Run migration (tables + seed data)
2. Create `useTargetMetrics` hook
3. Update `TargetConfigTab` — dynamic metrics everywhere
4. Keep backward compatibility: existing `enable_quantity`/`enable_revenue`/`enable_visits`/`enable_retailer_activation` columns remain in DB but UI reads from the new tables going forward

