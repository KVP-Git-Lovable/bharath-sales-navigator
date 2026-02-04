

# Cancel Order Feature Implementation Plan

## Overview

This plan implements a **Cancel Order** feature that allows users to reverse an order completely, restoring the system to its state before the order was placed. This includes updating the order status, reverting visit status, reversing credit impacts, and adjusting gamification/performance metrics.

---

## Current State Analysis

### Data Flow When Order is Placed

When an order is confirmed, the following database updates occur:

```text
orders table
├── status: 'confirmed'
├── total_amount, credit_pending_amount, credit_paid_amount
│
├──► order_items table (linked via order_id)
│
├──► invoices table (linked via order_id)
│    └── status: 'issued'
│
├──► visits table (via trigger: auto_update_visit_status_on_order)
│    └── status: 'productive'
│
├──► retailers table (via trigger: update_retailer_last_order)
│    ├── pending_amount += credit_pending_amount
│    ├── last_order_date, last_order_value updated
│
├──► user_period_targets table (via trigger: update_revenue_actual)
│    └── actual_value += order total
│
└──► gamification_points table (via awardPointsForOrder)
     └── points awarded for the order
```

### Database Tables Affected

| Table | Column/Field | Impact |
|-------|--------------|--------|
| `orders` | `status` | Set to 'cancelled' |
| `invoices` | `status` | Set to 'cancelled' |
| `visits` | `status` | Revert from 'productive' to 'planned' |
| `visits` | `no_order_reason` | Clear (set to NULL) |
| `retailers` | `pending_amount` | Subtract `credit_pending_amount` |
| `retailers` | `last_order_date`, `last_order_value` | Recalculate from remaining orders |
| `user_period_targets` | `actual_value` | Recalculate revenue contribution |
| `gamification_points` | records with `reference_id = order_id` | Delete |
| `retailer_loyalty_points` | records linked to order | Delete |

---

## Implementation Plan

### Phase 1: Database Migration

Add cancellation tracking columns to the `orders` table:

```sql
ALTER TABLE orders 
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN cancellation_reason TEXT,
  ADD COLUMN cancelled_by UUID REFERENCES profiles(id);
```

### Phase 2: Create Cancel Order Dialog Component

**File**: `src/components/CancelOrderDialog.tsx` (new)

A modal dialog that:
1. Displays the order details being cancelled
2. Asks for a cancellation reason (dropdown + optional text)
3. Shows a confirmation step with impact summary
4. Handles the cancellation API call

**Reason Options**:
- Wrong order details
- Customer requested cancellation
- Duplicate order
- Pricing error
- Other (free text)

**UI Flow**:
```
┌─────────────────────────────────────────┐
│ Cancel Order                        [X] │
├─────────────────────────────────────────┤
│ Order: INV2026-XXX                      │
│ Retailer: रामदेव किराणा                   │
│ Amount: ₹12,450                         │
│                                         │
│ Reason for cancellation:                │
│ ┌───────────────────────────────────┐   │
│ │ Select reason...              ▼   │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ Additional notes (optional)...    │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ⚠️ This will:                           │
│   • Mark order as Cancelled             │
│   • Revert visit to Planned             │
│   • Reverse credit amount               │
│   • Remove gamification points          │
│                                         │
│     [Cancel]  [Confirm Cancellation]    │
└─────────────────────────────────────────┘
```

### Phase 3: Create Order Cancellation Utility

**File**: `src/utils/orderCancellation.ts` (new)

Core function that handles all data reversals:

```typescript
interface CancelOrderResult {
  success: boolean;
  error?: string;
  reversedData: {
    visitReverted: boolean;
    creditReversed: number;
    pointsRemoved: number;
    invoiceCancelled: boolean;
  };
}

async function cancelOrder(
  orderId: string, 
  reason: string, 
  userId: string
): Promise<CancelOrderResult>
```

**Cancellation Steps**:

1. **Validate Order**
   - Ensure order exists and is in 'confirmed' status
   - Check that order hasn't been delivered (`delivery_status` is null)

