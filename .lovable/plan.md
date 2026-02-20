

## Add "Homepage" Module to Security & Access Control

This plan adds a new **Homepage** module to the hierarchical permission system, allowing admins to control which homepage elements each profile/role can access.

### What Changes

**1. Register the Homepage module in `src/components/security/hierarchicalPermissions.ts`**

Add a new entry to the `HIERARCHICAL_MODULES` array with the following structure:

- **Module name:** `homepage`
- **Module label:** `Homepage`

**Fields** (visible elements on the homepage):
| Permission Name | Label |
|---|---|
| `field_homepage_greeting` | Greeting Text |
| `field_homepage_attendance_summary` | Attendance Summary |
| `field_homepage_sales_summary` | Sales Summary |
| `field_homepage_notifications` | Notifications |
| `field_homepage_quick_stats` | Quick Stats |
| `field_homepage_beat_plan` | Beat Plan |
| `field_homepage_target_progress` | Target Progress |

**Actions** (user interactions on the homepage):
| Permission Name | Label |
|---|---|
| `action_homepage_check_in` | Check In |
| `action_homepage_check_out` | Check Out |
| `action_homepage_end_day` | End My Day |
| `action_homepage_refresh` | Refresh Dashboard |
| `action_homepage_quick_add` | Quick Add |
| `action_homepage_quick_nav` | Quick Navigation |

**Widgets** (dashboard components):
| Permission Name | Label |
|---|---|
| `widget_homepage_attendance` | Attendance Widget |
| `widget_homepage_sales_summary` | Sales Summary Widget |
| `widget_homepage_visit_plan` | Visit Plan Widget |
| `widget_homepage_announcements` | Announcements |
| `widget_homepage_quick_links` | Quick Links |
| `widget_homepage_performance` | Performance Widget |
| `widget_homepage_target_achievement` | Target Achievement Widget |
| `widget_homepage_day_status` | Day Status Bar |

### Technical Details

- **Single file change:** Only `src/components/security/hierarchicalPermissions.ts` needs editing -- the new module entry is added to the existing `HIERARCHICAL_MODULES` array.
- **No database migration needed.** Permission rows are dynamically created via upsert when an admin saves permissions for a profile, so no schema changes are required.
- **Automatic propagation.** The `HierarchicalPermissionEditor`, `RolePermissionsTab`, and `PermissionSetGroupsTab` components all derive their UI from `HIERARCHICAL_MODULES`, so the new Homepage module will appear automatically under Module, Field, Action, and Widget tabs.
- **System Administrator** profile will automatically show all Homepage permissions as granted (handled by the existing `buildAllGranted()` logic).

