

## Offline Multi-Order Verification

### Current Status: Already Working

After thorough code analysis, the offline order flow **already supports** displaying multiple orders per retailer per day:

1. **Order Creation** (`offlineOrderUtils.ts`): Each order is saved to IndexedDB (`STORES.ORDERS`) with a unique UUID and embedded items array — line 66.

2. **Order Loading on Mount** (`VisitCard.tsx` lines 486-530): On component mount, it queries ALL orders from IndexedDB matching `user_id + retailer_id + date`. Multiple matching orders are set into `ordersTodayList`, which drives the "2 orders" badge and individual order cards.

3. **DB-Empty Fallback** (`VisitCard.tsx` lines 1060-1082): When the network DB returns no orders (offline scenario), it falls back to IndexedDB and loads all matching orders — preserving multi-order display.

4. **Items Tagged with order_id** (line 526): Each item extracted from offline orders is tagged with `order_id: order.id`, ensuring items are correctly grouped per order in the expandable UI.

5. **OrderItemsExpanded Component**: When an order is expanded and its items list is empty, it fetches from the DB. In offline mode, the items are already embedded in the cached order object, so they display immediately.

### Conclusion

No code changes are needed. The system already correctly stores and displays multiple independent orders per retailer in offline mode. When you place 2 orders offline for the same retailer, both will appear with the "2 orders" badge, expandable individually with their own items and invoice options.

### One Minor Risk

The `OrderItemsExpanded` component fetches from Supabase if `displayItems` is empty. In offline mode, this fetch will fail silently. However, the parent `VisitCard` already extracts items from the cached order and passes them as `displayItems`, so this path is not triggered offline.

