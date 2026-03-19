

## Problem Statement

You want **zero hardcoded profile-name dependencies** in the system. Any profile except "System Administrator" should be deletable, and no code or database function should grant special privileges based on a profile's name string. Currently there are two categories of hardcoded references:

### Category 1: Database — `is_system_admin()` function (Critical)
The function `is_system_admin(_user_id)` checks `sp.name = 'System Administrator'` and is used in **20+ RLS policies** across the entire database. This is the main hardcoded gate.

**Fix:** Change `is_system_admin()` to check `sp.is_system = true` instead of `sp.name = 'System Administrator'`. This way:
- The function still works for RLS policies
- It's tied to the `is_system` flag (a database property), not a name string
- Only the System Administrator profile has `is_system = true`, and `ProfileManagement.tsx` already prevents deleting profiles where `is_system = true`

Similarly, `has_role()` for `'admin'` also checks `sp.name = 'System Administrator'` — same fix.

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    JOIN public.security_profiles sp ON sp.id = up.profile_id
    WHERE up.user_id = _user_id AND sp.is_system = true
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _role = 'admin'::app_role THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.security_profiles sp ON sp.id = up.profile_id
      WHERE up.user_id = _user_id AND sp.is_system = true
    );
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;
```

### Category 2: Frontend — Cosmetic name references (Low risk)
These are non-blocking, cosmetic uses:

| File | Usage | Fix |
|---|---|---|
| `permissionModules.ts` | `SYSTEM_ADMINISTRATOR_PROFILE` constant + comment | Remove constant, update comment |
| `SecurityRolesDisplay.tsx` | `roleColors` map with profile name keys | Make colors dynamic based on `is_system` flag or use a generic fallback |
| `UserHierarchy.tsx` | `roleColorMap` + hierarchy root detection using `role_name === 'System Administrator'` | Use `is_system` flag from profile data instead of name matching |

### What stays protected
- `ProfileManagement.tsx` already blocks deletion of `is_system` profiles — no change needed
- The `is_system` column on `security_profiles` is the single source of truth for the undeletable System Administrator

### Summary of Changes

1. **Database migration** — Update `is_system_admin()` and `has_role()` to use `is_system = true` instead of name matching
2. **`permissionModules.ts`** — Remove `SYSTEM_ADMINISTRATOR_PROFILE` constant
3. **`SecurityRolesDisplay.tsx`** — Replace hardcoded name-to-color map with `is_system`-based styling + generic fallback
4. **`UserHierarchy.tsx`** — Replace `role_name === 'System Administrator'` check with `is_system` flag from profile data

