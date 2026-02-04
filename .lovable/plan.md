
# Plan: Fix Team Performance Display - KG Units and Proper Target Calculations

## Problem Summary
Based on the screenshot and code analysis, three issues need to be addressed:

1. **Unit Display Issue**: Quantities are showing as "K" (e.g., "2.1K", "27.5K") instead of "KG" when the Target Basis is set to Quantity
2. **Monthly Target Details**: When monthly period is selected, the system correctly fetches from `user_business_plan_months`, but the actual quantity needs unit-aware conversion (grams to KG)
3. **Daily Target Calculation**: Daily targets should use the `working_days` stored in `user_business_plan_months` table rather than computing generically

## Root Cause Analysis

### Issue 1: Unit Display
The `formatValue` function in `TeamTargetDashboard.tsx` (lines 65-74) uses generic "K" suffix for large numbers:
```javascript
// Current code
if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
```
This doesn't differentiate between quantity units (which should be KG) and generic counts.

### Issue 2: Actual Quantity Calculation
The `useTeamTargetProgress` hook (lines 171-175) sums raw quantities from `order_items` without converting gram-based units to KG:
```javascript
// Current - missing unit conversion
actual = userOrders.reduce((sum, o) => {
  const orderQty = (o.order_items as any[])?.reduce((qSum, item) => 
    qSum + (item.quantity || 0), 0) || 0;
  return sum + orderQty;
}, 0);
```

### Issue 3: Daily Target Calculation
The daily target calculation (lines 158-161) uses a computed working days count instead of the stored `working_days` from `user_business_plan_months`:
```javascript
// Current - uses computed working days
const workingDays = getWorkingDaysInMonth(date);
target = monthlyTarget / workingDays;
```

## Solution Overview

### Step 1: Update useTeamTargetProgress Hook
**File:** `src/hooks/useTeamTargetProgress.ts`

Changes:
1. Fetch unit information from `order_items` along with quantity
2. Convert gram-based quantities to KG using the established pattern
3. Use stored `working_days` from `user_business_plan_months` for daily target pro-rating
4. Calculate weekly targets using actual weekly working days (6 days/week)

### Step 2: Update TeamTargetDashboard Display
**File:** `src/components/admin/TeamTargetDashboard.tsx`

Changes:
1. Update `formatValue` function to show "KG" suffix for quantity-based metrics instead of "K"
2. Keep the "K" abbreviation only for very large numbers, converting to "KG" appropriately

## Technical Implementation Details

### Hook Changes (useTeamTargetProgress.ts)

```text
Query Enhancement:
┌─────────────────────────────────────────┐
│ Current: order_items(quantity)          │
│ Updated: order_items(quantity, unit)    │
└─────────────────────────────────────────┘

Quantity Calculation:
┌─────────────────────────────────────────┐
│ For each order_item:                    │
│   - If unit = 'grams'/'gram'/'g':       │
│       quantity_kg = quantity / 1000     │
│   - Else (kg, bag, etc):                │
│       quantity_kg = quantity            │
│   - Sum all quantity_kg                 │
└─────────────────────────────────────────┘

Daily Target Calculation:
┌─────────────────────────────────────────┐
│ Use: monthTarget.working_days           │
│ Fallback: getWorkingDaysInMonth()       │
└─────────────────────────────────────────┘
```

### Display Changes (TeamTargetDashboard.tsx)

```text
formatValue Function Update:
┌──────────────────────────────────────────────────────────────┐
│ Quantity Basis:                                              │
│   - Value >= 1000: Show "X.X KG" (no division needed, raw KG)│
│   - Value < 1000:  Show "X.XX KG"                            │
│                                                              │
│ Revenue Basis (unchanged):                                   │
│   - Value >= 100000: "₹X.XL"                                 │
│   - Value >= 1000:   "₹X.XK"                                 │
│   - Value < 1000:    "₹X"                                    │
└──────────────────────────────────────────────────────────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useTeamTargetProgress.ts` | 1. Add `unit` to order_items query<br>2. Implement gram→KG conversion in actual calculation<br>3. Use stored `working_days` for daily target |
| `src/components/admin/TeamTargetDashboard.tsx` | Update `formatValue` to show "KG" suffix for quantity basis |

## Expected Outcome

After implementation:
1. **Quantity Display**: Values will show "2.1 KG", "27.5 KG", "74.0 KG" instead of "2.1K", "27.5K", "74.0K"
2. **Accurate Actuals**: Gram-based product quantities will be correctly converted to KG matching the target units
3. **Daily Targets**: Will use the configured working days from the business plan, ensuring accurate daily pro-rating
4. **Weekly Targets**: Will calculate properly based on 6-day work weeks

## Data Flow Summary

```text
Monthly Target Data:
┌─────────────────────────────────────────────────────────────┐
│ user_business_plan_months                                   │
│ ├── quantity_target: 2100 (KG)                              │
│ └── working_days: 24                                        │
│                                                             │
│ Daily Target = 2100 / 24 = 87.5 KG                          │
│ Weekly Target = (2100 / 4) = 525 KG (approx 4 weeks/month)  │
└─────────────────────────────────────────────────────────────┘

Actual Calculation:
┌─────────────────────────────────────────────────────────────┐
│ order_items                                                 │
│ ├── Product A: 500 grams → 0.5 KG                           │
│ ├── Product B: 2 kg → 2 KG                                  │
│ └── Product C: 1000 grams → 1 KG                            │
│                                                             │
│ Total Actual = 3.5 KG                                       │
└─────────────────────────────────────────────────────────────┘
```
