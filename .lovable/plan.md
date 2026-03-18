

## Audit: Fully Dynamic Permission System — Current State & Required Changes

### What's Already Done (Working Correctly)

1. **`useProfilePermissions` hook** — Already 100% DB-driven. Reads from `profile_object_permissions` via `user_profiles` join. No hardcoded admin bypass.
2. **`useAdminAccess` hook** — Already derives `hasAdminAccess` purely from `hasAnyAdminPermission` (DB-driven).
3. **`RoutePermissionGuard`** — DB-driven with prefix matching. Comment explicitly states "No special admin bypass."
4. **Admin login validation** — Checks `profile_object_permissions` for `admin_%` + `can_read`, not profile name.
5. **Hierarchical permission model** — `hierarchicalPermissions.ts` defines 840+ lines of Module → Field → Action → Widget items, all stored in DB.
6. **Dashboard (`Index.tsx`)** — Uses `hasModuleAccess`, `hasFieldPermission`, `hasWidgetPermission`, `hasActionPermission` — all DB-driven.

### What Still Has Issues (5 areas)

---

**Issue 1: System Administrator auto-grant bypass in ObjectPermissions.tsx (Security UI)**

Lines 99-113: When editing the "System Administrator" profile, `getPermissionValue()` returns `true` for ALL permissions regardless of what's actually in DB. This means:
- The UI *shows* all checkboxes as checked
- But if those permissions aren't actually *saved* to DB, the runtime hook won't find them
- This is a display-only bypass that masks missing DB rows

**Fix:** Remove the `isSystemAdministrator` auto-grant logic in `getPermissionValue()`. Show actual DB state. When creating a System Administrator profile, provide a "Grant All" button that actually writes all permissions to DB.

---

**Issue 2: `!securityProfileName` bypass (backward compat) in 4 files**

These files grant full access when no security profile is assigned:
- `RoutePermissionGuard.tsx` — `if (!securityProfileName) return <>{children}</>`
- `SecurityManagement.tsx` — `if (securityProfileName && !hasModuleAccess(...))`
- `PermissionSetPage.tsx` — same pattern
- `Index.tsx` — `canShow()` returns true when `!hasSecurityProfile`

This means any user without a profile assignment sees everything. For a fully DB-driven system, every user should have a profile.

**Fix:** Remove the `!securityProfileName` bypass. Instead, treat "no profile" as "no permissions" (deny by default). Add a migration/seed step to ensure all existing users have a profile assigned.

---

**Issue 3: `userRole === 'admin'` check in CompetencyAdmin.tsx**

Line 123: `if (userRole !== 'admin')` — uses the legacy `user_roles` table role instead of profile permissions.

**Fix:** Replace with `useAdminAccess()` or `useProfilePermissions()` check for the relevant admin permission key.

---

**Issue 4: `userRole` still exposed and used from `useAuth`**

`useAuth.tsx` still fetches `userRole` from `user_roles` table (line 79-97) and exposes it. Several components import it. While `useAdminAccess` no longer uses it for access decisions, its presence invites misuse.

**Fix:** Keep `userRole` for now (used in ~5 non-security contexts like UserHierarchy display) but add a deprecation comment. Ensure no access-control decisions use it.

---

**Issue 5: Missing validation layer for permission key mismatches**

The UI checks keys like `widget_homepage_sales`, `field_homepage_greeting`, `action_homepage_quick_add` — but if these don't exist in DB for a profile, features silently disappear. No warning or detection.

**Fix:** Add a dev-mode validation utility that compares all permission keys defined in `hierarchicalPermissions.ts` and `permissionModules.ts` against actual DB rows for the current user's profile. Log warnings for any UI-referenced key not found in DB.

---

### Implementation Plan (5 tasks)

**Task 1: Remove System Administrator auto-grant in ObjectPermissions.tsx**
- Delete lines 99-113 (`isSystemAdministrator` + auto-grant logic)
- Add a "Select All" button that writes actual DB rows when toggled
- Ensures System Admin permissions are real DB entries, not phantom UI values

**Task 2: Remove `!securityProfileName` bypass (4 files)**
- `RoutePermissionGuard.tsx`: Remove the early return on line 35; treat no-profile as deny
- `SecurityManagement.tsx`: Remove the `securityProfileName &&` condition
- `PermissionSetPage.tsx`: Same
- `Index.tsx`: Change `canShow()` to always check DB permissions

**Task 3: Fix CompetencyAdmin.tsx hardcoded role check**
- Replace `userRole !== 'admin'` with `useProfilePermissions().hasModuleAccess('admin_competency_')` or equivalent

**Task 4: Add dev-mode permission validation utility**
- Create `src/utils/permissionValidator.ts`
- On app load (dev only), compare all known permission keys from `hierarchicalPermissions.ts` + `permissionModules.ts` against the user's actual DB permissions
- Log warnings like: `⚠️ Permission key "widget_homepage_sales" referenced in UI but not found in DB for current profile`

**Task 5: Deprecate `userRole` in useAuth for access control**
- Add deprecation comment on `userRole` in `useAuth.tsx`
- Audit remaining `userRole` usages — ensure none are used for access gating (except CompetencyAdmin, fixed in Task 3)

### Files Changed
- `src/components/security/ObjectPermissions.tsx` — remove auto-grant
- `src/components/auth/RoutePermissionGuard.tsx` — remove no-profile bypass
- `src/pages/SecurityManagement.tsx` — remove conditional check
- `src/pages/PermissionSetPage.tsx` — remove conditional check  
- `src/pages/Index.tsx` — enforce DB-only permission checks
- `src/pages/CompetencyAdmin.tsx` — replace `userRole` check
- `src/hooks/useAuth.tsx` — deprecation comment
- `src/utils/permissionValidator.ts` — new file, dev-mode validation

### Important Prerequisite
Before removing the `!securityProfileName` bypass, **all existing users must have a security profile assigned**. Otherwise they'll be locked out. This requires either:
- A DB migration that assigns a default profile to users without one, OR
- An admin action to bulk-assign profiles before deploying this change

