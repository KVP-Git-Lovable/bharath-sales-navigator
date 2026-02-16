

## Fix: Role-Based Module Visibility in Navigation

### Problem
Currently, the navigation bar uses only the global `feature_flags` table to decide which modules to show. Since all flags are set to `is_enabled: true`, every user sees all modules regardless of their security profile permissions. The Data Viewer role should only see modules they have permissions for (e.g., GPS Track and Activity within My Visit).

### Solution
Combine **global feature flags** with **per-user profile permissions** to filter navigation items. A module should only appear if:
1. It is globally enabled in `feature_flags` (existing check), AND
2. The user's security profile has `can_read` on at least one permission object under that module

### Implementation Steps

#### 1. Update `useFeatureFlags.ts` to also check profile permissions

- Import and use the user's profile permissions from `profile_object_permissions` (via `user_profiles` join)
- Create a mapping from navigation item IDs to their permission module prefixes (e.g., `'my-visit'` maps to prefix `'visit_'`, `'attendance'` maps to `'attendance_'`, `'gps-track'` maps to `'gps_'`)
- Update `isNavItemEnabled` logic: if the user has a security profile assigned, only show modules where they have `can_read` on at least one object matching that module's prefix
- For admin/System Administrator roles, bypass this check (show everything that's globally enabled)

#### 2. Create a NAV_ITEM_PERMISSION_PREFIX map

A new mapping that connects nav item IDs to their permission object name prefixes:

```text
'attendance'          -> 'attendance_'
'my-visit'            -> 'visit_'
'all-retailers'       -> 'retailer_'
'my-target'           -> 'target_'
'performance'         -> 'performance_'
'analytics'           -> 'analytics_'
'institutional-sales' -> 'institutional_'
'distributor-master'  -> 'distributor_'
'primary-orders'      -> 'primary_order_'
'territories'         -> 'territory_'
'gps-track'           -> 'gps_'
'my-beats'            -> 'beat_'
'competition-master'  -> 'competition_'
'schemes'             -> 'scheme_'
'expenses'            -> 'expense_'
'leaderboard'         -> 'gamification_'
'my-competency'       -> 'competency_'
'recycle-bin'         -> 'recycle_'
```

#### 3. Update `isNavItemEnabled` logic

```text
function isNavItemEnabled(navItemId):
  1. Check global feature flag -> if disabled, hide
  2. If user is admin/System Administrator -> show (skip permission check)
  3. If user has no security profile -> show (no restrictions)
  4. Check if user has can_read on ANY object matching the module prefix
     - If yes -> show
     - If no -> hide
```

#### 4. Handle "My Visit" sub-feature filtering

The visit page tabs (Auto Plan, All Beat, Summary, Activity, GPS Track, etc.) need filtering too. Update the visit page to check `hasPermission` for each sub-tab's permission object and only render tabs the user has access to.

### Technical Details

- Modify `src/hooks/useFeatureFlags.ts`: Add permission-based filtering alongside existing feature flag logic. Fetch user's profile permissions and merge both checks.
- Modify `src/components/Navbar.tsx`: No changes needed (already uses `isNavItemEnabled`).
- Modify `src/pages/Index.tsx`: No changes needed (already uses `isNavItemEnabled`).
- The visit pages (under `/visits/`) will need to be updated to filter sub-tabs based on the user's `visit_*` permissions.
- Uses existing `useAuth` hook's `userRole` and `securityProfileName` to detect admin bypass.

### What This Achieves
- Data Viewer logging in will only see modules they have `can_read` permissions for
- Admins and System Administrators continue to see all globally-enabled modules
- The feature flag global toggle still works as an override (if globally disabled, no one sees it)
- Sub-features within My Visit are filtered based on granular permission objects

