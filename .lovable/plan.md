

# Fix: Complete Gamification Points Reversal on Order Cancellation

## Problem Identified

When an order is cancelled, the system only removes gamification points with `reference_type = 'order'`. However, the order placement process (`awardPointsForOrder`) also awards points with `reference_type = 'visit'` (for "Productive visits with orders"). These visit-type points are **never cleaned up**, which is what you're seeing in the Points Breakdown.

## What Gets Created When an Order is Placed

| Data | Table | reference_type | Reversed on Cancel? |
|------|-------|---------------|---------------------|
| Order-based points (first order, daily target, focused product, etc.) | `gamification_points` | `order` | Yes (partially) |
| Productive visit points | `gamification_points` | `visit` | **NO - this is the bug** |
| Retailer consecutive order tracking | `gamification_retailer_sequences` | N/A | **NO** |
| Daily tracking counts | `gamification_daily_tracking` | N/A | **NO** |
| Loyalty points | `retailer_loyalty_points` | `order` | Yes |
| Visit status | `visits` | N/A | Yes |
| Retailer credit/analytics | `retailers` | N/A | Yes |
| Invoice | `invoices` | N/A | Yes |

## Fix Plan

### Step 1: Update `removeGamificationPoints` in `orderCancellation.ts`

Change the function to remove **all** gamification points for this user + retailer on the order date, regardless of `reference_type`. This catches both `order` and `visit` type points.

- Remove the `.eq('reference_type', 'order')` filter
- Instead, query for points where `reference_id = retailerId` (both order and visit points use retailer ID as reference)
- Keep the date range filter to scope it to the correct day

### Step 2: Add `gamification_retailer_sequences` reversal

Add a new function `reverseRetailerSequence` that decrements the `consecutive_orders` count for the retailer when an order is cancelled. If it reaches 0, delete the record.

### Step 3: Add `gamification_daily_tracking` reversal

Add a function to decrement the daily tracking count for the user on the order date, preventing stale daily limits.

### Step 4: Dispatch `pointsEarned` event after cancellation

After removing points, dispatch a `pointsEarned` event so all UI components (Points Breakdown modal, leaderboard, summary cards) refresh immediately without needing a manual page refresh.

## Technical Details

**File modified:** `src/utils/orderCancellation.ts`

1. `removeGamificationPoints()` -- Remove `reference_type` filter so both `order` and `visit` points are deleted for that retailer + date
2. New `reverseRetailerSequence()` -- Decrement or delete from `gamification_retailer_sequences`
3. New `reverseDailyTracking()` -- Decrement counts in `gamification_daily_tracking`
4. In `clearLocalCaches()` -- Add `pointsEarned` event dispatch for instant UI refresh of gamification components
5. In `cancelOrder()` -- Call the two new reversal functions

No database migrations needed -- this is purely a code logic fix.

