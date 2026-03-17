

## Improve Sync Speed — Reduce Round-Trips and Enable Parallel Processing

### Current Bottlenecks

After reviewing `useOfflineSync.ts` and `syncErrorClassifier.ts`, here are the speed issues:

**1. Sequential processing (biggest bottleneck)**
Orders sync one-at-a-time in a `for` loop (line 137). If you have 5 orders, each taking 3-4 network round-trips, that's 15-20 sequential requests on slow networks.

**2. Too many round-trips per order (4-6 requests per CREATE_ORDER)**
Each order sync does:
- Check if order exists by ID → 1 request
- Insert order → 1 request
- Check if items exist → 1 request
- Insert items → 1 request
- Verification query (line 164) → 1 request
- State update to SYNCING (line 155) → 1 write

That's 5-6 operations per order. On a 500ms latency network, that's 2.5-3 seconds minimum per order.

**3. Aggressive backoff on first failure**
Base delay is 2 seconds doubling each retry. After just 3 failures: 2s → 4s → 8s → 16s. On flaky networks, items quickly reach 30+ second backoff.

**4. Redundant sync queue state writes**
Writing `syncState: 'SYNCING'` to IndexedDB before each item (line 155) adds latency with no user-visible benefit.

### Proposed Fixes

**File: `src/hooks/useOfflineSync.ts`**

**Fix 1: Batch parallel sync (up to 3 concurrent items)**
Replace the sequential `for` loop with a controlled parallel executor. Process up to 3 sync items concurrently using `Promise.allSettled` in batches:
```typescript
const BATCH_SIZE = 3;
for (let i = 0; i < syncQueue.length; i += BATCH_SIZE) {
  const batch = syncQueue.slice(i, i + BATCH_SIZE);
  const results = await Promise.allSettled(
    batch.map(item => processAndHandleItem(item))
  );
  // Handle results...
}
```
This cuts total sync time by ~3x on slow networks.

**Fix 2: Combine order insert + items into single RPC call**
Create a Supabase database function `sync_order_with_items` that does the upsert of order + items in one transaction. This reduces 4-5 round-trips to 1:
```sql
CREATE OR REPLACE FUNCTION sync_order_with_items(
  p_order jsonb, p_items jsonb
) RETURNS jsonb AS $$ ... $$
```

**Fix 3: Remove redundant verification query**
The verification query at line 164 adds an extra round-trip after every successful order insert. Since we already get the inserted row back from `.select().single()`, this is unnecessary. Remove it.

**Fix 4: Skip sync queue state write for SYNCING**
Remove the `offlineStorage.save(STORES.SYNC_QUEUE, { ...item, syncState: 'SYNCING' })` at line 155. It adds a write operation before every sync attempt with no meaningful UX benefit.

**Fix 5: Reduce initial backoff for first retry**
Change base delay from 2000ms to 1000ms for the first 3 retries to be more aggressive on flaky networks:
```typescript
export function getBackoffDelay(retryCount: number): number {
  const baseDelay = retryCount <= 3 ? 1000 : 2000;
  const maxDelay = 1800000;
  ...
}
```

**File: `src/lib/syncErrorClassifier.ts`**
- Update `getBackoffDelay` with shorter initial delays.

**New migration: `sync_order_with_items` RPC function**
- Single DB function that handles order upsert + items insert in one call.

### Impact
- **3x faster** for multiple queued items (parallel batching)
- **4-5x fewer round-trips** per order (single RPC vs 5 queries)
- **Faster recovery** on flaky networks (reduced initial backoff)
- No changes to sync architecture, retry logic, or queue lifecycle

### Files Changed
- `src/hooks/useOfflineSync.ts` — parallel batching, remove verification query, remove SYNCING state write
- `src/lib/syncErrorClassifier.ts` — reduce initial backoff
- New migration — `sync_order_with_items` database function

