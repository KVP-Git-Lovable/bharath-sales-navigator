

## Audit: Link Permission Set to All Features

### Current State

After investigating the codebase, here is what is working and what is NOT:

**Already Working:**
- Navigation bar filters modules based on profile permissions (via `isNavItemEnabled`)
- Dashboard quick-nav tiles filter based on profile permissions
- My Visit page filters sub-feature buttons (GPS Track, Activity, etc.) based on permissions

**NOT Working (Gaps Found):**

#### Gap 1: No Route-Level Protection
The `ProtectedRoute` component only checks if the user is logged in -- it does NOT check module permissions. This means a Data Viewer can type any URL directly (e.g., `/my-retailers`, `/my-beats`, `/analytics`) and access pages they should not see, even though the navigation hides them.

#### Gap 2: Missing Permission Modules
The following navigation items have permission prefix mappings but NO corresponding module defined in `permissionModules.ts`, so admins cannot configure them in the Permission Set UI:

| Nav Item | Permission Prefix | Module in permissionModules.ts? |
|---|---|---|
| Leaderboard/Gamification | `gamification_` | Missing (only admin_gamification exists) |
| Packing List | `packing_list_` | Missing |
| My Deliveries | `delivery_` | Missing |

#### Gap 3: Sub-feature Filtering Inside Pages
Pages like Attendance, Analytics, All Retailers, My Beats, Schemes, Expenses, etc. show all their internal tabs/sections regardless of the user's sub-feature permissions. Only the My Visit page currently filters its internal buttons.

### Implementation Plan

#### Step 1: Create a Permission-Aware Route Guard

Create a new `PermissionGuard` component that wraps page content and checks if the user has `can_read` on at least one permission object matching the module's prefix. If not, redirect to `/dashboard`.

```text
Props:
  - permissionPrefix: string (e.g. "retailer_", "beat_", "analytics_")
  - children: ReactNode

Logic:
  - Admin/System Administrator -> allow
  - No security profile (permissions empty) -> allow
  - Has can_read on any object starting with prefix -> allow
  - Otherwise -> redirect to /dashboard
```

#### Step 2: Apply PermissionGuard to All Module Routes in App.tsx

Wrap each module's route element with `PermissionGuard`:

```text
Route                          Permission Prefix
/attendance                    attendance_
/visits/retailers              visit_
/my-retailers                  retailer_
/my-target, /my-targets        target_
/performance-dashboard         performance_
/analytics                     analytics_
/institutional-sales/*         institutional_
/distributor-master/*          distributor_
/primary-orders                primary_order_
/territories-and-distributors  territory_
/gps-track                     gps_
/my-beats/*                    beat_
/competition-master/*          competition_
/schemes                       scheme_
/expenses                      expense_
/leaderboard                   gamification_
/packing-list-management       packing_list_
/my-deliveries                 delivery_
/competency-dashboard          competency_
/recycle-bin                   recycle_
```

#### Step 3: Add Missing Permission Modules to permissionModules.ts

Add three new modules so they appear in the Permission Set configuration UI:

1. **Gamification** (user-facing leaderboard)
   - `gamification_leaderboard`, `gamification_badges`, `gamification_rewards`, `gamification_redemption`

2. **Packing List**
   - `packing_list_view`, `packing_list_create`, `packing_list_manage`

3. **My Deliveries**
   - `delivery_list`, `delivery_detail`, `delivery_status_update`

#### Step 4: Add Sub-feature Filtering to Key Pages (Phase 1)

For the most important pages, add permission-based filtering for internal tabs/sections, following the same pattern used in MyVisits.tsx:

- **Attendance page**: Filter internal sections (Check-in, Leave Applications, Holiday List, etc.) using `attendance_` sub-permissions
- **Analytics page**: Filter tabs (Business Summary, Beat Details, Order Details, etc.) using `analytics_` sub-permissions

Other pages can be enhanced in future phases as needed.

### Technical Details

- The `PermissionGuard` component will use the existing `useProfilePermissions` hook and `useAdminAccess` hook
- No database changes needed -- the permission system already stores arbitrary `object_name` strings
- When a new module is added to `permissionModules.ts`, it automatically appears in the Permission Set UI for admins to configure
- The guard component will show a brief loading state while permissions are being fetched, then redirect if unauthorized

### Summary of Files to Change

1. **New**: `src/components/auth/PermissionGuard.tsx` - Route-level permission check component
2. **Edit**: `src/App.tsx` - Wrap module routes with PermissionGuard
3. **Edit**: `src/components/security/permissionModules.ts` - Add Gamification, Packing List, My Deliveries modules
4. **Edit**: `src/pages/Attendance.tsx` - Add sub-feature filtering (Phase 1)
5. **Edit**: `src/pages/Analytics.tsx` - Add sub-feature filtering (Phase 1)

