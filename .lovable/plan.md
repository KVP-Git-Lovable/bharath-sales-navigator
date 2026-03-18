

## Audit: Permission Key Mismatch Across All Pages

### Summary of Findings

Checked every file using `useProfilePermissions` for permission-based visibility. Here's the status:

### Broken — Key Mismatch (same pattern as MyVisits)

**1. `src/pages/MyVisits.tsx`** (confirmed, user-reported)
- Uses `hasModuleAccess('visit_auto_plan')` etc. — `startsWith` match
- DB keys are `action_visit_auto_plan` — does NOT start with `visit_auto_plan`
- All 9 sub-buttons hidden even with full access

### Working Correctly — No Mismatch

**2. `src/pages/Analytics.tsx`** ✅
- Uses `hasPermission('analytics_business_summary', 'can_read')` — **exact match**
- Legacy key `analytics_business_summary` exists in `permissionModules.ts` and was seeded
- No mismatch

**3. `src/pages/Vendors.tsx`** ✅
- Uses `hasPermission('admin_vendor_list', 'can_edit')` — exact match against legacy key
- Works if seeded

**4. `src/pages/VanSalesManagement.tsx`** ✅
- Uses `hasPermission('admin_van_sales', 'can_view_all')` — exact match
- Works if seeded

**5. `src/pages/CompetitorDetail.tsx` & `CompetitionMaster.tsx`** ✅
- Use `hasPermission('admin_competition_master', 'can_edit')` — exact match
- Works if seeded

**6. `src/pages/CompetencyAdmin.tsx`** ✅
- Uses `hasModuleAccess('admin_competency_')` — prefix match against `admin_competency_*` keys
- Works if seeded

**7. `src/pages/SecurityManagement.tsx` & `PermissionSetPage.tsx`** ✅
- Use `hasModuleAccess('admin_security_')` — prefix match against `admin_security_*` keys
- Works if seeded

**8. `src/pages/Index.tsx`** ✅ (partially)
- Uses OR logic: `canShow('attendance_') || hasWidgetPermission('widget_homepage_attendance')`
- Legacy prefixes (`attendance_`, `visit_`, `retailer_`, etc.) match existing DB keys
- Hierarchical keys (`widget_homepage_*`, `field_homepage_*`, `action_homepage_*`) were seeded in latest migration
- Quick-add dropdown items use `canShow('visit_')` which matches legacy `visit_*` keys

**9. Attendance components** ✅
- No permission checks inside attendance components — gating is at route/nav level only

### Only Fix Needed: `src/pages/MyVisits.tsx`

Replace `hasModuleAccess` prefix checks with the correct typed permission functions:

```typescript
const { permissions, hasModuleAccess, hasActionPermission, hasWidgetPermission } = useProfilePermissions();

const hasSecurityProfile = permissions.length > 0;
const hasFullModuleAccess = hasModuleAccess('module_my_visit');

const canShowAction = (actionName: string) =>
  !hasSecurityProfile || hasFullModuleAccess || hasActionPermission(actionName);
const canShowWidget = (widgetName: string) =>
  !hasSecurityProfile || hasFullModuleAccess || hasWidgetPermission(widgetName);

const showAutoPlan = canShowAction('action_visit_auto_plan');
const showAllBeat = canShowAction('action_visit_all_beat');
const showRetailers = canShowAction('action_visit_retailers');
const showSummary = canShowAction('action_visit_summary');
const showTimeline = canShowAction('action_visit_timeline');
const showGpsTrack = canShowAction('action_visit_gps_track');
const showVanStock = canShowAction('action_visit_van_stock');
const showActivity = canShowAction('action_visit_activity');
const showTodaysProgress = canShowWidget('widget_visit_todays_progress');
const showInsightsTarget = !hasSecurityProfile || hasModuleAccess('target_');
```

### Files Changed
- `src/pages/MyVisits.tsx` — fix permission key references (lines 211-225)

No other pages have this mismatch pattern. All other pages either use exact-match `hasPermission()` against legacy keys or use correct prefix patterns that match DB key naming.

