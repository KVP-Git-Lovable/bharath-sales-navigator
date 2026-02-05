
# Plan: Dynamic Target Parameter Tab Rendering

## Overview
Update the `UserFYPlanTarget` component to dynamically render only the tabs corresponding to the enabled target parameters from the FY configuration. Currently, all 5 tabs (Products, Retailers, Distributors, Monthly, Territory) are always displayed regardless of the configuration.

## Technical Analysis

### Current State
- `UserFYPlanTarget` component accepts an `enabledParameters` prop (lines 196-203)
- The prop structure matches the FY config: `{ product, retailer, beat, distributor, territory, monthly }`
- However, the tabs section (lines 1927-1949) renders a static 5-column grid with all tabs visible
- When used via `ApplyToUsersStep` or `HierarchyUserTargetNode`, the parameters are passed correctly

### Issue
The tabs are hardcoded and don't respect the `enabledParameters` configuration. The component should:
1. Only show tabs for enabled parameters
2. Default to the first available enabled tab
3. Adjust the grid layout based on the number of visible tabs

## Implementation Plan

### Step 1: Create a Computed Enabled Tabs Array
Add a `useMemo` hook to compute which tabs should be visible:

```text
┌─────────────────────────────────────────────────────────┐
│ enabledParameters?.product  → Products tab             │
│ enabledParameters?.retailer → Retailers tab            │
│ enabledParameters?.distributor → Distributors tab      │
│ enabledParameters?.monthly → Monthly tab               │
│ enabledParameters?.territory → Territory tab           │
└─────────────────────────────────────────────────────────┘
```

### Step 2: Update TabsList Grid Columns
Change from static `grid-cols-5` to dynamic grid columns based on the number of enabled tabs:
- 1 tab: `grid-cols-1`
- 2 tabs: `grid-cols-2`
- 3 tabs: `grid-cols-3`
- 4 tabs: `grid-cols-4`
- 5 tabs: `grid-cols-5`

### Step 3: Conditionally Render Tab Triggers and Content
Wrap each `TabsTrigger` and `TabsContent` in conditional blocks:
- `{shouldShowTab.products && <TabsTrigger value="products">...}`
- Same pattern for all 5 tabs

### Step 4: Dynamic Default Tab Selection
Set the default tab value to the first enabled tab instead of hardcoded "products":
- If product enabled → "products"
- Else if retailer enabled → "retailers"
- And so on...

### Step 5: Fallback Behavior
When `enabledParameters` is undefined (self-use mode), show all tabs for backward compatibility.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/profile/UserFYPlanTarget.tsx` | Add conditional tab rendering logic based on `enabledParameters` prop |

## Edge Cases
- **No parameters passed**: Show all tabs (backward compatibility for My Target page)
- **All parameters disabled**: Show empty state with message
- **Single parameter**: Show single tab without grid (or minimal grid)

## Visual Outcome
When user enables "Product-wise" and "Monthly-wise" only:
- Only 2 tabs visible: Products and Monthly
- TabsList renders as `grid-cols-2`
- Default tab is "products"
