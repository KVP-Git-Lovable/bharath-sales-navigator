

# Add Cancel Order Button to Operations Dashboard + Fix RLS

## Problem

Two issues preventing order cancellation from the Operations dashboard:

1. **No Cancel button** — The Orders tab only has View (eye) and Edit (pencil) buttons. There is no cancel action, unlike the staging project.
2. **Missing RLS policies on `order_cancellation_log`** — RLS is enabled but has zero policies, so the Cancelled tab query returns empty results even if cancellations exist.

## Fix

### 1. Database Migration — Add RLS policies on `order_cancellation_log`

```sql
CREATE POLICY "Authenticated users can view cancellation logs"
  ON public.order_cancellation_log FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cancellation logs"
  ON public.order_cancellation_log FOR INSERT
  TO authenticated WITH CHECK (true);
```

### 2. Add Cancel button to Orders tab in `src/pages/Operations.tsx`

- Import `Ban` icon from lucide-react and `CancelOrderDialog` component
- Add state for cancel dialog: `showCancelDialog`, `selectedOrderForCancel`
- Add a red cancel (Ban) button next to the existing Edit button in the Actions column (line ~1724-1734)
- When clicked, fetch the order's `is_credit_order` and `credit_pending_amount` and open the `CancelOrderDialog` with that single order
- On successful cancellation (`onCancelled`), refresh order data via `fetchOrderData()` and `fetchCancelledOrders()`

The cancel button will only appear for orders with `status = 'confirmed'` (which is already filtered by the query). The existing `CancelOrderDialog` component handles the full 3-step flow (select → reason → confirm) and calls the `cancel_order_atomic` RPC.

### 3. Update `OrderData` interface

Add `is_credit_order` and `credit_pending_amount` fields to the interface and fetch query so the cancel dialog can display credit badges correctly.

| Change | File |
|---|---|
| Add RLS policies on `order_cancellation_log` | DB Migration |
| Add Cancel button + dialog to Orders tab | `src/pages/Operations.tsx` |

