

# Hierarchy Cascade Target Assignment with Parameter-Filtered User View

## Overview

This plan enhances the **Apply to Users (Step 3)** in the Target Config wizard and the **Hierarchy Cascade mode** in Assign Targets tab to show:
1. Only the parameters that were selected in Step 1 (e.g., Beat, Monthly, Retailer)
2. A user-wise hierarchy view where each user's targets can be expanded to show parameter breakdowns
3. Support for multiple target types (Quantity/Kg, Revenue, Visits) with dropdowns for each parameter

## Current State

- **ApplyToUsersStep.tsx**: Shows allocation mode toggle but Hierarchy mode just redirects to Assign Targets tab
- **AssignTargetsTab.tsx**: Has Hierarchy Cascade mode with `HierarchyTargetBuilder` but only shows Qty/Revenue totals per user - no parameter breakdowns
- **UserFYPlanTarget.tsx**: Has full parameter tabs (Products, Retailers, Distributors, Monthly, Territory) but doesn't filter based on config

## Proposed UI Flow

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: APPLY TARGETS TO USERS (Hierarchy Cascade)                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FY Targets Summary: 50,000 Kg | ₹25,00,000 | 1,200 Visits                │
│                                                                             │
│  Enabled Parameters: [Beat] [Monthly] [Retailer]                           │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Target Type: [ Quantity (Kg) ▼ ]                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ HIERARCHY VIEW                                                        │  │
│  │                                                                        │  │
│  │ ▼ Girish (Manager)                    12,500 Kg | ₹6,25,000 | 300    │  │
│  │   │                                                                    │  │
│  │   │ ┌────────────────────────────────────────────────────────────┐    │  │
│  │   │ │ [ Beat ▼ ] [ Monthly ▼ ] [ Retailer ▼ ]                    │    │  │
│  │   │ │                                                              │    │  │
│  │   │ │ [BEAT TAB]                                                   │    │  │
│  │   │ │ Beat-1: 4,166 Kg | ₹2,08,333                                │    │  │
│  │   │ │ Beat-2: 4,166 Kg | ₹2,08,333                                │    │  │
│  │   │ │ Beat-3: 4,168 Kg | ₹2,08,334                                │    │  │
│  │   │ │                                                              │    │  │
│  │   │ │ [Equally divide across all beats] ✓                         │    │  │
│  │   │ └────────────────────────────────────────────────────────────┘    │  │
│  │   │                                                                    │  │
│  │   ├─ ▶ Ravi (Rep)                     6,250 Kg | ₹3,12,500 | 150     │  │
│  │   └─ ▶ Priya (Rep)                    6,250 Kg | ₹3,12,500 | 150     │  │
│  │                                                                        │  │
│  │ ▶ Suresh (Manager)                    12,500 Kg | ₹6,25,000 | 300    │  │
│  │                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [ ← Back ]                                         [ Apply Targets ]      │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Enhanced ApplyToUsersStep.tsx

Transform to use Hierarchy Cascade directly (not redirect to another tab):

**New Features:**
- Full hierarchy tree with expandable user nodes
- Each user node shows target totals (Qty/Rev/Visits based on config)
- Clicking "expand" on a user shows parameter breakdown tabs
- Only show tabs for enabled parameters from Step 1 config
- Target type selector dropdown at top (Quantity/Revenue/Visits)

### 2. New Component: HierarchyUserTargetNode

A new component that renders each user in the hierarchy with:
- Collapsible node showing user name, avatar, and target summary
- When expanded, shows filtered parameter tabs (only enabled params)
- Each parameter tab has:
  - "Equally divide" checkbox
  - List of items (beats/retailers/products/months) with individual targets
  - Editable target values

**Props:**
```typescript
interface HierarchyUserTargetNodeProps {
  node: {
    userId: string;
    fullName: string;
    profilePictureUrl: string | null;
    level: number;
    quantityTarget: number;
    revenueTarget: number;
    visitsTarget: number;
    children: HierarchyUserTargetNodeProps['node'][];
  };
  enabledParameters: {
    product: boolean;
    retailer: boolean;
    beat: boolean;
    distributor: boolean;
    territory: boolean;
    monthly: boolean;
  };
  enabledBasis: {
    quantity: boolean;
    revenue: boolean;
    visits: boolean;
  };
  quantityUnit: string;
  fyYear: number;
  selectedTargetType: 'quantity' | 'revenue' | 'visits';
  onTargetChange: (userId: string, field: string, value: number) => void;
}
```

