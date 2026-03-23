

## Analysis: Do You Need This Checklist Every Time?

### Short Answer: No -- but only if we fix the remaining gaps now.

The 3 policy hooks (`useGlobalLeavePolicy`, `useAutoEndDayPolicy`, `useRegularizationPolicy`) are already fixed with the self-healing pattern. But there are **other singleton/config hooks** in your codebase that still use `.single()` and will break on a fresh/remixed DB.

---

### Current State

**Already safe (self-healing pattern applied):**
- `useGlobalLeavePolicy` -- `.maybeSingle()` + auto-seed + `PolicyResult`
- `useAutoEndDayPolicy` -- `.maybeSingle()` + auto-seed + `PolicyResult`
- `useRegularizationPolicy` -- `.maybeSingle()` + auto-seed + `PolicyResult`
- `useLocationFeature` -- already uses `.maybeSingle()` + fallback
- `useVanSales` -- already uses `.maybeSingle()` + legacy fallback
- `useResolvedExpenseConfig` -- already uses `.maybeSingle()`

**Still vulnerable (uses `.single()` on config/singleton tables):**

| Hook | Table | Risk |
|------|-------|------|
| `useActivePerformanceModule` | `performance_module_config` | Crashes if table empty |
| `useOrderBasedDelivery` | `feature_flags` | Crashes if flag row missing |
| `useD1Delivery` | `feature_flags` (3 keys) | Crashes if flag rows missing |

**Safe `.single()` usage (not config tables -- these are fine):**
- Insert-then-select patterns (e.g., `useTemplates`, `useOfflineBeats`) -- `.single()` after `.insert()` is correct
- Lookup by specific ID (e.g., `useHierarchyTargets .eq('id', targetId).single()`) -- correct usage
- `useAttendanceCache` -- fetches by user+date, handles missing gracefully

---

### Plan: Make ALL Config Hooks Self-Healing

#### Step 1: Fix `useActivePerformanceModule`

Change `.single()` to `.maybeSingle()`, return `'none'` as default if no row exists. No auto-seed needed -- the hook already defaults to `'none'`.

#### Step 2: Fix `useOrderBasedDelivery`

Change `.single()` to `.maybeSingle()`. Already has `if (!error && data)` guard, so just the query method needs updating.

#### Step 3: Fix `useD1Delivery`

Change all 3 `.single()` calls to `.maybeSingle()`. Already has `if (!error && data)` guards.

#### Step 4: Add seed data for `feature_flags` and `performance_module_config`

Add to the existing seed migration (or new migration):

```sql
INSERT INTO feature_flags (feature_key, is_enabled)
VALUES 
  ('order_based_delivery', false),
  ('d1_delivery', false),
  ('packing_list_module', false),
  ('delivery_agent_app', false),
  ('location_check_in_enabled', true),
  ('van_sales', false)
ON CONFLICT DO NOTHING;

INSERT INTO performance_module_config (active_module)
VALUES ('none')
ON CONFLICT DO NOTHING;
```

---

### How This Prevents Future Issues

After this fix, **every config/singleton hook** in your codebase follows one of two patterns:

1. **Self-healing pattern** (for policy tables): `.maybeSingle()` + auto-seed + `PolicyResult`
2. **Graceful fallback pattern** (for feature flags/config): `.maybeSingle()` + sensible default

**You will NOT need to paste this checklist again** because:
- All existing config hooks will be resilient
- The `policyDefaults.ts` utility provides a reusable pattern for any future policy tables
- Feature flags already default to `false` when missing

**For future modules**, follow the same pattern:
- Config/policy tables: use the `PolicyResult` pattern from `policyDefaults.ts`
- Feature flags: use `.maybeSingle()` + `?? false`
- Always add seed data in the migration that creates the table

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useActivePerformanceModule.ts` | `.single()` to `.maybeSingle()` + null fallback |
| `src/hooks/useOrderBasedDelivery.ts` | `.single()` to `.maybeSingle()` |
| `src/hooks/useD1Delivery.ts` | 3x `.single()` to `.maybeSingle()` |
| 1 database migration | Seed `feature_flags` + `performance_module_config` rows |

**Total: 3 files modified + 1 migration**

