
# Plan: Display Combined Product-wise + Month-wise Target Data in Target vs Actual View

## Problem Summary
The "Target vs Actual" tab in Target Management only shows Month-wise target data. When both "Product-wise" and "Monthly-wise" parameters are enabled in the configuration, users expect to see combined data showing targets broken down by both product AND month - matching the structure already implemented in the Target allocation module (`UserFYPlanTarget`).

## Technical Analysis

### Current Data Flow
```text
┌─────────────────────────────────────────────────────────────────────┐
│                    Current Target vs Actual View                    │
├─────────────────────────────────────────────────────────────────────┤
│  useTeamTargetProgress hook fetches:                                │
│    - user_business_plans (yearly totals)                            │
│    - user_business_plan_months (monthly breakdowns)                 │
│    - orders (actual performance)                                    │
│                                                                     │
│  Does NOT fetch:                                                    │
│    - fy_target_config (to check enabled_parameters)                 │
│    - user_business_plan_month_products (product + month combined)   │
└─────────────────────────────────────────────────────────────────────┘
```

### Target Data Tables
| Table | Purpose |
|-------|---------|
| `fy_target_config` | Stores enabled_parameters (product, monthly, etc.) |
| `user_business_plans` | User's annual targets |
| `user_business_plan_months` | Monthly breakdown of targets |
| `user_business_plan_products` | Product-wise breakdown |
| `user_business_plan_month_products` | Combined product + month targets |

### Where Combined Data is Already Implemented
The `UserFYPlanTarget` component (lines 661-700) already handles the combined product-month data:
- Fetches from `user_business_plan_month_products`
- Creates `MonthProductTarget` objects with both month and product info
- Renders the Monthly tab with product breakdown inside each month

## Implementation Plan

### Step 1: Enhance useTeamTargetProgress Hook
Modify `src/hooks/useTeamTargetProgress.ts` to:
1. Accept an optional `enabledParameters` configuration
2. Fetch `user_business_plan_month_products` when both `product` and `monthly` are enabled
3. Return product-level breakdown data alongside the existing aggregated data

### Step 2: Create Product-Month Progress Interface
Add new interface to represent combined product-month progress:
```text
interface ProductMonthProgress {
  productId: string;
  productName: string;
  monthNumber: number;
  monthName: string;
  target: number;
  actual: number;
  achievementPercentage: number;
}
```

### Step 3: Update TeamTargetDashboard Component
Modify `src/components/admin/TeamTargetDashboard.tsx` to:
1. Fetch `fy_target_config` for the selected FY year to get `enabled_parameters`
2. Pass the configuration to `useTeamTargetProgress`
3. Add a expandable/drill-down view for users that shows product-month breakdown when applicable
4. Display a "Product + Monthly" combined table when both parameters are enabled

### Step 4: Create ProductMonthBreakdownTable Component
Create a new component `src/components/admin/ProductMonthBreakdownTable.tsx` that:
- Displays a matrix/grid of products vs months
- Shows target, actual, and achievement for each cell
- Matches the visual style used in `UserFYPlanTarget`'s Monthly tab

### Step 5: Calculate Actual Sales by Product-Month
Enhance the actual sales calculation to:
- Join `orders` → `order_items` → `products`
- Group actuals by product_id and month
- Match against the product-month targets

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useTeamTargetProgress.ts` | Add product-month data fetching and processing |
| `src/components/admin/TeamTargetDashboard.tsx` | Add FY config fetch, pass to hook, add drill-down UI |
| `src/components/admin/ProductMonthBreakdownTable.tsx` | New component for product-month matrix view |

## UI Changes

### Current View (Only Monthly)
```text
┌────────────────────────────────────────────┐
│ Team Performance (aggregated by user)      │
├────────────────────────────────────────────┤
│ User | Target | Actual | Progress | Status │
└────────────────────────────────────────────┘
```

### Enhanced View (Product + Monthly)
```text
┌────────────────────────────────────────────────────────────┐
│ Team Performance                                           │
├────────────────────────────────────────────────────────────┤
│ ▶ User A | Target | Actual | Progress | Status            │
│   └─ Product-Month Breakdown (expandable)                  │
│      ┌────────┬────────┬────────┬────────┐                │
│      │Product │  Apr   │  May   │  Jun   │ ...            │
│      ├────────┼────────┼────────┼────────┤                │
│      │Prod 1  │ 100/80 │ 120/90 │ 110/85 │                │
│      │Prod 2  │ 200/180│ 220/200│ 210/190│                │
│      └────────┴────────┴────────┴────────┘                │
└────────────────────────────────────────────────────────────┘
```

## Edge Cases
- If only "monthly" is enabled without "product": Show only monthly breakdown (current behavior)
- If only "product" is enabled without "monthly": Show only product breakdown (yearly totals)
- If neither is enabled: Show only aggregated user totals
- If no data exists in `user_business_plan_month_products`: Fallback to calculated splits from monthly totals

## Technical Notes
- The order_items table contains `product_id` which allows grouping actuals by product
- Working days calculation should use the same logic as `UserFYPlanTarget`
- Match the visual styling with emerald/green accents for achieved targets
