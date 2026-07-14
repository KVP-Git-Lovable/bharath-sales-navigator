## Root cause

The Analytics page hides its three tabs when the current user's security profile does not have `can_read` on these keys:

- `analytics_business_summary` (Productivity tab)
- `analytics_order_details` (Target tab)
- `analytics_product_breakdown` (Products tab)

DB check for the System Administrator profile (`98c1259e-…`) confirms **none of these keys exist** in `profile_object_permissions`. Same for every other profile:

```
System Administrator: total=675, admin_read=144, analytics_read=0
Sales Manager:        total=675, admin_read=144, analytics_read=0
Field Sales Executive:total=675, admin_read=144, analytics_read=0
```

Only the hierarchical variants exist (`widget_analytics_*`, `field_analytics_*`, `action_analytics_*`, `module_analytics`). The bare sub-feature keys defined in `src/components/security/permissionModules.ts` (e.g. `analytics_business_summary`, `analytics_beat_details`, `analytics_order_details`, `analytics_product_breakdown`, `analytics_pending_payments`, `analytics_user_filter`, `analytics_date_range_picker`, `analytics_performance_calendar`, `analytics_leaderboard`) were never included in the earlier reseed migration (`20260714110117…`) — that migration only enumerated the hierarchical catalog.

Because `hasFeaturePermission('analytics_business_summary','can_read')` returns `false`, all three tabs are hidden and the Analytics page appears "empty" for System Administrator (and by extension for other system profiles).

Why it worked "before deletion": the previous System Administrator row was created interactively via the Permissions UI, which inserts flat `permissionModules.ts` keys. The auto-restore only copied whatever keys existed at that time in other profiles — none of which had the flat analytics keys either — so they never came back.

## Fix

One idempotent migration that:

1. Builds a catalog of the flat sub-feature keys from `permissionModules.ts` that the app checks but the DB is missing. Scope of the seed:
   - Every sub-feature listed under every module in `permissionModules.ts` (analytics, admin_*, retailers, my_beats, orders, invoices, my_visit, gps_track, expenses, leave, targets, gamification, ai_assistant, coach, project_mgmt, competition, distributor_*, etc.), plus the top-level module keys themselves (e.g. `analytics`, `retailers`, `orders`).
   - Insert `permission_type='sub_feature'` (or `'module'` for top-level) and appropriate `parent_module`.
2. `INSERT … SELECT` for every `security_profiles` row with `is_system = true`, setting all six flags (`can_read, can_create, can_edit, can_delete, can_view_all, can_modify_all`) to `true`.
3. `ON CONFLICT (profile_id, object_name) DO UPDATE SET can_read = true` — guarantees existing partial rows are widened, never narrowed.
4. Post-insert assertion:
   ```sql
   SELECT COUNT(*) FROM profile_object_permissions
   WHERE profile_id = '98c1259e-0368-4e1a-a4e8-01e173cbfb10'
     AND object_name IN (
       'analytics_business_summary',
       'analytics_order_details',
       'analytics_product_breakdown'
     ) AND can_read;
   ```
   `RAISE EXCEPTION` if it is not 3.

No frontend changes. Fully idempotent, safe to re-run, no destructive statements.

## After it runs

Prajwal (and any other System Administrator user) must **hard-refresh once** — the `useProfilePermissions` cache is 30 minutes and permissions are also kept in `localStorage`. After refresh the Productivity, Target, and Products tabs and their widgets appear again.

## Prevent recurrence

The existing `trg_backfill_system_profile` (AFTER INSERT on `security_profiles`) already seeds the hierarchical catalog. Extend the same trigger function to also seed the flat sub-feature catalog so any future recreation of a system profile carries both key sets. This is a `CREATE OR REPLACE FUNCTION` — no schema break.

## Files touched

- `supabase/migrations/<new>_seed_missing_subfeature_permissions.sql` (new)

No `.ts`/`.tsx` files change.
