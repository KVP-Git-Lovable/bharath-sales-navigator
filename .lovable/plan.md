

## Centralize All Permission Control to Security Profiles

### Current Problem

Admin access is determined from **two independent sources**, creating confusion:
1. `user_roles.role = 'admin'` (legacy table)
2. `security_profiles.name = 'System Administrator'` (Security & Access Control module)

Currently, Abhishek KP has `role = 'admin'` in `user_roles` but **no security profile assigned at all**, yet gets full admin access everywhere.

### Current State Audit

| Layer | Count | Uses `user_roles.role = 'admin'` |
|-------|-------|----------------------------------|
| Frontend hooks/pages | 9 files | `userRole === 'admin'` checks |
| Edge functions | 5 functions | `roleData?.role === 'admin'` checks |
| Database RLS policies | **193 policies** | `has_role(auth.uid(), 'admin')` |
| Database functions | ~10 functions | `has_role(...)`, `is_system_admin(...)` |

| User | Current Role | Security Profile |
|------|-------------|-----------------|
| Abhishek KP | admin | None assigned |
| Prabhu KVP | user | System Administrator |
| Satyaprakash | user | Sales Manager |
| Others | user | Data Viewer / Field Sales Executive |

### Strategy: Modify `is_system_admin()` and `has_role()` at the Database Level

Rather than updating 193+ RLS policies individually, the most efficient and safe approach is:

1. **Update the `is_system_admin()` function** to check ONLY security profiles (not `user_roles`)
2. **Update the `has_role()` function** so that `has_role(uid, 'admin')` checks security profiles instead of `user_roles`
3. **Update frontend hooks** to derive admin status from `securityProfileName` only
4. **Update edge functions** to check security profiles instead of `user_roles`
5. **Migrate Abhishek KP** to the System Administrator security profile
6. **Remove admin role** from `user_roles` for Abhishek KP

This way, all 193 RLS policies continue to work without any modification -- they still call `has_role()` and `is_system_admin()`, but those functions now look at security profiles.

### Detailed Changes

#### Phase 1: Database Migration

**1a. Update `is_system_admin()` function:**
Remove the `user_roles` check, keep only the security profile check.

```text
Before:
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin')
  OR EXISTS (SELECT 1 FROM user_profiles up JOIN security_profiles sp ...)

After:
  SELECT EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN security_profiles sp ON sp.id = up.profile_id
    WHERE up.user_id = _user_id AND sp.name = 'System Administrator'
  )
```

**1b. Update `has_role()` function:**
When checking for `'admin'` role, redirect to security profile check instead of `user_roles`.

```text
Before:
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)

After:
  -- For 'admin' role, check System Administrator security profile
  IF _role = 'admin' THEN
    SELECT EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN security_profiles sp ON sp.id = up.profile_id
      WHERE up.user_id = _user_id AND sp.name = 'System Administrator'
    )
  ELSE
    -- Keep existing behavior for non-admin roles
    SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)
  END IF
```

**1c. Migrate Abhishek KP's data:**
- Assign "System Administrator" security profile to Abhishek KP (user_id: `6be7e2ff-...`)
- Change his `user_roles.role` from `'admin'` to `'user'`

#### Phase 2: Frontend Changes (4 files)

**2a. `src/hooks/useAuth.tsx`:**
- Remove `fetchUserRole()` dependency on admin/user distinction for access control
- Keep `userRole` state but derive admin status purely from `securityProfileName`
- Update `signIn()` to check security profile instead of `user_roles` for admin login validation
- Remove the admin login role check (`if (role === 'admin' && userRole !== 'admin')`) or replace it with a security profile check

**2b. `src/hooks/useAdminAccess.ts`:**
- Change `isFullAdmin` from `userRole === 'admin' || securityProfileName === 'System Administrator'` to just `securityProfileName === 'System Administrator'`

**2c. `src/hooks/useFeatureFlags.ts`:**
- Same change: `isFullAdmin = securityProfileName === 'System Administrator'`

**2d. Pages with direct `userRole === 'admin'` checks (6 files):**
- `SecurityManagement.tsx`, `PermissionSetPage.tsx`: Replace with `securityProfileName === 'System Administrator'`
- `Vendors.tsx`, `CompetitorDetail.tsx`, `CompetitionMaster.tsx`: Replace admin checks with `useAdminAccess().isFullAdmin` or permission-based checks
- `TodaySummary.tsx`: Replace `userRole === 'admin'` with `isFullAdmin` from `useAdminAccess`
- `AdminDashboard.tsx`: Remove "Make Admin" / "Make User" role toggle UI, replace with security profile assignment

#### Phase 3: Edge Functions (5 functions)

Update the admin check in each edge function to query `security_profiles` instead of `user_roles`:

- `admin-create-user/index.ts`
- `admin-get-users/index.ts`
- `admin-delete-user/index.ts`
- `admin-delete-user-data/index.ts`
- `admin-login-as-user/index.ts`
- `admin-reset-password/index.ts`

Each will replace:
```text
const { data: roleData } = await supabaseAdmin
  .from('user_roles').select('role').eq('user_id', userId).single()
const isAdmin = roleData?.role === 'admin'
```
With:
```text
const { data: profileData } = await supabaseAdmin
  .from('user_profiles')
  .select('profile_id, security_profiles(name)')
  .eq('user_id', userId).single()
const isAdmin = (profileData as any)?.security_profiles?.name === 'System Administrator'
```

#### Phase 4: Auth Login Flow

- Remove the "Admin" vs "User" role selection on the login page (`RoleBasedAuthPage.tsx`)
- All users log in through the same flow; the system determines access level from their assigned security profile
- OR keep the admin login option but validate against security profile instead of `user_roles`

### What Stays Unchanged

- The `user_roles` table itself is NOT deleted (it may still serve non-admin role purposes)
- All 193 RLS policies remain untouched (they call `has_role()` which is updated)
- All 25 policies using `is_system_admin()` remain untouched
- The `security_profiles` table, `user_profiles` table, and `profile_object_permissions` table remain as-is
- The `RoutePermissionGuard` component remains as-is

### Risk Mitigation

- The `has_role()` function change is backward-compatible: it only redirects the `'admin'` role check to security profiles
- Abhishek KP gets migrated to System Administrator profile BEFORE the role is changed, ensuring no gap in access
- All edge functions are updated to use the same single source of truth

### Expected Outcome

After implementation:
- Only users with **"System Administrator" security profile** get full admin access
- `user_roles` no longer controls admin privileges
- All permissions flow through Security & Access Control
- Every user must have a security profile assigned for proper access control

