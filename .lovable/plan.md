

## Restructure Permission System: 4-Layer Hierarchy with CRUD Checkboxes (Based on Actual UI)

### Overview

Replace the current flat Module/Feature/Sub-feature permission table in `permissionModules.ts` and `ModulePermissionTable.tsx` with a 4-layer hierarchical model organized into tabs: **Module Permission**, **Field Permission**, **Action Permission**, and **Widget Permission**. All layers use the existing CRUD checkbox columns (Read, Create, Edit, Delete). Items in each layer are mapped strictly from the actual application UI.

### Key Principle: UI-Accurate Definitions

Every field, action, and widget is defined based on what actually exists in the app's interface -- not assumed or generic items. For example, in the My Visit module, the action/widget items are the actual buttons visible in the screenshot: Auto Plan, All Beat, Retailers, Summary, Timeline, GPS Track, Van Stock, Activity.

---

### Database Changes

**1. Add `permission_type` and `parent_module` columns**

```sql
ALTER TABLE profile_object_permissions 
ADD COLUMN permission_type text NOT NULL DEFAULT 'feature';

ALTER TABLE profile_object_permissions 
ADD COLUMN parent_module text;
```

- `permission_type` values: `'module'`, `'field'`, `'action'`, `'widget'`, `'feature'` (default for backward compatibility)
- `parent_module` links child items to their parent module (e.g., `'my_visit'`)
- All existing rows keep `permission_type = 'feature'` and continue working

**2. Update unique constraint**

```sql
ALTER TABLE profile_object_permissions 
DROP CONSTRAINT IF EXISTS profile_object_permissions_profile_id_object_name_key;

ALTER TABLE profile_object_permissions 
ADD CONSTRAINT profile_object_permissions_profile_id_object_name_type_key 
UNIQUE (profile_id, object_name, permission_type);
```

---

### Module Definitions (Based on Actual UI)

A new file `src/components/security/hierarchicalPermissions.ts` will define all modules with their real UI-based items. Here is the complete mapping:

**1. Attendance**
- **Fields:** Attendance % (This Month), Present Days, Absent Days, Working Hours, Market Hours, First Check-in, Last Check-out, Location
- **Actions:** Check In, Check Out, Apply Leave, Regularize, Start Market Hours, Stop Market Hours, Face Verification, Photo Capture
- **Widgets:** My Attendance Tab, My Team Tab, Attendance Records Table, Leave Tab, Holiday Tab, Journey Map, Timeline View, Monthly Summary Cards

**2. My Visit**
- **Fields:** Visit Date, Retailer Name, Beat Name, Check-in Time, Visit Duration, Order Value, Status, Distributor
- **Actions:** Auto Plan, All Beat, Retailers, Summary, Timeline, GPS Track, Van Stock, Activity (these are the actual buttons from the screenshot)
- **Widgets:** Today's Progress, Points Earned, Week Calendar, Retailer Card List, Orders Dialog, Visit Filters, AI Recommendations/Insights, Sync Data Modal

**3. All Retailers**
- **Fields:** Retailer Name, Address, Phone, Category, Priority, Beat Name, Last Visit Date, Credit Score, Pending Amount, GST Number, Location Tag, Retail Type, Potential
- **Actions:** Add Retailer, Edit Retailer, Delete Retailer, Bulk Import, Mass Edit Beats, Add to Visit, View Analytics, Export
- **Widgets:** Retailer List/Table, Retailer Detail Modal, Analytics Panel, Credit Score Display, Pagination Controls, Search/Filter Bar

**4. My Beats**
- **Fields:** Beat Name, Schedule, Retailer Count, Territory, Travel Allowance
- **Actions:** Create Beat, Edit Beat, Delete Beat, Assign Retailers
- **Widgets:** Beat List, Beat Detail, Beat Analytics, Beat Calendar

**5. My Target**
- **Fields:** Target Value, Achievement %, Period, Shortfall
- **Actions:** View Details, Export, Compare Periods
- **Widgets:** Target Overview, Territory Performance, Beat Performance, Retailer Performance, AI Recommendations, Shortfall Analysis

**6. Analytics**
- **Fields:** Revenue, Orders Count, Coverage %, Pending Payments
- **Actions:** Export, Filter, Date Range Selection, User Filter
- **Widgets:** Business Summary, Beat Details, Retailer Details, Order Details, Product Breakdown, Pending Payments, Performance Calendar, Leaderboard

**7. GPS Track**
- **Fields:** Location, Distance Traveled, Duration, Visit Count
- **Actions:** Start Tracking, Journey Playback, Export
- **Widgets:** Live Map, Timeline, Visit Statistics, Time Analytics, Team Status

**8. Performance**
- **Fields:** Overall Score, Rank, Trend
- **Actions:** Export, Compare Periods
- **Widgets:** Overall Performance, Territory Breakdown, Beat Breakdown, Retailer Breakdown, Period Comparison, Trend Analysis, Leaderboard

