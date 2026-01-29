
# Plan: Redesign Hierarchy View UI

## Overview
Transform the Hierarchy tab UI in Target Management to match the provided screenshot design with a clean split-panel layout, enhanced organization tree with role icons, and a streamlined allocation table.

---

## Changes Summary

### 1. OrganizationTree.tsx - Enhanced Tree with Role Icons

**Visual Changes:**
- Replace avatars with role-based icons:
  - Level 0 (Root/CEO): Filled circle icon
  - Level 1 (Managers): Cloud/building icon  
  - Level 2+ (Field staff): Map pin icon
- Add vertical tree connector lines
- Improved expand/collapse chevron indicators
- Clean selected state styling

**Code Changes:**
- Import `Circle`, `Building2`, `MapPin` icons from lucide-react
- Add `getRoleIcon(level)` helper function
- Update `renderNode` to use role icons instead of avatars
- Improve tree line styling with proper border connectors

---

### 2. TargetSummaryCard.tsx - Redesigned Header Card

**Visual Changes:**
- New layout: "Target: {plan_name}" as main title
- "Locked" badge in green with lock icon (right side)
- "Total Target" section label
- FY year display in top-right corner
- Clean 3-column grid for metrics (Quantity, Productive Visits, Revenue)

**Code Changes:**
- Update card gradient to light green/teal tint
- Restructure header layout with title format change
- Add "Total Target" label with underline
- Update badge styling to green variant

---

### 3. AllocationTable.tsx - Clean Table Layout

**Visual Changes:**
- Section header: "Allocation Method"
- Clean table structure with columns:
  - Target (name)
  - Quantity (editable input with unit)
  - Progress bar (color-coded based on %)
  - ₹ Total (revenue value)
- "Remaining: X" row at bottom
- Prominent "Save Allocation" button centered at bottom

**Code Changes:**
- Convert from card-based rows to proper table layout
- Remove collapsible/expandable sections (flatten to simple rows)
- Add progress bar colors: green (0-60%), yellow (60-85%), red (85%+)
- Move remaining display to table footer row
- Center save button at bottom with icon

---

### 4. HierarchyAllocationTab.tsx - Minor Layout Updates

**Changes:**
- Adjust grid proportions for better balance
- Ensure proper spacing between components

---

## File Changes

| File | Type | Description |
|------|------|-------------|
| `src/components/admin/OrganizationTree.tsx` | Modify | Add role icons, tree lines, enhanced styling |
| `src/components/admin/TargetSummaryCard.tsx` | Modify | Redesign header, add Total Target section |
| `src/components/admin/AllocationTable.tsx` | Modify | Convert to table layout, redesign footer |
| `src/components/admin/HierarchyAllocationTab.tsx` | Modify | Minor layout adjustments |

---

## Expected Result

The updated UI will feature:
- Left panel: Organization tree with role-based icons and clean hierarchy lines
- Right panel top: Target summary card with "Locked" badge and FY display
- Right panel bottom: Clean allocation table with progress bars and centered save button
