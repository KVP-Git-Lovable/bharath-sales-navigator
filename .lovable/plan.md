## Give System Administrator full access to every permission in Security & Access

### Why it's currently broken

Prajwal → System Administrator profile (`98c1259e-…`) currently holds **531** permission rows, but only **7** of them start with `admin_`, and all 7 are `admin_attendance_*`. That's why `/admin-controls` only shows the Attendance Management card and every other admin route is blocked.

Root cause: the earlier restore migration seeded permissions by copying from the *union of other profiles*. The remaining profiles had almost no `admin_*` keys, so almost nothing was restored. The `auto_seed_system_admin_permissions` trigger only fires on new inserts into other profiles, so it doesn't backfill.

### What "full access" means here

The Security & Access UI builds its permission tree from two files:

- `src/components/security/hierarchicalPermissions.ts` → module / field / action / widget keys shown in the Hierarchical editor.
- `src/components/security/permissionModules.ts` → the flat legacy catalog used by the module editor and by `validatePermissions`.

The union of every key referenced by these two files is exactly what the UI can toggle. System Administrator should hold every one of those keys with all six flags = `true` (`can_read, can_create, can_edit, can_delete, can_view_all, can_modify_all`).

### Fix — one migration, no frontend changes

1. Build a `VALUES (...)` list containing every unique `object_name` (with its `permission_type` and `parent_module`) referenced by `hierarchicalPermissions.ts` + `permissionModules.ts`. This is generated once by scanning those two files locally and inlined into the migration so it is self-contained and reproducible.
2. For **every** profile where `is_system = true` (currently just System Administrator, but future-proof):
   ```sql
   INSERT INTO profile_object_permissions
     (profile_id, object_name, permission_type, parent_module,
      can_read, can_create, can_edit, can_delete, can_view_all, can_modify_all)
   SELECT sp.id, v.object_name, v.permission_type, v.parent_module,
          true, true, true, true, true, true
   FROM security_profiles sp
   CROSS JOIN (VALUES … full catalog … ) AS v(object_name, permission_type, parent_module)
   WHERE sp.is_system = true
   ON CONFLICT (profile_id, object_name, permission_type) DO UPDATE
     SET can_read = true, can_create = true, can_edit = true,
         can_delete = true, can_view_all = true, can_modify_all = true;
   ```
   The `ON CONFLICT ... DO UPDATE` flips any pre-existing row (including the 7 attendance ones) to fully permitted, and inserts every missing row.
3. Harden `auto_seed_system_admin_permissions` and add a matching `AFTER INSERT ON security_profiles` trigger so any future system profile that gets (re)created is automatically backfilled with the full permission set that currently exists in `profile_object_permissions`. That way another accidental delete + recreate self-heals.
4. In-migration verification: `RAISE` if `COUNT(*) FROM profile_object_permissions WHERE profile_id = '98c1259e-…' AND object_name LIKE 'admin_%' AND can_read` is less than the count of admin_* keys in the seeded catalog.

### After it runs

- Prajwal (and any other user still linked to this profile) hard-refreshes once — the 30-min React Query cache and localStorage permission cache clear, and every Admin Controls card + admin route becomes visible again.
- Any Field-, Action- and Widget-level permissions the UI relies on (visible in the Hierarchical editor tabs) also become allowed, so gated buttons/columns inside modules stop being hidden for System Administrator.

### Technical notes

- Only data + trigger changes; no changes to `useProfilePermissions.ts`, `AdminControls.tsx`, or any component.
- Uses `ON CONFLICT DO UPDATE` because the goal is "make sure everything is `true`", not just "insert if missing" — the previous restore left rows that were partially set.
- No destructive statements (`DELETE`, `TRUNCATE`) on `security_profiles`, `profile_object_permissions`, or `user_profiles`.
- Fully idempotent — safe to re-run.
