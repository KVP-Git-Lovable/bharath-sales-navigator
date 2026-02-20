

# Enforce Action and Widget Permissions in the UI

## Overview
Currently, permission names for actions (e.g., `action_attendance_check_in`) and widgets (e.g., `widget_attendance_leave_tab`) are defined in `hierarchicalPermissions.ts` and stored in the `profile_object_permissions` table, but the actual UI buttons and tabs do not check these permissions. This plan adds enforcement so that disabled actions/widgets appear grayed out and show a "no permission" toast when clicked.

## Approach

### 1. Create a Reusable `PermissionGate` Component
A new component `src/components/auth/PermissionGate.tsx` that wraps any UI element and:
- Accepts `permissionName` (the action/widget name from `hierarchicalPermissions.ts`) and `permType` (defaults to `can_read`)
- If no security profile is assigned, renders children normally (backward compat)
- If permission is granted, renders children normally
- If permission is denied, renders children with `opacity-50 pointer-events-none` styling and intercepts clicks to show a toast: *"You do not have permission to perform this action"*
- Supports an optional `hide` prop to completely hide the element instead of graying it out

### 2. Create a `usePermissionCheck` Hook
A thin convenience hook `src/hooks/usePermissionCheck.ts` that:
- Returns a `checkPermission(name, permType?)` function
- Returns `isRestricted(name, permType?)` -- true if the user has a security profile but lacks this permission
- Can be used in imperative scenarios (e.g., before calling `markAttendance`)

### 3. Wire Up Attendance Module

**Actions (buttons):**
| Permission Name | UI Element | Location |
|---|---|---|
| `action_attendance_check_in` | "Start My Day" button | `Attendance.tsx` line ~962 |
| `action_attendance_check_out` | "End My Day" button | `Attendance.tsx` line ~977 |
| `action_attendance_apply_leave` | Leave Application modal trigger | `LeaveBalanceCards.tsx` / `LeaveApplicationModal.tsx` |
| `action_attendance_regularize` | Regularization button (Edit3 icon) | `Attendance.tsx` line ~1370 |
| `action_attendance_start_market_hours` | "Start Market Hours" button | `Attendance.tsx` market hours section |
| `action_attendance_stop_market_hours` | "Stop Market Hours" button | `Attendance.tsx` market hours section |
| `action_attendance_face_verification` | Face verification step | Already gated by config |
| `action_attendance_photo_capture` | Photo capture step | Already gated by config |

**Widgets (tabs/sections):**
| Permission Name | UI Element |
|---|---|
| `widget_attendance_my_attendance_tab` | "My Attendance" top tab |
| `widget_attendance_my_team_tab` | "My Team" top tab |
| `widget_attendance_leave_tab` | "Leave" tab in bottom tabs |
| `widget_attendance_holiday_tab` | "Holiday" tab in bottom tabs |
| `widget_attendance_records_table` | Attendance records list |
| `widget_attendance_journey_map` | Journey map dialog |
| `widget_attendance_timeline_view` | Timeline view button |
| `widget_attendance_monthly_summary` | Monthly summary cards |

### 4. Wire Up My Visit Module

**Actions:**
| Permission Name | UI Element |
|---|---|
| `action_visit_auto_plan` | Auto Plan tab/button |
| `action_visit_all_beat` | All Beat tab |
| `action_visit_retailers` | Retailers tab |
| `action_visit_summary` | Summary tab |
| `action_visit_timeline` | Timeline tab |
| `action_visit_gps_track` | GPS Track tab |
| `action_visit_van_stock` | Van Stock tab |
| `action_visit_activity` | Activity tab |

**Widgets:**
| Permission Name | UI Element |
|---|---|
| `widget_visit_todays_progress` | Today's Progress card |
| `widget_visit_points_earned` | Points Earned display |
| `widget_visit_week_calendar` | Week Calendar |
| `widget_visit_retailer_card_list` | Retailer Card List |
| `widget_visit_orders_dialog` | Orders Dialog |
| `widget_visit_filters` | Visit Filters |
| `widget_visit_ai_recommendations` | AI Recommendations panel |
| `widget_visit_sync_data_modal` | Sync Data Modal |

### 5. Wire Up Remaining Modules (same pattern)
Apply `PermissionGate` wrapping to actions and widgets across:
- All Retailers, My Beats, My Target, Analytics, GPS Track, Performance, Primary Orders, My Expenses, Gamification, Institutional Sales, Distributor Master, Territories, Competition Master, Check Schemes, Packing List, Deliveries, Homepage

Each module follows the same pattern: wrap action buttons and tab triggers with `<PermissionGate>`.

---

## Technical Details

### `PermissionGate` Component
```tsx
// src/components/auth/PermissionGate.tsx
interface PermissionGateProps {
  children: ReactNode;
  permissionName: string;
  permType?: 'can_read' | 'can_create' | 'can_edit' | 'can_delete';
  hide?: boolean; // if true, hide entirely instead of graying out
  fallbackMessage?: string;
}
```
- Uses `useProfilePermissions()` to check `hasActionPermission` / `hasWidgetPermission` / `hasPermission`
- If `securityProfileName` is falsy (no profile assigned), bypasses all checks
- On denied click: `toast.error(fallbackMessage || "You do not have permission to perform this action")`
- Renders a wrapper `div` with `opacity-50 cursor-not-allowed` and an `onClick` interceptor using `e.stopPropagation(); e.preventDefault()`

### `usePermissionCheck` Hook
```tsx
// src/hooks/usePermissionCheck.ts
const { isRestricted, guardAction } = usePermissionCheck();

// In imperative code:
const handleCheckIn = () => {
  if (guardAction('action_attendance_check_in')) return; // shows toast and returns true if denied
  markAttendance('check-in');
};
```

### Implementation Priority
Given the large number of modules, implementation will focus on:
1. **Phase 1**: `PermissionGate` component + `usePermissionCheck` hook + Attendance module (most visible, shown in screenshot)
2. **Phase 2**: My Visit module
3. **Phase 3**: All other modules (Retailers, Beats, Target, Analytics, etc.)

All three phases will be implemented in a single pass.

### Files to Create
- `src/components/auth/PermissionGate.tsx`
- `src/hooks/usePermissionCheck.ts`

### Files to Modify
- `src/pages/Attendance.tsx` -- wrap action buttons and tabs with PermissionGate
- `src/pages/MyVisits.tsx` -- wrap action tabs and widgets with PermissionGate
- `src/pages/MyRetailers.tsx` -- wrap action buttons
- `src/pages/MyBeats.tsx` -- wrap action buttons
- `src/pages/MyTarget.tsx` -- wrap widgets
- `src/pages/Analytics.tsx` -- wrap widgets
- `src/pages/GPSTrack.tsx` -- wrap actions/widgets
- `src/pages/Performance.tsx` -- wrap widgets
- `src/pages/PrimaryOrders.tsx` -- wrap actions
- `src/pages/MyExpenses.tsx` -- wrap actions
- `src/pages/Leaderboard.tsx` -- wrap widgets
- `src/pages/CompetitionMaster.tsx` -- wrap actions
- `src/pages/Schemes.tsx` -- wrap actions/widgets
- `src/pages/Index.tsx` -- already partially wired, enhance with PermissionGate for disabled state + toast

