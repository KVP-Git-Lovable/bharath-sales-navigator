

## Validation Report: Permission-Based Access Control (PBAC) Architecture

### 1. Hidden Features for System Administrator -- FIXED (with 1 remaining issue)

**Status: MOSTLY RESOLVED**

- All ~249+ permission objects seeded in `profile_object_permissions` for System Administrator
- Prefix mismatches fixed with `ADMIN_MODULE_SUB_PREFIXES`
- Missing path mappings added to `ADMIN_MODULE_PERMISSION_MAP`
- Feature flags enabled for Gamification, Packing List, Deliveries

**Remaining issue**: `UserObjectPermissions.tsx` still exists and reads from `user_object_permissions` table. This is a per-user override layer. The plan said this was removed, but the component and table still exist.

---

### 2. Security and Access Control as Single Source of Truth -- 3 violations found

**Status: 3 HARDCODED GATES REMAIN**

| Location | Violation | Fix |
|----------|-----------|-----|
| `src/pages/VanSalesManagement.tsx:772` | `securityProfileName === 'System Administrator'` controls UserSelector visibility | Replace with `canViewAll` from `hasPermission('admin_van_sales', 'can_view_all')` (already partially done on line 113) |
| `supabase/functions/chat-assistant/index.ts:92` | `security_profiles.name === 'System Administrator'` sets `isAdmin` flag | Replace with `profile_object_permissions` check for relevant admin objects |
| `src/components/security/UserObjectPermissions.tsx` | Component reads from `user_object_permissions` table (per-user override layer) | Either remove entirely or keep as deliberate override feature |

The `RolePermissionsTab.tsx` and `ObjectPermissions.tsx` references to `SYSTEM_ADMINISTRATOR_PROFILE` are acceptable -- they auto-grant all permissions in the management UI (visual convenience, not an access gate).

---

### 3. Role Permissions (View / Create / Edit / Delete) -- CORRECT

**Status: WORKING**

- Frontend uses `hasPermission(objectName, 'can_read'|'can_create'|'can_edit'|'can_delete')` consistently
- All 9 edge functions check `profile_object_permissions` with specific object names and action flags
- No edge function uses `has_role` or `is_system_admin` for authorization (only DB functions do, which is separate)
- `RoutePermissionGuard` checks `can_read` via `hasModuleAccess(prefix)`

---

### 4. Permission Set Groups (Per-User Overrides) -- Decision needed

**Status: TABLE EXISTS BUT NOT ENFORCED**

The `user_object_permissions` table and `UserObjectPermissions.tsx` component still exist. However, they are NOT checked anywhere in the access control flow:
- `useProfilePermissions.ts` only reads from `profile_object_permissions`
- Edge functions only check `profile_object_permissions`
- No code merges user-level overrides with profile-level permissions

**Decision point**: This is currently dead code. Either:
- Remove it (cleaner, true single source of truth)
- Wire it in (more flexible, but adds complexity)

---

### 5. Manager Hierarchy (Team Data Visibility) -- CORRECT

**Status: SAFE AND INDEPENDENT**

- Manager hierarchy uses `employees.manager_id` and `get_all_subordinates()` DB function
- Team data visibility is controlled by RLS policies and reporting structure
- Does NOT use profile name checks
- Fully independent from the permission refactor

---

### 6. Database Function Audit -- 2 legacy patterns found

| Function | Issue | Risk |
|----------|-------|------|
| `is_system_admin()` | Checks `security_profiles.name = 'System Administrator'` | Used by `can_view_profile`, `can_view_employee`, `pm_is_project_member`, `get_database_metrics` -- these are RLS/DB-level gates that bypass the PBAC model |
| `has_role(_, 'admin')` | Redirects to `is_system_admin()` check | Used in `can_access_object`, `get_profiles_for_selector`, `list_team_members`, RLS policies |

These DB functions provide a safety net at the database layer. They are acceptable as a defense-in-depth measure since they grant access to System Administrators at the data level, not the UI level. However, they do mean "System Administrator" profile name is still significant in the DB layer.

---

### Summary

| Check | Status | Action Needed |
|-------|--------|---------------|
| No hidden features for System Admin | FIXED | None |
| Single source of truth | 3 violations | Fix VanSales + chat-assistant hardcoded checks |
| Role permissions (CRUD flags) | CORRECT | None |
| Per-user overrides | Dead code | Decide: remove or wire in |
| Manager hierarchy | CORRECT | None |
| DB functions | Legacy patterns | Acceptable as defense-in-depth |

### Proposed Fixes (3 changes)

**File 1: `src/pages/VanSalesManagement.tsx` (line 772)**
Replace `securityProfileName === 'System Administrator'` with the existing `canViewAll` variable (already computed on line 113).

**File 2: `supabase/functions/chat-assistant/index.ts` (line 92)**
Replace `security_profiles.name === 'System Administrator'` with a `profile_object_permissions` check for any `admin_` prefixed object.

**File 3 (optional): `src/components/security/UserObjectPermissions.tsx`**
Remove component and related dead code if per-user overrides are not wanted.

