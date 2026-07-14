## What the error means

The red toast `Failed to fetch users: Edge Function returned a non-2xx status code` is coming from the `admin-get-users` edge function returning **HTTP 403 – "You do not have permission to view users"** (see `runtime-errors` block).

That function's gate (verified in `supabase/functions/admin-get-users/index.ts` lines 53–77) is exactly one check:

```
SELECT can_read FROM profile_object_permissions
WHERE profile_id = <caller's user_profiles.profile_id>
  AND object_name = 'admin_user_list'
  AND can_read = true
```

If the row is missing / `can_read` is false, the function returns 403.

## Why it happened

Same root cause as the Analytics tabs: the reseed after the System Administrator delete only included the **hierarchical** permission catalog (`widget_*`, `field_*`, `action_*`, `module_*`). The **flat sub-feature keys** from `permissionModules.ts` — including `admin_user_list`, `admin_user_create`, `admin_user_edit`, `admin_user_delete`, `admin_user_activate_deactivate`, `admin_user_reset_password`, `admin_user_hierarchy`, `admin_approver_management`, `admin_security_roles_display` — were not seeded, so the edge function's `admin_user_list` check fails with 403.

DB confirms: caller (Abhishek Pai, and every other System-Administrator user like Girish, Kumar, Prajwal C) has `user_profiles.profile_id = 98c1259e-…` = System Administrator profile.

## Fix status

The migration we just ran (Analytics fix) seeded the full flat sub-feature catalog — **271 keys, including all `admin_user_*` keys** — into every `is_system = true` profile with all six flags = `true`. So the DB is already correct.

## What still needs to happen

Nothing on the DB or code side. The 403 you see is from before the migration finished. Two things to do:

1. **Hard refresh** the browser (or log out / log in). This clears the 30-min `useProfilePermissions` cache and forces the edge function to be called again — it will now find `admin_user_list = true` and return the user list.
2. Confirm the user list renders on `/admin#users`.

## If it still 403s after hard-refresh (contingency)

Only if step 1 doesn't fix it, I'll:
- Query `profile_object_permissions` for the exact `(profile_id, 'admin_user_list')` row to confirm `can_read = true`.
- Check `edge_function_logs` for the specific 403 line to see whether the caller's `profile_id` is actually the seeded one.
- Extend the gate in `admin-get-users` to also accept `public.is_system_admin(caller.id)` as a bypass (matches the standard `is_system_admin` pattern used elsewhere in the app), so a system-admin never gets blocked by a missing sub-feature key.

## Files touched

None yet — this is a verify-and-refresh step. Only the contingency above would touch `supabase/functions/admin-get-users/index.ts`.
