

## Fix: Show Admin Panel Based on Profile Permissions

### Problem
The Admin Panel visibility is hardcoded to only show for users with `role = 'admin'` or `securityProfileName = 'System Administrator'`. Even though the Product Manager profile has been granted specific admin permissions (e.g., Attendance Management), those permissions are completely ignored when determining whether to show the Admin Panel.

### Solution
Update the access control logic so that any user whose security profile has at least one `admin_*` permission granted in the `profile_object_permissions` table can see the Admin Panel -- but they will only see the specific admin modules they have access to.

### Changes

**1. New hook: `src/hooks/useProfilePermissions.ts`**
- Fetches the user's profile permissions from `profile_object_permissions` (and `user_object_permissions` for overrides)
- Returns a `hasAnyAdminPermission` boolean (true if any `admin_*` object has `can_read = true`)
- Returns a `hasPermission(objectName)` function to check specific permissions
- Returns a list of permitted admin feature names for filtering modules
- Caches results to avoid repeated queries

**2. Update `src/hooks/useAdminAccess.ts`**
- In addition to the current admin/System Administrator check, also check `hasAnyAdminPermission` from the new hook
- A user gets admin access if: `userRole === 'admin'` OR `securityProfileName === 'System Administrator'` OR they have any `admin_*` permissions granted

**3. Update `src/components/Navbar.tsx`**
- Use the updated `useAdminAccess` to determine Admin Controls visibility
- The Admin Controls link will now appear for users like Girish (Product Manager) who have specific admin permissions

**4. Update `src/pages/AdminControls.tsx`**
- Use the updated access check so non-admin users with profile permissions can access the page
- Filter `adminModules` to only show modules the user has permission for
- Map each admin module to its corresponding permission feature names (e.g., "Attendance Management" maps to `admin_attendance_mgmt` and its sub-features)
- Full admins and System Administrators continue to see all modules

**5. Update individual admin pages (e.g., AttendanceManagement, etc.)**
- Update `useAdminAccess` or add permission checks so that pages granted via profile permissions are accessible
- Users without specific module permission still get redirected

### Permission Mapping
Each admin module card in AdminControls will be mapped to its permission feature name from `permissionModules.ts`:

```text
Admin Dashboard        -> admin_dashboard
Price Book Management  -> admin_price_book
Attendance Management  -> admin_attendance_mgmt
Product Management     -> admin_product_mgmt
Scheme Master          -> admin_scheme_master
... (and so on for all 25+ modules)
```

A module card shows if the user has `can_read = true` on ANY sub-feature under that module's feature group, OR if they are a full admin/System Administrator.

### How It Works (for Girish as Product Manager)

1. Girish logs in -- `securityProfileName` = "Product Manager", `userRole` = "user"
2. New hook queries `profile_object_permissions` for his profile and finds `admin_attendance_*` permissions with `can_read = true`
3. `hasAnyAdminPermission` = true, so Admin Controls link appears in navigation
4. On AdminControls page, only "Attendance Management" card (and any other granted modules) are shown
5. Girish can access `/attendance-management` because he has the relevant permissions

### Technical Notes
- The permission check query is lightweight (single query joining `user_profiles` + `profile_object_permissions`)
- Results are cached via React Query to avoid repeated fetches
- Full admins and System Administrators bypass all permission checks and see everything (no behavior change for them)
- Individual page access checks are updated to respect profile permissions, preventing URL-based bypass

