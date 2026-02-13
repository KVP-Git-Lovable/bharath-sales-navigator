

# Flatten Hierarchy View to Single-Line Color-Coded List

## Current Problem
The Team Performance section uses a nested tree structure with indentation and collapsible groups. This creates deep nesting that is hard to read, especially on mobile screens.

## New Design
Replace the nested tree with a **flat, single-line-per-user list**. Each user gets a single row with a colored left accent and role badge to indicate their position in the hierarchy. No nesting or indentation -- just a clean vertical list.

### Visual Layout (each row)
```text
[color bar] [Avatar] Name          Role Badge     Target   Actual   %   Status
```

### Color Coding by Role
- **Top Manager** (Level 0): Rose/red tinted row with "Top Manager" badge
- **Manager** (Level 1): Purple tinted row with "Manager" badge  
- **Team Lead** (Level 2): Blue tinted row with "Team Lead" badge
- **Member** (Level 3+): Emerald tinted row with "Member" badge

Each level gets a light background tint and a left border accent in the corresponding color, making roles instantly distinguishable without any tree indentation.

### How It Works
1. Recursively flatten the hierarchy groups into a single ordered array, tagging each entry with its depth level and role label
2. Render all entries as a simple vertical list of single-line cards
3. Managers show their aggregated team totals; leaf members show individual targets
4. The top-level manager appears first, followed by their sub-managers and members in order
5. Collapsible expand is preserved per manager row to show/hide their team members beneath them

## Technical Changes

**File: `src/components/admin/TeamTargetDashboard.tsx`**

1. Add a `flattenHierarchy()` utility that walks the recursive `groupedData` and produces a flat array like:
   ```
   [
     { type: 'manager', depth: 0, data: abhishekGroup },
     { type: 'manager', depth: 1, data: girishGroup },
     { type: 'member',  depth: 2, data: harshithMember },
     { type: 'member',  depth: 2, data: sanjaySMember },
     ...
   ]
   ```

2. Replace `renderHierarchyGroup` with a new `renderFlatRow()` that renders each item as a single-line row with:
   - A 3px left border in the depth color
   - A light background tint matching the depth color
   - A small role badge (e.g., "Manager", "Member")
   - Target, Actual, %, Status all on one line
   - Managers are still collapsible (clicking hides/shows their children in the flat list)

3. Remove all `ml-3 md:ml-5` nesting indentation -- every row starts at the same horizontal position

4. Keep the existing `renderMemberCard` product breakdown expand functionality intact within the flat row

