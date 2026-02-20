

## Fix: Navigation Not Recognizing Hierarchical Permissions

### Root Cause

The navigation visibility check in `useFeatureFlags.ts` uses prefix matching like `attendance_` to find permissions. But the new hierarchical system saves permissions as `module_attendance`, `field_attendance_first_checkin`, `action_attendance_check_in`, etc. None of these start with `attendance_`, so the check fails and hides the module.

### Solution

Update `useFeatureFlags.ts` to recognize the new hierarchical naming pattern alongside the old prefixes. For each navigation item, add a mapping to the hierarchical module name, then check for:
- Exact match on `module_<name>` 
- Any object starting with `field_<name>_`, `action_<name>_`, or `widget_<name>_`

### Changes

**File: `src/hooks/useFeatureFlags.ts`**

1. Add a new mapping `NAV_ITEM_MODULE_NAME` that maps nav IDs to their hierarchical module base name:

```
'attendance' -> 'attendance'
'my-visit' -> 'visit'
'all-retailers' -> 'retailer'
'my-target' -> 'target'
'performance' -> 'performance'
'analytics' -> 'analytics'
'institutional-sales' -> 'institutional'
'distributor-master' -> 'distributor'
'primary-orders' -> 'primary_order'
'territories' -> 'territory'
'gps-track' -> 'gps_track'
'my-beats' -> 'beat'
'competition-master' -> 'competition'
'schemes' -> 'scheme'
'expenses' -> 'expense'
'leaderboard' -> 'gamification'
'packing-list' -> 'packing_list'
'my-deliveries' -> 'delivery'
'my-competency' -> 'competency'
'recycle-bin' -> 'recycle'
```

2. Update `hasPermissionForPrefix` to also check hierarchical names. Given a module name like `attendance`, it will check if ANY permission object_name equals `module_attendance` OR starts with `field_attendance_`, `action_attendance_`, or `widget_attendance_`.

3. Update `isNavItemEnabled` (Step 5) to try both the old prefix check AND the new hierarchical module name check -- if either matches, the module is visible.

### No Other Files Changed

- `useProfilePermissions.ts` already fetches all permission types correctly (no filtering by permission_type)
- The hierarchical permission definitions and editor are correct
- Database schema is correct

### Backward Compatibility

Old `feature`-type permissions (e.g., `attendance_list`, `visit_retailer`) continue to work via the existing prefix check. The new hierarchical permissions (`module_attendance`, `field_attendance_*`) are checked as a fallback. Either path grants visibility.

