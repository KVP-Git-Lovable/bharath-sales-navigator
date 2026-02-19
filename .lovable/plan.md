

## Collapsible Module Permission UI + Auto-Select System Administrator

### What Changes

**1. Collapsible/Expandable Module Structure (`ModulePermissionTable.tsx`)**

Replace the current flat list with an accordion-style layout:
- Only **module names** (level 0) are visible by default, each with a chevron icon
- Clicking a module expands it to reveal its features and sub-features
- Module-level row shows aggregate permission checkboxes (All, View, Create, Edit, Delete) that toggle all children
- Features with sub-features get their own nested collapsible section inside the expanded module
- Uses `Collapsible` component from Radix (already installed)

**2. Auto-Select System Administrator (`RolePermissionsTab.tsx`)**

When profiles load, automatically pre-select the "System Administrator" profile so the table appears immediately without requiring a manual selection.

### Technical Details

**File: `src/components/security/ModulePermissionTable.tsx`**
- Add state: `expandedModules` (Set of expanded module names) and `expandedFeatures` (Set of expanded feature names)
- Restructure rendering to iterate `PERMISSION_MODULES` directly instead of flattening into rows
- Each module renders as a collapsible section:
  - Collapsed: module name + chevron + aggregate permission checkboxes on the right
  - Expanded: reveals feature rows (level 1) and sub-feature rows (level 2)
- Features that have sub-features also get their own expand/collapse toggle
- Use `ChevronRight` / `ChevronDown` icons from lucide-react for the toggle indicator
- Keep all existing permission logic (aggregate toggles, parent-child cascading) intact

**File: `src/components/security/RolePermissionsTab.tsx`**
- After `profiles` data loads, find the profile with `name === SYSTEM_ADMINISTRATOR_PROFILE`
- If found and no profile is currently selected, auto-set `selectedProfileId` to that profile's ID
- Use a `useEffect` to handle this once profiles are fetched

### UI Layout (Collapsed State)

```text
+----------------------------------------------------------+
| Module                  | All | View | Create | Edit | Del |
+----------------------------------------------------------+
| > Admin Panel           | [x] | [x]  | [x]    | [x]  | [x] |
| > Attendance            | [ ] | [ ]  | [ ]    | [ ]  | [ ] |
| > My Visit              | [ ] | [ ]  | [ ]    | [ ]  | [ ] |
| > All Retailers         | [ ] | [ ]  | [ ]    | [ ]  | [ ] |
| ...                                                        |
+----------------------------------------------------------+
```

### UI Layout (Expanded State - Admin Panel clicked)

```text
+----------------------------------------------------------+
| v Admin Panel           | [x] | [x]  | [x]    | [x]  | [x] |
|   > Admin Dashboard     | [x] | [x]  | [x]    | [x]  | [x] |
|   > Price Book Mgmt     | [x] | [x]  | [x]    | [x]  | [x] |
|   ...                                                      |
| > Attendance            | [ ] | [ ]  | [ ]    | [ ]  | [ ] |
+----------------------------------------------------------+
```

When "Admin Dashboard" is expanded further, its sub-features (Dashboard Overview, User List, etc.) appear indented below it.

