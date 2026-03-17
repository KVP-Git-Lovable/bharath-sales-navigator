

## Root Cause Analysis

There are **two bugs** causing the issues you're seeing:

### Bug 1: Foreign Key Violation on `order_items` (the "1 Retrying" error)

In `useOfflineSync.ts` line 383-384, when the sync queue processes a `CREATE_ORDER`, it strips `scheme_details` and `pending_amount` from the order data, but does NOT strip the `items` array that was embedded in the order object (saved at `offlineOrderUtils.ts` line 66). This causes the `orders` table insert to fail (since `items` is not a column), and the error is caught silently at line 444-448. The code then tries to insert `order_items` using the `actualOrderId` which was never actually inserted into the `orders` table, causing the foreign key violation.

**Fix in `useOfflineSync.ts`**: Strip `items` from `orderClean` before inserting into `orders`:
```typescript
const { scheme_details, pending_amount, items: _items, ...orderClean } = data.order;
```

### Bug 2: Early Return Skips Items Check

In `useOfflineSync.ts` lines 409-411, when the order already exists in DB (inserted by direct sync), it `return`s immediately without checking if `order_items` also exist. If direct sync inserted the order header but items failed (timeout), this creates an order with no items.

**Fix**: Replace the early `return` with a flow that still checks and inserts items.

### Bug 3: 15-Minute Sync Delay

The direct sync in `offlineOrderUtils.ts` has a 10-second timeout. If it times out, the order goes to the sync queue. The queue uses exponential backoff (2s, 4s, 8s, 16s, 32s...) and due to the FK error, it keeps retrying with increasing delays. Combined with the `SyncStatusIndicator` debounce (15s between syncs) and the backoff, this explains the ~15 minute delay.

The FK fix above will resolve this - once the insert succeeds on first queue attempt, there's no backoff needed.

### Implementation Plan

**File: `src/hooks/useOfflineSync.ts`** (2 changes)

1. **Strip `items` from order data before DB insert** (line ~384):
   - Change destructuring to also remove `items` field from the order object before inserting into the `orders` table

2. **Fix early return when order exists** (lines 409-411):
   - Instead of `return`, check if items exist for this order and insert them if missing, then return

Both fixes are surgical - no UI changes needed. The existing offline-first display logic (saving to IndexedDB first, dispatching `visitStatusChanged` events) already ensures orders appear immediately in the "Today's Order" section. The real problem was just the sync queue failing silently due to the extra `items` field.

