
## Wire Homepage Permissions to Dashboard Rendering

### What Changes

**Single file edit: `src/pages/Index.tsx`**

### Step 1 -- Destructure additional permission helpers

Update line 37 to also destructure `hasFieldPermission`, `hasActionPermission`, and `hasWidgetPermission`:

```typescript
const { permissions, hasModuleAccess, hasFieldPermission, hasActionPermission, hasWidgetPermission } = useProfilePermissions();
```

### Step 2 -- Update visibility booleans (lines 43-48)

Each boolean uses OR logic: legacy check **or** new homepage permission. This ensures backward compatibility while enabling the new homepage-level grants.

| Boolean | Current | New (added OR condition) |
|---|---|---|
| `showCheckIn` | `canShow('attendance_')` | `\|\| hasWidgetPermission('widget_homepage_attendance')` |
| `showTodaysBeat` | `canShow('visit_')` | `\|\| hasWidgetPermission('widget_homepage_visit_plan')` |
| `showAIInsights` | `canShow('visit_ai_recommendations') \|\| canShow('visit_')` | `\|\| hasWidgetPermission('widget_homepage_performance')` |
| `showPerfCalendar` | `canShow('performance_')` | `\|\| hasWidgetPermission('widget_homepage_target_achievement')` |
| `showPendingPay` | `canShow('analytics_pending_payments') \|\| canShow('analytics_')` | `\|\| hasFieldPermission('field_homepage_quick_stats')` |
| `showTarget` | `canShow('target_')` | `\|\| hasFieldPermission('field_homepage_target_progress')` |

New booleans to add:
- `showGreeting`: `canShow('attendance_') || hasFieldPermission('field_homepage_greeting')` -- controls the greeting header section
- `showQuickAdd`: `!hasSecurityProfile || canShow('visit_') || hasActionPermission('action_homepage_quick_add')` -- controls the Quick Add dropdown button
- `showQuickNav`: `!hasSecurityProfile || hasWidgetPermission('widget_homepage_quick_links')` -- controls the Quick Navigation grid (fallback: always show if no security profile)

### Step 3 -- Apply new booleans to the template

- **Greeting header** (line 136-142): Wrap the greeting text (`getGreeting()!`) rendering with `showGreeting` -- if false, still show the name and role but skip the greeting line.
- **Quick Add button** (lines 146-188): Wrap the entire `DropdownMenu` with `{showQuickAdd && (...)}`.
- **Quick Navigation grid** (line 246): Wrap with `{showQuickNav && <QuickNavGrid ... />}`.

### Step 4 -- Quick Add dropdown items also get homepage action checks

Each dropdown item inside the Quick Add menu will additionally check its homepage action:
- "Today's Visit": also `|| hasActionPermission('action_homepage_check_in')`
- Other items keep their existing legacy checks (they map to module-level permissions, not homepage-specific)

### Summary

- **No database changes** -- permission rows are created dynamically when admin saves
- **No new files** -- single file edit to `src/pages/Index.tsx`
- **Backward compatible** -- OR logic means existing legacy permissions continue to work; new homepage permissions add an additional grant path
