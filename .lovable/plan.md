
# Phase 1: Admin Target Management Redesign

## Overview

This plan consolidates all target management functionality into a single, powerful admin interface at `/admin/target-vs-actual`. We will integrate the existing Hierarchy-wise Targets UI components directly into the Target vs Actual page, removing redundancy and creating a unified experience.

## Current State Analysis

| Component | Location | Purpose |
|-----------|----------|---------|
| Target vs Actual | `/admin/target-vs-actual` | Individual user target setting + dashboard |
| Hierarchy Targets | `/admin/hierarchy-targets` | Top-down cascade target allocation |
| UserFYPlanTarget | Component | Detailed FY plan with Product/Retailer/Month breakdowns |

**Issues with Current State:**
- Two separate pages for related functionality
- No unified target configuration (basis, parameters)
- Hierarchy targets isolated from individual targets
- Admin must navigate between pages

## Proposed UI Structure

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         Target vs Actual                                  │
│              Unified Admin Target Management                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TOP CONTROL BAR                                                         │
│  ┌────────────┐ ┌──────────────────┐ ┌───────────┐ ┌──────────────────┐ │
│  │ FY: 2026   │ │ Mode: Hierarchy ▼│ │ Root User │ │ Actions: ⋯       │ │
│  └────────────┘ └──────────────────┘ └───────────┘ └──────────────────┘ │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │ [ Target Config ] [ Assign Targets ] [ Target vs Actual ]            ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  TAB 1: TARGET CONFIGURATION (NEW)                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │  Target Basis:    ☑ Quantity  ☑ Revenue  ☐ Visits                   ││
│  │  Parameters:      ☑ Product   ☑ Retailer  ☑ Beat  ☑ Distributor     ││
│  │                   ☑ Territory ☑ Monthly                              ││
│  │  Quantity Unit:   [ Kg ▼ ]                                           ││
│  │  Revenue Unit:    ₹ (Fixed)                                          ││
│  │                                           [ Save Configuration ]     ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  TAB 2: ASSIGN TARGETS                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │  Mode Toggle: ( ) Individual Users  (•) Hierarchy Cascade            ││
│  │                                                                       ││
│  │  [HIERARCHY MODE]                                                     ││
│  │  Uses existing HierarchyTargetBuilder component                       ││
│  │  - Set total Qty/Rev at top                                          ││
│  │  - Allocation: Equal / Percentage / Manual                           ││
│  │  - Visual tree with all subordinates                                 ││
│  │  - Save Draft / Publish to sync                                      ││
│  │                                                                       ││
│  │  [INDIVIDUAL MODE]                                                    ││
│  │  Uses existing TopControlBar + UserFYPlanTarget                      ││
│  │  - Select Single/Multiple/All Team                                   ││
│  │  - Edit targets per user                                             ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  TAB 3: TARGET VS ACTUAL (Enhanced)                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │  Filters: Period [Month▼] Date [Jan 2026] Basis [Revenue▼]          ││
│  │                                                                       ││
│  │  Summary Cards: Total | Achieved | In Progress | Not Achieved        ││
│  │                                                                       ││
│  │  Team Performance Table (existing TeamTargetDashboard)               ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. New: Target Configuration Tab

**Purpose:** Admin defines once per FY what metrics and parameters to track

**Database:** Use existing `target_setup_master` table or create new `fy_target_config`

| Field | Type | Description |
|-------|------|-------------|
| fy_year | integer | Financial year |
| enable_quantity | boolean | Track quantity targets |
| enable_revenue | boolean | Track revenue targets |
| enable_visits | boolean | Track visit targets |
| quantity_unit | text | Kg, Units, Liters, etc. |
| enabled_parameters | jsonb | {product, retailer, beat, distributor, territory, monthly} |

**UI Components:**
- Checkbox group for Target Basis (Quantity/Revenue/Visits)
- Checkbox group for Parameters
- Dropdown for Quantity Unit
- Save button

### 2. Redesigned Assign Targets Tab

**Mode Selector:**
- Individual Users: Uses existing `TopControlBar` + `UserFYPlanTarget`
- Hierarchy Cascade: Uses existing `HierarchyTargetBuilder`

**Hierarchy Mode Integration:**
- Import `HierarchyTargetBuilder` component
- Add Root User selector (managers/top-level)
- Show allocation method (Equal/Percentage/Manual)
- Display hierarchy tree with targets
- Save Draft / Publish buttons