### 3. Parameter Breakdown Components

Create lightweight parameter breakdown sub-components that work within the hierarchy node:

**UserBeatTargets.tsx** - For beat-wise breakdown:
- Fetch beats for the user
- Show equal divide option
- Individual beat target inputs

**UserRetailerTargets.tsx** - For retailer-wise breakdown:
- Fetch retailers for the user
- Category-grouped view
- Individual retailer target inputs

**UserMonthlyTargets.tsx** - For month-wise breakdown:
- 12-month FY grid
- Equal divide option
- Individual month targets

**UserProductTargets.tsx** - For product-wise breakdown:
- Reuse existing category-product hierarchy
- Equal divide per category

### 4. Data Flow

```text
fy_target_config (Step 1)
        │
        ▼
Set FY Totals (Step 2)
        │
        ▼
Hierarchy Allocation (Equal/Percentage/Manual)
        │
        ▼
Per-User Totals (Step 3 - Hierarchy View)
        │
        ▼
Parameter Breakdowns (Beat/Retailer/Month/Product)
        │
        ▼
Save to user_business_plan_* tables
```

### 5. Database Integration

**Saving user targets with breakdowns:**
- Create/update `user_business_plans` for each user with allocated targets
- Create/update `user_business_plan_beats` for beat breakdown
- Create/update `user_business_plan_retailers` for retailer breakdown
- Create/update `user_business_plan_months` for monthly breakdown
- Create/update `user_business_plan_products` for product breakdown

### 6. Component Structure

```text
ApplyToUsersStep.tsx (Refactored)
├── FY Targets Summary Banner
├── Enabled Parameters Badges
├── Target Type Selector
├── HierarchyTargetTree
│   └── HierarchyUserTargetNode (recursive)
│       ├── User Header (avatar, name, totals)
│       ├── Collapsible Expand
│       └── ParameterBreakdownTabs (only enabled params)
│           ├── UserBeatTargets (if beat enabled)
│           ├── UserRetailerTargets (if retailer enabled)
│           ├── UserMonthlyTargets (if monthly enabled)
│           ├── UserProductTargets (if product enabled)
│           ├── UserDistributorTargets (if distributor enabled)
│           └── UserTerritoryTargets (if territory enabled)
└── Action Buttons (Back, Apply)
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/target-config/ApplyToUsersStep.tsx` | **Major Refactor** | Add hierarchy view with parameter breakdowns |
| `src/components/admin/target-config/HierarchyUserTargetNode.tsx` | **Create** | Collapsible user node with parameter tabs |
| `src/components/admin/target-config/UserBeatTargets.tsx` | **Create** | Beat breakdown sub-component |
| `src/components/admin/target-config/UserRetailerTargets.tsx` | **Create** | Retailer breakdown sub-component |
| `src/components/admin/target-config/UserMonthlyTargets.tsx` | **Create** | Monthly breakdown sub-component |
| `src/components/admin/target-config/UserProductTargets.tsx` | **Create** | Product breakdown sub-component |
| `src/components/admin/target-config/UserDistributorTargets.tsx` | **Create** | Distributor breakdown sub-component |

## Key Behaviors

1. **Parameter Filtering**: Only tabs for enabled parameters are shown
2. **Target Type Toggle**: Dropdown to switch view between Quantity/Revenue/Visits
3. **Equal Divide**: Each parameter tab has option to equally distribute
4. **Hierarchy Display**: Tree structure with expand/collapse for each user
5. **Real-time Totals**: Sum validation to ensure parameter totals match user target
6. **Auto-populate**: When expanding a user, auto-populate from existing data or equal divide

## Technical Notes

- Reuse `get_all_subordinates` RPC for building hierarchy tree
- Reuse existing beat/retailer/product fetching logic from UserFYPlanTarget
- Use Supabase upsert pattern for saving breakdowns
- Maintain state per-user in a Map for performance
- Lazy load parameter data only when user node is expanded

## Visual Reference (from user screenshot)

The user's screenshot shows the desired view:
- User-specific target card with "Setting targets for: Girish"
- FY Overview card with Qty Target and Revenue Target
- Tabs at bottom: Products | Retailers | Distributors | Monthly | Territory
- "Equally divide across all products" checkbox

This plan implements the same view but:
1. Within the hierarchy cascade context
2. Filtered to only show enabled parameters
3. With support for multiple target types (Qty/Revenue/Visits)

