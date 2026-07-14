
## What I found

**Prajwal C** (`d63ecc6f-4ef4-468b-a237-7a6617bb7cdd`) has a row in `public.user_profiles` pointing at `profile_id = 98c1259e-0368-4e1a-a4e8-01e173cbfb10`, but that security profile **no longer exists** in `public.security_profiles`.

Current `security_profiles` table only contains:
- Sales Manager
- Field Sales Executive
- Product Manager

The **System Administrator** profile is gone. That is why the dashboard shows *"No Permissions Assigned"* — the permissions query joins through `user_profiles → profile_id → profile_object_permissions` and finds nothing.

### How & when it was deleted

- `user_profiles.profile_id` has **no foreign key** to `security_profiles`, so deleting a profile did not cascade or block — it just orphaned the user rows.
- **8 users total** are currently orphaned on this same missing profile id (not just Prajwal), so this is one bulk deletion event, not a per-user mistake.
- There is **no audit trail** of the deletion:
  - `destructive_audit_log` has zero rows for `table_name = 'security_profiles'`
  - `recycle_bin` and `permanent_deletion_log` have no entry for id `98c1259e-…` or for `original_table = 'security_profiles'`
- Conclusion: the profile was deleted directly (either via the Security & Access Control UI's "Delete profile" action, which does a hard delete and does not write to the destructive audit / recycle bin, or via a direct SQL/admin action). We cannot pinpoint the exact user or timestamp because nothing was logged. Going forward this should be fixed (see step 4 below).

## Fix plan (single migration)

1. **Recreate the profile in place** — re-insert `security_profiles` with the same id `98c1259e-0368-4e1a-a4e8-01e173cbfb10`, `name = 'System Administrator'`, `is_system = true`. Using the same id automatically re-links Prajwal and the other 7 orphaned users; no `user_profiles` updates needed.
2. **Seed full permissions** — bulk `INSERT` into `profile_object_permissions` one row per distinct `(object_name, permission_type, parent_module)` currently referenced by any other profile, all flags = `true`, for `profile_id = 98c1259e-…`. This matches what the existing `auto_seed_system_admin_permissions` trigger would do for future new permission keys.
3. **Verification query** — after the migration, confirm Prajwal's join returns >0 rows and dashboard access is restored.
4. **Prevent recurrence** (recommended, small follow-up):
   - Block delete of any `is_system = true` profile in the RLS/policy or via a `BEFORE DELETE` trigger that raises an exception.
   - Add an `AFTER DELETE` trigger on `security_profiles` that logs the deleted row into `destructive_audit_log` so we always know who/when.
   - Optionally add a real FK `user_profiles.profile_id → security_profiles(id) ON DELETE RESTRICT` so orphaning becomes impossible.

## Technical details

```sql
-- 1. Recreate the deleted profile with its original id
INSERT INTO public.security_profiles (id, name, description, is_system)
VALUES (
  '98c1259e-0368-4e1a-a4e8-01e173cbfb10',
  'System Administrator',
  'Full access to all modules and administrative features',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed every known permission with full flags
INSERT INTO public.profile_object_permissions (
  profile_id, object_name, permission_type, parent_module,
  can_read, can_create, can_edit, can_delete, can_view_all, can_modify_all
)
SELECT DISTINCT
  '98c1259e-0368-4e1a-a4e8-01e173cbfb10',
  object_name, permission_type, parent_module,
  true, true, true, true, true, true
FROM public.profile_object_permissions
WHERE profile_id <> '98c1259e-0368-4e1a-a4e8-01e173cbfb10'
ON CONFLICT DO NOTHING;
```

No frontend code changes are required — the permission hook (`useProfilePermissions`) already reads from these tables and caches the result. Prajwal will get his access back on next login / cache refresh.
