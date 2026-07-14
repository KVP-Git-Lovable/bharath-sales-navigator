# Restore `profile_object_permissions` from the uploaded backup

## What we have
- Uploaded file `profile_object_permissions_rows.sql` — a single `INSERT ... VALUES (...), (...), ...` with **~2,473 rows** and all 12 columns of the original schema. Timestamps range back to 2026-03-18, so this is a full pre-loss snapshot.
- `security_profiles` (3 system + 1 custom) and `user_profiles` (28 rows) are intact — profile_ids in the backup will resolve.

## Fix (two steps)

### Step 1 — Migration: recreate the table + RLS + trigger
Idempotent SQL:
1. `CREATE TABLE IF NOT EXISTS public.profile_object_permissions` with:
   - `id uuid pk default gen_random_uuid()`
   - `profile_id uuid REFERENCES security_profiles(id) ON DELETE CASCADE`
   - `object_name text not null`
   - `permission_type text not null default 'sub_feature'`
   - `parent_module text`
   - six boolean flags default false
   - `created_at timestamptz default now()`
   - `UNIQUE (profile_id, object_name, permission_type)` (matches the `ON CONFLICT` used by prior migrations)
2. `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated; GRANT ALL ... TO service_role;`
3. `ENABLE ROW LEVEL SECURITY` and re-create the two original policies:
   - `SELECT`: caller's `user_profiles.profile_id = profile_object_permissions.profile_id`, OR `public.is_system_admin(auth.uid())`.
   - `ALL` (write): only `public.is_system_admin(auth.uid())`.
4. Re-create the `backfill_system_profile_permissions` trigger on `security_profiles` (same body as migration `20260714110117…`).

### Step 2 — Data restore from the uploaded backup
Using the insert-data tool, run the uploaded `INSERT` verbatim with:
```
INSERT INTO public.profile_object_permissions (...) VALUES ...
ON CONFLICT (profile_id, object_name, permission_type) DO UPDATE SET
  can_read = EXCLUDED.can_read, can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit, can_delete = EXCLUDED.can_delete,
  can_view_all = EXCLUDED.can_view_all, can_modify_all = EXCLUDED.can_modify_all,
  parent_module = EXCLUDED.parent_module;
```
- The `id` PK column is included in the backup — we'll keep it (avoids ID churn for anything that referenced these rows).
- If the raw `INSERT` payload exceeds one tool call, we'll split into a couple of `VALUES` batches — no schema changes, purely data.

### Step 3 — Verify + safety-net
After the restore, in the same insert call:
- `SELECT COUNT(*)` per system profile — expect the three system profiles (`System Administrator`, `Sales Manager`, `Field Sales Executive`) to have hundreds of rows each.
- Re-run the small catalog seed from migration `20260714111408…` (271 flat sub-feature keys) with `ON CONFLICT DO UPDATE ... = true` — cheap belt-and-braces that guarantees `admin_user_list`, `admin_dashboard`, `analytics_*`, etc. exist for every system profile even if the backup was slightly stale.

## After it runs
- Ask affected users to hard-refresh once — clears the 30-min `useProfilePermissions` cache and the localStorage snapshot; login and dashboards render immediately.
- No app code changes needed.

## Files touched
- New: `supabase/migrations/<ts>_restore_profile_object_permissions_table.sql` (schema + RLS + trigger only)
- No file edits; data restored via the insert-data tool from the uploaded backup.
