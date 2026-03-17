

## Fix: Local-First Order Visibility with Sync Status

### Problems Identified

There are **3 specific issues** in `src/hooks/useVisitsDataOptimized.ts` causing orders to not appear immediately:

**1. `doFullInitialLoad` overwrites local orders (line 1117)**
When the app does a full network load, `setOrders(ordersData)` replaces state with only server orders — discarding any locally-created orders that haven't synced yet.

**2. Duplicate detection blocks second orders for same retailer (lines 1352-1357)**
In the `handleStatusChange` event handler, the code checks if an order exists for the same `retailer_id` + `order_date` with a similar `total_amount`. If a second order is placed for the same retailer with a similar value, it's treated as a duplicate and **merged** instead of added.

**3. `visitDataChanged` handler overwrites with snapshot only (line 1519)**
`setOrders(snapshot.orders || [])` replaces the full orders state with snapshot data, potentially losing orders that were added via `visitStatusChanged` events but not yet saved to the snapshot.

### Fixes

**File: `src/hooks/useVisitsDataOptimized.ts`** — 4 surgical changes:

**Fix 1: Merge local orders in `doFullInitialLoad` (line ~1117)**
Before setting orders from DB, check IndexedDB for unsynced local orders and merge them in:
```typescript
// Before: setOrders(ordersData);
// After: Merge unsynced local orders
const localOrders = await offlineStorage.getAll(STORES.ORDERS);
const dbIds = new Set(ordersData.map(o => o.id));
const unsyncedLocal = localOrders.filter(o => 
  o.user_id === uid && o.order_date === date && !dbIds.has(o.id)
);
const mergedOrders = [...ordersData, ...unsyncedLocal];
setOrders(mergedOrders);
```
Also update the cache and snapshot to use `mergedOrders`.

**Fix 2: Fix duplicate detection in `handleStatusChange` (lines 1352-1357)**
Remove the `total_amount` similarity check. Instead, deduplicate only by `order.id` or `idempotency_key`:
```typescript
// Remove the retailer+amount match — it wrongly blocks second orders
// Only match by exact ID or idempotency_key
const existingByKey = order.idempotency_key 
  ? prev.find(o => o.idempotency_key === order.idempotency_key)
  : null;
if (existingByKey) { /* update */ }
else { /* add new */ }
```

**Fix 3: Merge local orders in `visitDataChanged` handler (line ~1519)**
Instead of `setOrders(snapshot.orders || [])`, merge with current state to preserve any orders added via events that haven't been persisted to snapshot yet:
```typescript
setOrders(prev => {
  const snapshotIds = new Set((snapshot.orders || []).map(o => o.id));
  const preserveLocal = prev.filter(o => !snapshotIds.has(o.id) && o.order_date === currentDate);
  return [...(snapshot.orders || []), ...preserveLocal];
});
```

**Fix 4: Add sync status badge to order display**
Add a `_syncStatus` field to orders in the local event handler (`pending` for local, `synced` for DB orders). This is already partially done via `_source` in `ordersForDate.ts` — we'll extend this pattern to the UI state in `useVisitsDataOptimized.ts` and show a small badge in `MyVisits.tsx` progress card area (optional visual indicator, no behavior change).

### Files Changed
- `src/hooks/useVisitsDataOptimized.ts` — 4 targeted edits (no sync logic changes)
- No other files need modification — the progress stats (`calculateStats`) already work off the `orders` array, so merging local orders automatically fixes the progress card too

