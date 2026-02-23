

## Add "Admin Control" Module to Role Permissions

### Overview
Add a new top-level "Admin Control" module to the hierarchical permission system, with sub-modules for every item in the Admin Panel. Each sub-module gets field, action, and widget permissions following the existing naming conventions.

### File Changed: `src/components/security/hierarchicalPermissions.ts`

Add a new entry to `HIERARCHICAL_MODULES` array named `admin_control` with label "Admin Control". This module will contain fields, actions, and widgets representing all admin sub-modules and their granular permissions.

Since the existing architecture uses a flat field/action/widget list per module, each admin sub-module will be represented as a set of field + action + widget entries grouped by prefix. This follows the same pattern used for other modules.

### Sub-modules and their permissions

Each admin sub-module gets a consistent set of permissions:

| Sub-module | Field Prefix | Actions | Widgets |
|---|---|---|---|
| Admin Dashboard | `field_admin_dashboard_*` | view, export | dashboard, stats, charts |
| Price Book Management | `field_admin_pricebook_*` | create, edit, delete, export | list, detail |
| User Management | `field_admin_user_*` | create, edit, delete, reset_password, login_as | list, detail, hierarchy |
| Attendance Management | `field_admin_attendance_*` | approve, reject, export | list, summary, holidays |
| Product Management | `field_admin_product_*` | create, edit, delete, import | list, detail, categories |
| Scheme Master | `field_admin_scheme_*` | create, edit, delete, activate | list, detail, eligibility |
| Vendor Management | `field_admin_vendor_*` | add, edit, approve | list, detail |
| Territories & Distributors | `field_admin_territory_*` | create, edit, assign | list, map, distributors |
| Expense Management | `field_admin_expense_*` | approve, reject, export | list, summary, claims |
| Feedback Management | `field_admin_feedback_*` | view, respond, export | list, detail |
| Operations | `field_admin_operations_*` | view, export, filter | dashboard, live_tracking |
| GPS Track Management | `field_admin_gps_*` | track, export, playback | map, timeline |
| Retail Management | `field_admin_retail_*` | verify, edit, delete | list, detail |
| Van Sales Management | `field_admin_vansales_*` | create, edit, assign | list, detail |
| Security & Access Control | `field_admin_security_*` | create_profile, edit_profile, assign_role | profiles, permissions, groups |
| Feature Management | `field_admin_feature_*` | toggle, configure | list, detail |
| Gamification | `field_admin_gamification_*` | configure, manage, redeem | dashboard, settings |
| Retailer Loyalty | `field_admin_loyalty_*` | configure, manage | dashboard, settings |
| Company Profile | `field_admin_company_*` | edit, upload | detail, branding |
| Invoice Management | `field_admin_invoice_*` | create, edit, configure | list, templates |
| Credit Management | `field_admin_credit_*` | configure, approve | list, settings |
| Notification Setup | `field_admin_notification_*` | create, edit, schedule | list, templates |
| Recycle Bin Master | `field_admin_recycle_*` | restore, permanent_delete | list, logs |
| Distributor Portal Admin | `field_admin_distportal_*` | manage, approve | dashboard, orders |
| Target Management | `field_admin_target_*` | create, assign, cascade | list, detail, tracking |
| Pincode Master | `field_admin_pincode_*` | import, edit | list, search |
| Tax Master | `field_admin_tax_*` | create, edit, map | list, detail |

### Technical Details

- Only one file is modified: `src/components/security/hierarchicalPermissions.ts`
- The new module is appended to the `HIERARCHICAL_MODULES` array
- All helper functions (`getAllModuleNames`, `getAllFieldNames`, etc.) automatically pick up the new entries
- The `HierarchicalPermissionEditor` UI will display the new module in Module Permission tab, and its fields/actions/widgets in respective tabs grouped under "Admin Control"
- No database migration needed -- permissions are stored dynamically via `profile_object_permissions` upserts
- Naming follows the existing `field_`, `action_`, `widget_` prefix convention

