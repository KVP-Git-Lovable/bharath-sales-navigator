
# Plan: Fix Value Calculations to Use `total_amount` Instead of `subtotal`

## Problem Summary

In the Supervisor Report's "Order Summary by User" section, three areas are calculating order values incorrectly:

| Location | Current Behavior | Expected Behavior |
|----------|-----------------|-------------------|
| User Order Summary (Total Order Value) | Uses `SUM(order_items.total)` = subtotal | Should use `orders.total_amount` |
| Beat-wise Split (Value) | Uses `SUM(order_items.total)` = subtotal | Should use `orders.total_amount` |
| Retailer Details (Value) | Uses `SUM(order_items.total)` = subtotal | Should use `orders.total_amount` |

**Example from database:**
- `subtotal` / `SUM(order_items.total)`: 17,943.00
- `total_amount`: 18,840.00 (includes taxes/charges)

## Root Cause

The code fetches orders but doesn't include `total_amount` in the select, then makes a separate query to `order_items` to sum up the `total` field. This gives the subtotal instead of the final order amount.

## Solution

Modify three functions in `SupervisorReport.tsx` to select and use `orders.total_amount` directly instead of summing `order_items.total`.

---

## Technical Changes

### 1. Fix `fetchSummaryData()` (Lines 254-354)

**Current approach:**
```typescript
.select(`id, user_id, order_items (total)`)
// Then sums order_items.total per order
```

**New approach:**
```typescript
.select(`id, user_id, total_amount`)
// Use total_amount directly for each order
```

### 2. Fix `fetchBeatBreakdown()` (Lines 1038-1132)

**Current approach:**
- Fetches orders without `total_amount`
- Makes separate query to `order_items` for totals
- Sums `order_items.total`

**New approach:**
- Add `total_amount` to the orders select
- Use `order.total_amount` directly instead of summing order items
- Remove the separate `order_items` query

### 3. Fix `fetchRetailerDetailsForBeat()` (Lines 1148-1254)

**Current approach:**
- Same pattern - fetches orders, then order_items separately
- Sums `order_items.total`

**New approach:**
- Add `total_amount` to the orders select
- Use `order.total_amount` directly
- Remove the separate `order_items` query

### 4. Fix `fetchOrderDetailsBeatBreakdownForUser()` (Lines 693-792)

**Current approach:**
- Fetches orders without `total_amount`
- Sums `order_items.total` per order

**New approach:**
- Add `total_amount` to the orders select
- Use it directly for beat grouping

---

## Summary of Changes

| Function | Line Range | Change |
|----------|-----------|--------|
| `fetchSummaryData` | ~262-334 | Select `total_amount`, use directly |
| `fetchOrderDetailsBeatBreakdownForUser` | ~720-773 | Select `total_amount`, remove order_items query |
| `fetchBeatBreakdown` | ~1069-1114 | Select `total_amount`, remove order_items query |
| `fetchRetailerDetailsForBeat` | ~1177-1235 | Select `total_amount`, remove order_items query |

All four functions will be simplified by removing the extra `order_items` query and using the pre-calculated `total_amount` from the orders table, ensuring accurate totals that include taxes and additional charges.