**Individual Mode:**
- Keep existing TopControlBar with Scope selector
- UserFYPlanTarget for detailed breakdowns

### 3. Enhanced Target vs Actual Tab

**Keep existing functionality:**
- Period/Date/Basis filters
- Summary cards
- Team Performance table

**Add:**
- Export to Excel button (already in TopControlBar)
- Click-through to user details

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/TargetVsActual.tsx` | Major restructure - add 3 tabs, integrate hierarchy |
| `src/components/admin/TopControlBar.tsx` | Add mode selector, simplify for hierarchy mode |
| `src/components/admin/AdminSetTarget.tsx` | Refactor to support both modes |
| New: `src/components/admin/TargetConfigTab.tsx` | FY target configuration UI |
| New: `src/components/admin/AssignTargetsTab.tsx` | Unified assign targets with mode toggle |

## Component Architecture

```text
TargetVsActual.tsx (Page)
├── TopControlBar (FY selector, mode, actions)
├── Tabs
│   ├── TargetConfigTab (NEW)
│   │   └── FY configuration form
│   ├── AssignTargetsTab (NEW)
│   │   ├── ModeToggle (Individual / Hierarchy)
│   │   ├── [If Hierarchy]
│   │   │   ├── RootUserSelector
│   │   │   └── HierarchyTargetBuilder (EXISTING)
│   │   └── [If Individual]
│   │       ├── UserScopeSelector
│   │       └── UserFYPlanTarget (EXISTING)
│   └── TeamTargetDashboard (EXISTING - enhanced)
```

## Database Changes

**Option: Use existing tables (Recommended for Phase 1)**

The existing tables already support this:
- `hierarchy_targets` - Top-level targets with cascade
- `hierarchy_target_allocations` - Per-user allocations
- `user_business_plans` - Individual user FY targets
- `user_business_plan_months` - Monthly breakdowns

**New table for configuration:**

```sql
CREATE TABLE IF NOT EXISTS fy_target_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fy_year INTEGER NOT NULL UNIQUE,
  enable_quantity BOOLEAN DEFAULT true,
  enable_revenue BOOLEAN DEFAULT true,
  enable_visits BOOLEAN DEFAULT false,
  quantity_unit TEXT DEFAULT 'Kg',
  enabled_parameters JSONB DEFAULT '{"product":true,"retailer":true,"beat":true,"distributor":true,"territory":true,"monthly":true}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
```

## Navigation Changes

**Remove duplicate page:**
- Keep `/admin/target-vs-actual` as the unified page
- Redirect `/admin/hierarchy-targets` to `/admin/target-vs-actual?mode=hierarchy`
- Update AdminControls.tsx to remove separate Hierarchy Targets card (or keep as shortcut)

## Phase 1 Scope Boundaries

**Included:**
- Admin can configure FY target settings
- Admin can set targets via hierarchy cascade OR individual
- Admin can view Target vs Actual for all users
- All existing functionality preserved

**Excluded (Future Phases):**
- Supervisor role-based views
- User My Target page changes
- Automated hierarchy enforcement
- Visit-based targets calculation

## Implementation Order

1. Create `fy_target_config` table with migration
2. Create `TargetConfigTab.tsx` component
3. Create `AssignTargetsTab.tsx` with mode toggle
4. Refactor `TargetVsActual.tsx` to use 3-tab structure
5. Import and integrate `HierarchyTargetBuilder`
6. Update routing to redirect old hierarchy page
7. Test all flows end-to-end

## Technical Notes

- Reuse `HierarchyTargetBuilder` and `HierarchyTargetNode` components as-is
- Reuse `UserFYPlanTarget` for individual user editing
- Reuse `TeamTargetDashboard` for the dashboard tab
- Keep existing hooks: `useHierarchyTargets`, `useTeamTargetProgress`
- Admin access check via `useAdminAccess` hook (already in place)

## Expected Result

After implementation, admins will have a single, powerful page to:
1. Configure what to track (Qty/Rev/Visits + parameters)
2. Set targets via hierarchy cascade OR per-user
3. View consolidated Target vs Actual dashboard
4. Export data and manage bulk operations

This eliminates the need for two separate admin pages and provides a streamlined experience.