2. **Update Order Status**
   ```sql
   UPDATE orders 
   SET status = 'cancelled',
       cancelled_at = NOW(),
       cancellation_reason = $reason,
       cancelled_by = $userId
   WHERE id = $orderId
   ```

3. **Update Invoice Status**
   ```sql
   UPDATE invoices 
   SET status = 'cancelled' 
   WHERE order_id = $orderId
   ```

4. **Revert Visit Status**
   ```sql
   UPDATE visits 
   SET status = 'planned',
       no_order_reason = NULL,
       updated_at = NOW()
   WHERE id = (SELECT visit_id FROM orders WHERE id = $orderId)
   ```

5. **Reverse Retailer Credit**
   ```sql
   UPDATE retailers 
   SET pending_amount = pending_amount - $creditPendingAmount,
       updated_at = NOW()
   WHERE id = $retailerId
   ```

6. **Recalculate Retailer Analytics**
   - Find previous confirmed order for `last_order_date`, `last_order_value`
   - Update `avg_monthly_orders_3m` if needed

7. **Remove Gamification Points**
   ```sql
   DELETE FROM gamification_points 
   WHERE reference_type = 'order' 
     AND reference_id = $retailerId
     AND earned_at::date = $orderDate
   ```

8. **Remove Loyalty Points**
   ```sql
   DELETE FROM retailer_loyalty_points 
   WHERE order_id = $orderId
   ```

9. **Recalculate User Period Targets**
   - Trigger recalculation of `user_period_targets.actual_value` for revenue KPI

10. **Update Local Caches**
    - Clear `visitStatusCache` for this retailer
    - Update `myVisitsSnapshot` to remove the order
    - Dispatch `visitStatusChanged` event with `status: 'planned'`

### Phase 4: Add Cancel Button to VisitCard

**File**: `src/components/VisitCard.tsx`

In the order preview section (around line 2848-2920), add a "Cancel Order" button next to the "View" button:

```tsx
{orderPreviewOpen && (
  <>
    {/* Existing order details */}
    ...
    
    {/* Cancel Order Button */}
    <Button 
      variant="destructive" 
      size="sm"
      onClick={() => setShowCancelOrderDialog(true)}
      className="w-full mt-2"
    >
      <XCircle size={14} className="mr-2" />
      Cancel Order
    </Button>
  </>
)}
```

Add state and dialog:
```tsx
const [showCancelOrderDialog, setShowCancelOrderDialog] = useState(false);

// In render:
<CancelOrderDialog
  isOpen={showCancelOrderDialog}
  onClose={() => setShowCancelOrderDialog(false)}
  orderId={lastOrderId}
  invoiceNumber={ordersTodayList[0]?.invoice_number}
  retailerName={visit.retailerName}
  orderAmount={actualOrderValue}
  onCancelled={handleOrderCancelled}
/>
```

Handle cancellation callback:
```typescript
const handleOrderCancelled = async () => {
  // Reset local state to show retailer as "fresh"
  setHasOrderToday(false);
  setActualOrderValue(0);
  setCurrentStatus('planned');
  setOrderPreviewOpen(false);
  
  // Clear caches
  await visitStatusCache.invalidate(retailerId, userId, today);
  
  // Dispatch event for parent components
  window.dispatchEvent(new CustomEvent('orderCancelled', {
    detail: { retailerId, visitId }
  }));
  
  toast({ title: "Order cancelled successfully" });
};
```

### Phase 5: Update Snapshot Functions

**File**: `src/lib/myVisitsSnapshot.ts`

Add new function to remove an order from snapshot:

```typescript
export const removeOrderFromSnapshot = async (
  userId: string,
  date: string,
  orderId: string
): Promise<void> => {
  const snapshot = await loadMyVisitsSnapshot(userId, date);
  if (!snapshot) return;
  
  // Remove the order
  snapshot.orders = snapshot.orders.filter(o => o.id !== orderId);
  
  // Recalculate progress stats
  const totalOrders = snapshot.orders.length;
  const totalOrderValue = snapshot.orders.reduce((sum, o) => 
    sum + Number(o.total_amount || 0), 0
  );
  const retailersWithOrders = new Set(snapshot.orders.map(o => o.retailer_id));
  
  snapshot.progressStats = {
    ...snapshot.progressStats,
    totalOrders,
    totalOrderValue,
    productive: retailersWithOrders.size
  };
  
  // Save updated snapshot
  await saveSnapshotToStorage(snapshot);
};
```

