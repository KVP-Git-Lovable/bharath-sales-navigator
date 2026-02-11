

## Multi-Invoice Selection for Order Cancellation

### Problem
Currently, clicking "Cancel Order" passes only a single `orderId` and one invoice number to the `CancelOrderDialog`. When a retailer has multiple orders/invoices placed on the same visit, the user cannot select which specific orders to cancel.

### Solution
Redesign the `CancelOrderDialog` to accept the full list of orders for the visit and let the user select which ones to cancel. Each selected order gets fully reversed independently. If ALL orders for the visit are cancelled, the visit reverts to "planned"; otherwise it stays "productive".

---

### Changes

#### 1. `src/components/CancelOrderDialog.tsx` -- Major rewrite

**New props:**
- Replace single `orderId` + `invoiceNumber` + `orderAmount` with `orders: Array<{ id, invoice_number, total_amount, is_credit_order, credit_pending_amount }>`
- Keep `retailerName`, `onCancelled`, `isOpen`, `onClose`

**New UI flow:**

Step 1 -- Invoice Selection:
- Show a list of all orders as selectable cards (checkbox per order)
- Each card shows: invoice number, amount, credit badge if applicable
- "Select All" toggle at top
- Selected count + total amount shown at bottom
- "Continue" button (disabled until at least one selected)

Step 2 -- Reason:
- Same reason dropdown + notes textarea as current

Step 3 -- Confirm:
- Summary of selected invoices being cancelled
- Warning about reversals (visit revert only if ALL orders cancelled)
- Confirm button

**Cancellation logic:**
- Loop through each selected order and call `cancelOrder()` from `orderCancellation.ts`
- Track success/failure per order
- Show summary toast

#### 2. `src/utils/orderCancellation.ts` -- Visit revert logic fix

**Problem:** `revertVisitStatus` currently always reverts the visit to "planned" when any order is cancelled. If 3 orders exist and only 1 is cancelled, the visit should stay "productive".

**Fix:** Add a check in `revertVisitStatus` -- before reverting, query if any other confirmed orders remain for this visit. Only revert to "planned" if zero confirmed orders remain.

New helper function:
```text
async function hasRemainingConfirmedOrders(visitId: string, excludeOrderId: string): Promise<boolean>
  SELECT count(*) FROM orders WHERE visit_id = visitId AND id != excludeOrderId AND status = 'confirmed'
```

Modify `cancelOrder()` to use this check before reverting.

#### 3. `src/components/VisitCard.tsx` -- Pass full order list

Change the `CancelOrderDialog` invocation:
- Pass `orders={ordersTodayList}` instead of single `orderId`
- Update `onCancelled` callback to:
  - Remove only cancelled orders from `ordersTodayList`
  - Recalculate `actualOrderValue`, `creditPendingAmount`, `paidTodayAmount`
  - Only reset to "planned" if all orders were cancelled

---

### Reversal Completeness Checklist

Each cancelled order already triggers these reversals in `cancelOrder()`:
1. Order status set to `cancelled` with timestamp, reason, cancelled_by
2. Invoice status set to `cancelled`
3. Visit status reverted (now conditional -- only if no remaining orders)
4. Retailer `pending_amount` reduced by credit amount
5. Retailer `last_order_date` / `last_order_value` recalculated
6. Gamification points deleted
7. Loyalty points deleted
8. Local caches invalidated + UI events dispatched
9. DB triggers auto-fire: `update_retailer_analytics` recalculates 3-month metrics, `update_revenue_actual` recalculates KPI targets

No additional reversal logic is needed -- the existing `cancelOrder()` function is comprehensive.

### Cancelled Orders Visibility
Cancelled orders are already excluded from active queries (most queries filter `status = 'confirmed'`). They remain in the `orders` table with `status = 'cancelled'` and are accessible in admin/history views.

---

### Technical Details

**Files to modify:**
- `src/components/CancelOrderDialog.tsx` -- Multi-select UI with 3-step flow
- `src/utils/orderCancellation.ts` -- Conditional visit revert
- `src/components/VisitCard.tsx` -- Pass full order list, partial cancellation state management

**No new files needed.**

**No database changes needed** -- all required columns (`cancelled_at`, `cancellation_reason`, `cancelled_by`, `status`) already exist on the `orders` table.
