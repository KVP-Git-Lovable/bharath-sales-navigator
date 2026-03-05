

## Plan: Never-expire sync queue with verified-delete and deduplication

### Problem Summary
1. Sync queue items get marked `permanently_failed` after 48 hours or 5 retries, hiding them from active sync
2. `deleteOldSyncedItems()` removes queue items older than 3 days regardless of sync status
3. `cleanupStaleSyncItems()` enforces age/retry limits that can remove unsynced data
4. No server-side verification before deleting from local queue
5. No deduplication check before inserting into database

### Changes

**1. `src/hooks/useOfflineSync.ts` — Remove all expiry/failure-cap logic**

- **Remove `cleanupStaleSyncItems()`** function entirely (lines 71-110). This function marks items as `permanently_failed` or deletes them based on age (48h for orders, 15min for others) and retry count limits. Instead, all items stay in queue indefinitely.
- **Remove `recoverPermanentlyFailedOrders()`** function (lines 44-67) — no longer needed since nothing gets permanently failed.
- **Remove retry count cap in error handler** (lines 224-238): Currently items are deleted or marked `permanently_failed` after `maxRetries`. Change to: always save with incremented `retryCount` and `lastError`, never delete, never mark as permanently_failed. All items remain in queue until successfully synced.
- **Add server verification before delete** (line 195): After `processSyncItem(item)` succeeds, verify the data exists in the database before calling `offlineStorage.delete()`. For `CREATE_ORDER`: query `orders` table by ID to confirm. For other actions: trust the successful response (non-order items are less critical).
- **Add deduplication in `processSyncItem`**: Before inserting, check if the record already exists in the database. For `CREATE_ORDER`: check `orders` table by order ID. If already exists, treat as success and remove from queue. This is partially done already in `offlineOrderUtils.ts` but needs to be bulletproof in the sync path too.
- **Remove the cleanup timeout** (lines 1254-1265) that calls `deleteOldSyncedItems()` after 15 seconds.

**2. `src/lib/offlineStorage.ts` — Remove `deleteOldSyncedItems()`**

- Remove or gut the `deleteOldSyncedItems()` method (lines 267-284) so it no longer auto-deletes queue items based on age. Keep the method signature but make it a no-op to avoid breaking callers.

**3. `src/components/SyncProgressModal.tsx` — Show permanently_failed items properly**

- Update the status mapping (line 38) to recognize items with `status: 'permanently_failed'` and display them as `error` with appropriate labeling so users can see and retry them.

### Technical Details

**Server verification pattern for CREATE_ORDER:**
```typescript
// After processSyncItem succeeds:
if (item.action === 'CREATE_ORDER') {
  const orderId = item.data?.order?.id;
  const { data: verified } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .maybeSingle();
  if (!verified) throw new Error('Order not confirmed in database');
}
await offlineStorage.delete(STORES.SYNC_QUEUE, item.id);
```

**Deduplication in processSyncItem for CREATE_ORDER:**
The existing code in `offlineOrderUtils.ts` already checks for existing orders before insert. The sync queue handler should do the same: if the order already exists in DB, skip insert and treat as success.

**Retry behavior change:**
- No max retry limit — items retry every sync cycle
- `retryCount` and `lastError` still tracked for user visibility
- Exponential backoff not needed since sync cycles are already spaced (60s intervals)