### Phase 6: Update Today Summary

**File**: `src/pages/TodaySummary.tsx`

Ensure cancelled orders are excluded from totals:
```typescript
// Filter out cancelled orders when calculating totals
const confirmedOrders = orders.filter(o => o.status !== 'cancelled');
const totalOrderValue = confirmedOrders.reduce((sum, o) => sum + o.total_amount, 0);
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/CancelOrderDialog.tsx` | **Create** | Cancel order UI with reason input |
| `src/utils/orderCancellation.ts` | **Create** | Cancel order business logic |
| `src/components/VisitCard.tsx` | **Modify** | Add cancel button in order preview |
| `src/lib/myVisitsSnapshot.ts` | **Modify** | Add `removeOrderFromSnapshot` function |
| `src/lib/visitStatusCache.ts` | **Modify** | Add `invalidate` method (already exists) |
| `src/pages/TodaySummary.tsx` | **Modify** | Exclude cancelled orders from stats |
| Database migration | **Create** | Add cancellation columns to orders |

---

## Edge Cases & Validation

| Scenario | Handling |
|----------|----------|
| Order already delivered | Block cancellation, show error |
| Order already cancelled | Block re-cancellation |
| Partial delivery completed | Block cancellation (suggest return) |
| Offline mode | Queue cancellation for sync |
| Multiple orders same day | Only cancel selected order |
| Credit already collected | Warn user, allow cancel anyway |

---

## Testing Checklist

1. Cancel a cash order → verify visit returns to 'planned'
2. Cancel a credit order → verify `pending_amount` is reversed
3. Cancel order with gamification points → verify points removed
4. Cancel order offline → verify syncs when online
5. View cancelled order in retailer history → shows as cancelled
6. Place new order after cancellation → works as fresh retailer
7. Check Today Summary → cancelled orders excluded from totals
8. Check Supervisor Report → cancelled orders excluded from analytics

---

## Technical Details

### Database Migration SQL

```sql
-- Add cancellation tracking columns to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);

-- Create index for efficient cancelled order queries
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at 
  ON orders(cancelled_at) 
  WHERE cancelled_at IS NOT NULL;
```

### CancelOrderDialog Component Structure

```typescript
interface CancelOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  invoiceNumber?: string;
  retailerName: string;
  orderAmount: number;
  onCancelled: () => void;
}

const CANCELLATION_REASONS = [
  { value: 'wrong-details', label: 'Wrong order details' },
  { value: 'customer-request', label: 'Customer requested' },
  { value: 'duplicate-order', label: 'Duplicate order' },
  { value: 'pricing-error', label: 'Pricing error' },
  { value: 'other', label: 'Other' }
];
```

### Order Cancellation Utility Flow

```typescript
export async function cancelOrder(
  orderId: string,
  reason: string,
  userId: string
): Promise<CancelOrderResult> {
  // 1. Fetch order with related data
  const order = await fetchOrderWithDetails(orderId);
  
  // 2. Validate cancellable
  validateCancellable(order);
  
  // 3. Begin transaction-like operations
  await updateOrderStatus(orderId, 'cancelled', reason, userId);
  await updateInvoiceStatus(orderId, 'cancelled');
  
  if (order.visit_id) {
    await revertVisitStatus(order.visit_id);
  }
  
  if (order.is_credit_order && order.credit_pending_amount > 0) {
    await reverseRetailerCredit(order.retailer_id, order.credit_pending_amount);
  }
  
  await removeGamificationPoints(order.retailer_id, order.order_date);
  await removeLoyaltyPoints(orderId);
  await updateUserPeriodTargets(userId);
  
  // 4. Update local caches
  await clearLocalCaches(order.retailer_id, userId, order.order_date);
  
  return { success: true, ... };
}
```