**9. Primary Orders**
- **Fields:** Order Number, Amount, Status, Date, Transporter Info, Dispatch Date
- **Actions:** Create Order, View Details, Inventory Sync
- **Widgets:** Order List, Order Status Board, Order Details

**10. My Expenses**
- **Fields:** Amount, Category, Date, Status, Distance
- **Actions:** Submit Claim, Edit Claim, Export
- **Widgets:** Beat Allowance, Expense Claims, Claim History, Approval Status

**11. Gamification / Leaderboard**
- **Fields:** Points, Rank, Badges
- **Actions:** Redeem, View Details
- **Widgets:** Leaderboard, Badges, Rewards, Redemption

**12-20. Remaining modules** (Institutional Sales, Distributor Master, Territories, Competition Master, Check Schemes, Packing List, My Deliveries, Recycle Bin, Competency, Tax Master, User Management) will follow the same pattern, with items mapped from their actual page components.

**21. Admin Panel** -- retains its existing sub-module structure, reorganized into the 4 layers where applicable.

---

### Cascading Behavior

When a module's CRUD checkbox (e.g., "Read") is toggled ON in the Module Permission tab, all corresponding field/action/widget items automatically get that same CRUD flag set. Toggling "Read" OFF on a module clears "Read" on all its children. The "All" column toggles all CRUD flags together. Individual items can still be adjusted independently after the module-level toggle.

---

### UI Layout

```text
+------------------------------------------------------------+
| Select Profile: [System Administrator v]         [Save]    |
+------------------------------------------------------------+
| [Module Permission] [Field Permission] [Action] [Widget]   |
+------------------------------------------------------------+
|                                                            |
|  Module Permission Tab:                                    |
|  +--------------------------------------+---+---+---+---+  |
|  | Module                               | R | C | E | D |  |
|  +--------------------------------------+---+---+---+---+  |
|  | Attendance                           |[x]|[x]|[x]|[x]|  |
|  | My Visit                             |[x]|[x]|[x]|[x]|  |
|  | All Retailers                        |[ ]|[ ]|[ ]|[ ]|  |
|  +--------------------------------------+---+---+---+---+  |
|                                                            |
|  Field Permission Tab (grouped by module, collapsible):    |
|  +--------------------------------------+---+---+---+---+  |
|  | > Attendance                                          |  |
|  |   Attendance %                       |[x]|[ ]|[ ]|[ ]|  |
|  |   First Check-in                     |[x]|[ ]|[ ]|[ ]|  |
|  | > My Visit                                            |  |
|  |   Visit Date                         |[x]|[x]|[ ]|[ ]|  |
|  +--------------------------------------+---+---+---+---+  |
|                                                            |
|  (Action and Widget tabs follow the same grid layout)      |
+------------------------------------------------------------+
```

---

### New Files

| File | Purpose |
|---|---|
| `src/components/security/hierarchicalPermissions.ts` | All module definitions with fields, actions, widgets mapped from actual UI |
| `src/components/security/HierarchicalPermissionEditor.tsx` | Main 4-tab editor component |
| `src/components/security/PermissionLayerTable.tsx` | Reusable CRUD checkbox grid used by all 4 tabs, with collapsible module groups |

### Modified Files

| File | Changes |
|---|---|
| `src/components/security/RolePermissionsTab.tsx` | Replace `ModulePermissionTable` with `HierarchicalPermissionEditor`; update fetch to include `permission_type` and `parent_module`; update save/upsert to include these columns; implement cascading logic on module toggle |
| `src/hooks/useProfilePermissions.ts` | Add `hasFieldPermission(fieldName, permType)`, `hasActionPermission(actionName, permType)`, `hasWidgetPermission(widgetName, permType)` exports; update query to fetch `permission_type` |

### Preserved Files (Not Deleted)

| File | Reason |
|---|---|
| `src/components/security/permissionModules.ts` | Existing feature-type permissions continue to work; backward compatibility |
| `src/components/security/ModulePermissionTable.tsx` | Kept for reference; no longer rendered in `RolePermissionsTab` |

---

### Backward Compatibility

- All existing `profile_object_permissions` rows default to `permission_type = 'feature'` and continue working
- All existing frontend permission checks (`hasPermission`, `hasModuleAccess`, `isNavItemEnabled`, `canShowButton`) work unchanged because they query feature-type rows
- The new 4-layer permissions are additive -- components can gradually adopt `hasFieldPermission`, `hasActionPermission`, and `hasWidgetPermission` over time
- The MyVisits `canShowButton` checks (lines 215-224) that already gate Auto Plan, All Beat, Retailers, etc. will continue working via the existing feature-type permissions; the new action/widget layer provides a parallel, more structured path for the same controls

