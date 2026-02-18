

## Add Profile Management Tab to Security & Access Control

### What's Missing

The `ProfileManagement` component already exists in the codebase (`src/components/security/ProfileManagement.tsx`) with full CRUD functionality (create, edit, delete profiles), but it is **not rendered anywhere**. The Security Management page only shows two tabs: "Role Permissions" and "Permission Set Groups".

### Current Permission Data Status

| Profile | Users Assigned | Permissions Configured |
|---------|---------------|----------------------|
| Data Viewer | 5 | 52 |
| Field Sales Executive | 1 | 0 |
| Product Manager | 0 | 0 |
| Sales Manager | 1 | 0 |
| System Administrator | 2 | 0 (auto-granted in code) |

The linkage between profiles and permissions works correctly -- the `RolePermissionsTab` reads and saves to `profile_object_permissions` using `profile_id`. System Administrator gets all permissions auto-granted in the frontend code regardless of database records.

### The Fix

**File: `src/pages/SecurityManagement.tsx`**

Add a third tab called "Profiles" that renders the existing `ProfileManagement` component:

1. Import `ProfileManagement` from `@/components/security/ProfileManagement`
2. Add a `UserCog` icon import from lucide-react
3. Add a new `TabsTrigger` for "Profiles" 
4. Add a new `TabsContent` that renders `<ProfileManagement />`

The tab order will be:
- **Profiles** -- Create, edit, delete security profiles (roles)
- **Role Permissions** -- Configure module-level permissions per profile
- **Permission Set Groups** -- Override permissions for specific users

### Technical Details

This is a single-file change to `SecurityManagement.tsx`:
- Import the existing `ProfileManagement` component
- Add one `TabsTrigger` and one `TabsContent` block
- No database changes needed
- No new components needed -- everything already exists and is fully functional

### What Already Works (No Changes Needed)

- Profile CRUD operations (create, edit, delete) in `ProfileManagement.tsx`
- Permission assignment per profile in `RolePermissionsTab.tsx`
- Profile-to-permission linkage via `profile_object_permissions` table
- User assignment to profiles via `user_profiles` table
- System Administrator auto-grant logic in `RolePermissionsTab`
