

## Problem Analysis

Currently, there are **two gaps** in the permission system:

1. **No auto-seeding for System Administrator**: When a new permission key is added to `permissionModules.ts` (or `hierarchicalPermissions.ts`) in a future code change, there is no mechanism to automatically insert the corresponding row into `profile_object_permissions` for the System Administrator profile. This means every new module/feature requires a manual DB migration.

2. **No developer guidance**: When someone asks in a prompt "why is this module not visible?", there's no built-in warning or documentation pattern to guide them to Security & Access.

## Plan

### 1. Database trigger: Auto-seed System Administrator on new permission insert

Create a PostgreSQL trigger function that fires **after INSERT** on `profile_object_permissions`. When any profile gets a new permission row, the trigger checks if a corresponding row already exists for the System Administrator profile (`is_system = true`). If not, it auto-inserts one with full access (`can_read`, `can_create`, `can_edit`, `can_delete` all `true`).

This ensures:
- System Administrator always gets new permissions automatically
- Other profiles must be manually configured via the Security & Access UI
- No hardcoded profile names -- uses `is_system = true`

### 2. Database trigger: Auto-cleanup on permission delete

Create a trigger that fires when a permission `object_name` is deleted from ALL profiles. If a permission key no longer exists for any non-system profile, the system admin row can optionally be cleaned up too. However, the safer approach is: when a profile is deleted, its `profile_object_permissions` rows are already cascade-deleted. No extra trigger needed for deletion since the FK constraint handles it.

### 3. Frontend: Permission sync utility on save

Enhance `ObjectPermissions.tsx` save flow: after saving permissions for any profile, call a sync function that reads all permission keys from the saved batch and ensures they exist for the System Administrator profile. This is a **belt-and-suspenders** approach alongside the DB trigger.

### 4. Frontend: Add visibility warning banner

Add a reusable warning component/pattern for pages gated by permissions. When a module page loads and the user lacks access (redirect to dashboard), show a toast or the redirect itself already handles this. The key improvement is in the **developer experience**: add a comment/convention in the codebase and a utility that logs a clear warning message in the console when a permission check fails, pointing to Security & Access.

### Technical Details

**Migration SQL (auto-seed trigger):**
```sql
CREATE OR REPLACE FUNCTION public.auto_seed_system_admin_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a permission is created for any profile, ensure the system admin profile also has it
  INSERT INTO profile_object_permissions (
    profile_id, object_name, permission_type, parent_module,
    can_read, can_create, can_edit, can_delete, can_view_all, can_modify_all
  )
  SELECT
    sp.id, NEW.object_name, NEW.permission_type, NEW.parent_module,
    true, true, true, true, true, true
  FROM security_profiles sp
  WHERE sp.is_system = true
    AND NOT EXISTS (
      SELECT 1 FROM profile_object_permissions pop
      WHERE pop.profile_id = sp.id
        AND pop.object_name = NEW.object_name
        AND pop.permission_type = NEW.permission_type
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_seed_system_admin
  AFTER INSERT ON profile_object_permissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_seed_system_admin_permissions();
```

**Frontend: Sync on profile creation** -- Update `ProfileManagement.tsx` `saveMutation.onSuccess`:
- After creating a new profile, no permissions are needed (empty by default)
- System Administrator already has all permissions via the trigger

**Frontend: Permission denied warning** -- Update the permission check redirect logic to show a toast:
```
"This module requires access. Enable it from Security & Access Control for your profile."
```
This toast will show on pages like `SecurityManagement.tsx`, `AdminControls.tsx`, and any module page that redirects due to missing permissions.

### Files to change

| Change | File |
|---|---|
| Database migration | New migration: auto-seed trigger |
| Permission denied toast | `src/pages/SecurityManagement.tsx` (and similar gated pages) |
| Reusable redirect component | New `src/components/security/PermissionRedirect.tsx` -- replaces raw `<Navigate>` with a toast + redirect |
| Console warning utility | Update `src/utils/permissionValidator.ts` to log actionable guidance |

### Summary
- DB trigger auto-seeds System Administrator (using `is_system = true`, no hardcoding)
- Other profiles stay empty by default -- manual configuration only
- Permission-denied redirects show a clear toast warning pointing to Security & Access
- No hardcoded profile names anywhere

