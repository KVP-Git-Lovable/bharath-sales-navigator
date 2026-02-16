
## Fix: Filter My Visit Sub-features and Today's Progress by Permissions

### Problem
The My Visits page shows all 8 quick-action buttons (Auto Plan, All Beat, Retailers, Summary, Timeline, GPS Track, Van Stock, Activity) and the "Today's Progress" card regardless of the user's security profile permissions. For the Data Viewer role, only **GPS Track** and **Activity** should be visible since those are the only visit sub-features with `can_read` permissions assigned.

### Solution
Use the existing `useProfilePermissions` hook inside MyVisits.tsx to conditionally render each button and the Today's Progress card based on the user's permissions.

### Changes

#### 1. `src/pages/MyVisits.tsx` - Add permission-based filtering

- Import `useProfilePermissions` hook
- For each of the 8 quick-action buttons, check if the user has `can_read` on the corresponding permission prefix before rendering:

```text
Button              Permission Prefix
---------           -----------------
Auto Plan           visit_auto_plan
All Beat            visit_all_beat
Retailers           visit_retailers (or visit_all_beat_retailers)
Summary             visit_summary
Timeline            visit_timeline
GPS Track           visit_gps_track
Van Stock           visit_van_stock
Activity            visit_activity
```

- For admin/System Administrator users, all buttons remain visible (bypass check)
- If the user has no security profile (permissions array is empty), all buttons remain visible (no restrictions)

#### 2. Today's Progress Card - Permission control

- Add a new permission object `visit_todays_progress` to the permission modules definition
- Conditionally render the Today's Progress card based on whether the user has `can_read` on `visit_todays_progress`
- If no such permission object exists yet, we will add it to `permissionModules.ts` so admins can toggle it

#### 3. `src/components/security/permissionModules.ts` - Add Today's Progress

- Add a `visit_todays_progress` feature under the My Visit module with sub-features like `visit_todays_progress_view`

### Technical Details

- The `hasModuleAccess(prefix)` function from `useProfilePermissions` checks if any permission object starting with the given prefix has `can_read = true`
- Each button will be wrapped in a conditional: only render if `isFullAdmin || permissions.length === 0 || hasModuleAccess('visit_auto_plan')` (example for Auto Plan)
- The two button grids (rows of 4 buttons each) will use `.filter()` to remove hidden buttons, then render dynamically with appropriate grid classes
- The Today's Progress card will similarly be conditionally rendered
