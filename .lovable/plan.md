

## Offline-First Order Display — Fix Plan

### Problem Analysis

After placing an order, the user navigates back to My Visits and sees stale data (screenshot 1: ₹95, 1 Productive) instead of updated data (screenshot 2: ₹484, 2 Productive). The correct data only appears ~2 minutes later after sync completes.

**Root causes identified:**

1. **Race condition on navigation**: Cart.tsx calls `addOrderToSnapshot` and `markVisitDataChanged` before navigating, but `useVisitsDataOptimized` re-mounts with `setIsLoading(true)` and `setHasLoadedOnce(false)` (line 1118-1119), which triggers `loadData()`. The `loadData` function loads from snapshot, but the snapshot may not have persisted yet when navigation is instant.

2. **Snapshot load filters out new orders**: The `loadFromOfflineStorage` function (line 376-381) filters orders by `status === 'confirmed' && retailerIds.has(o.retailer_id)`. If the retailer set hasn't been computed yet, orders get excluded.

3. **In-memory cache cleared on re-mount**: When navigating away from MyVisits (to Cart) and back, the component re-mounts. Line 1118-1119 resets `hasLoadedOnce` and `isLoading`, clearing any event-driven state updates.

4. **`visitStatusChanged` event fires but component is unmounted**: The event is dispatched from Cart.tsx BEFORE navigation. The MyVisits page has already unmounted its event listeners, so the new mount misses the event entirely and relies on snapshot/cache.

5. **SyncProgressModal shows minimal details**: `getItemDetails` only shows retailer name and amount for orders, no order items or other data.

### Changes

#### 1. Fix `offlineOrderUtils.ts` — Ensure snapshot is fully persisted before returning

The `addOrderToSnapshot` call in Cart.tsx is awaited, but the order also needs to be saved to IndexedDB ORDERS store with the correct status before `loadFromOfflineStorage` runs on re-mount.

**File: `src/utils/offlineOrderUtils.ts`**
- Ensure the order saved to `STORES.ORDERS` has `status: 'confirmed'` (already does, line 45) — verified OK.
- Move the `await offlineStorage.save(STORES.ORDERS, ...)` call to be part of the critical path (currently it's at line 66, which IS awaited — OK).

#### 2. Fix `useVisitsDataOptimized.ts` — Merge local IndexedDB orders into snapshot/cache on load

**File: `src/hooks/useVisitsDataOptimized.ts`**

**Problem**: When loading from snapshot (lines 816-887), orders from IndexedDB that were saved AFTER the snapshot was created get lost. The snapshot `addOrderToSnapshot` may not have completed before the navigation triggers `loadData`.

**Fix**: After loading snapshot data, also check IndexedDB `STORES.ORDERS` for any orders matching the user+date that aren't in the snapshot, and merge them in. This is partially done for retailers (lines 831-845) but NOT for orders.

Add order merging logic after snapshot load (around line 850):
```typescript
// Merge offline orders not in snapshot
let mergedOrders = [...(snapshot.orders || [])];
if (offlineData?.orders?.length) {
  const snapshotOrderIds = new Set(mergedOrders.map(o => o.id));
  const newOrders = offlineData.orders.filter(o => !snapshotOrderIds.has(o.id));
  if (newOrders.length > 0) {
    mergedOrders = [...mergedOrders, ...newOrders];
  }
}
```

Similarly for the in-memory cache path and offline storage path.

#### 3. Fix `useVisitsDataOptimized.ts` — Also merge IndexedDB orders into `loadFromOfflineStorage`

**File: `src/hooks/useVisitsDataOptimized.ts`**

The `loadFromOfflineStorage` function (line 333) filters orders by `retailerIds`. But when a new order is placed for a retailer already in the set, the filter should pass. The real issue is the `status === 'confirmed'` filter — orders saved by `offlineOrderUtils` have `status: 'confirmed'` so this should work.

However, orders saved via `offlineStorage.save(STORES.ORDERS, { ...normalizedOrder, items: normalizedItems })` include an `items` array nested inside. This may cause the `o.status` check to fail if the data shape differs. Need to verify and normalize.

#### 4. Fix `useVisitsDataOptimized.ts` — Check `visitChangeMarker` BEFORE snapshot load

**File: `src/hooks/useVisitsDataOptimized.ts`**

Currently, `markVisitDataChanged` is called in Cart.tsx before navigation. The `loadData` function checks for change markers (lines 720-728) but only invalidates the in-memory cache — it doesn't force a re-read of snapshot. Since the snapshot was just updated by `addOrderToSnapshot`, the marker should trigger a fresh snapshot read, which it does (cache is deleted, so it falls through to snapshot path). This flow looks correct IF `addOrderToSnapshot` completes before `loadData` runs.

**Fix**: Add a small delay or use a flag to ensure snapshot persistence completes. Alternatively, read directly from IndexedDB orders as a merge step (approach from point 2 above).

#### 5. Fix `SyncProgressModal.tsx` — Show complete sync item details

**File: `src/components/SyncProgressModal.tsx`**

Enhance `getItemDetails` to show more information:
- For `CREATE_ORDER`: Show retailer name, amount, number of items, and order date
- For `CREATE_VISIT`/`CHECK_IN`/`CHECK_OUT`: Show retailer name and time
- For `CREATE_ATTENDANCE`: Show check-in/out time
- For `CREATE_RETAILER`: Show shop name, beat name, address
- For `CREATE_BEAT`: Show beat name and retailer count
- Add an expandable "View More" section per item showing all data fields

#### 6. Fix duplicate order handling for multi-device scenario

**File: `src/hooks/useOfflineSync.ts`**

The `CREATE_ORDER` sync handler needs to handle `23505` (unique constraint violation) as a success case (order already synced from another device). Currently at line 170-175, there's server verification, but need to ensure CONFLICT errors are treated as success and item removed from queue.

### Files to Edit

| File | Changes |
|------|---------|
| `src/hooks/useVisitsDataOptimized.ts` | Merge IndexedDB orders into snapshot on load; ensure local orders always appear immediately |
| `src/components/SyncProgressModal.tsx` | Enhance `getItemDetails` with expandable details view showing all sync item data |
| `src/hooks/useOfflineSync.ts` | Treat CONFLICT (duplicate key) errors as success for CREATE_ORDER |
| `src/utils/offlineOrderUtils.ts` | Minor: ensure snapshot persistence is awaited in the critical path |

### Data Preservation Rules
- Pending sync data persists across logout/login (already implemented via IndexedDB — no changes needed)
- Local orders in IndexedDB persist across sessions (already implemented)
- Multi-device orders: server-side deduplication via unique order IDs, CONFLICT = success

