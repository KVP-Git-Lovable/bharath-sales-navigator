

## Fix: Filter Home Dashboard Sections by Permissions

### Problem
The Home/Dashboard page displays all widgets unconditionally -- Target data (inside TodaysBeatCard), AI Insights, Performance Calendar, Pending Payments, and Check-in Status -- even when the user's security profile does not include the corresponding modules.

### Solution
Add permission checks to the Home page (`src/pages/Index.tsx`) using the existing `useProfilePermissions` and `useAdminAccess` hooks, following the same pattern already used in MyVisits.tsx.

### Mapping: Dashboard Widget to Permission Prefix

| Dashboard Widget | Permission Prefix | Rationale |
|---|---|---|
| CheckInStatusBanner | `attendance_` | Part of Attendance module |
| TodaysBeatCard (visit planned for the day) | `visit_` | Part of My Visit module |
| AIInsightsSection | `visit_ai_recommendations` | Already defined as a visit sub-feature |
| PerformanceCalendar | `performance_` | Part of Performance module |
| PendingPayments | `analytics_pending_payments` | Already defined under Analytics module |

### Changes

#### 1. `src/pages/Index.tsx` - Add permission-based conditional rendering

- Import `useProfilePermissions` from the existing hook and `useAdminAccess`
- Define visibility flags using the same bypass logic (admin / no security profile / has module access):

```
const { permissions, hasModuleAccess } = useProfilePermissions();
const { isFullAdmin } = useAdminAccess();
const hasSecurityProfile = permissions.length > 0;

const canShow = (prefix: string) =>
  !hasSecurityProfile || isFullAdmin || hasModuleAccess(prefix);

const showCheckIn      = canShow('attendance_');
const showTodaysBeat   = canShow('visit_');
const showAIInsights   = canShow('visit_ai_recommendations') || canShow('visit_');
const showPerfCalendar = canShow('performance_');
const showPendingPay   = canShow('analytics_pending_payments') || canShow('analytics_');
```

- Wrap each section in a conditional:
  - `{showCheckIn && <CheckInStatusBanner ... />}`
  - `{showTodaysBeat && <TodaysBeatCard ... />}`
  - `{showAIInsights && <AIInsightsSection ... />}`
  - `{showPerfCalendar && <PerformanceCalendar />}`
  - `{showPendingPay && <PendingPayments ... />}`

#### 2. Quick Add Dropdown - Filter items

The "Quick Add" dropdown in the header also contains shortcuts (Today's Visit, Add Retailer, Competition, Schemes, Leaderboard). These should also be filtered:

| Dropdown Item | Permission Prefix |
|---|---|
| Today's Visit | `visit_` |
| Add Retailer | `retailer_` |
| Add Competition | `competition_` |
| Check Schemes | `scheme_` |
| Leaderboard | `gamification_` |

Items without matching permissions will be hidden from the dropdown.

### What stays visible regardless of permissions
- Welcome header with user name and role
- Offline indicator
- Quick Navigation grid (already filtered via `isNavItemEnabled`)
- Profile Setup Modal

### No new modules needed
All permission prefixes already exist in `permissionModules.ts`. No database changes required.

### Files to Change
1. **Edit**: `src/pages/Index.tsx` - Add permission checks around dashboard widgets and Quick Add dropdown items

