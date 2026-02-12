

## Auto-Recover Permanently Failed Orders

### What This Does
When any salesperson opens the app on their original device, the system will **automatically detect and retry** all orders that were marked as `permanently_failed` this morning. No user action needed beyond simply opening the app.

### What Users Need To Do
**Nothing special** -- just open the app normally on the same device/browser they used this morning. The recovery happens silently in the background.

### Technical Changes

**File: `src/hooks/useOfflineSync.ts`**

1. **Add `recoverPermanentlyFailedOrders()` function** (insert before `processSyncQueue` logic, around line 133):
   - Scans the sync queue for items where `status === 'permanently_failed'` AND `action === 'CREATE_ORDER'`
   - For each found item:
     - Resets `retryCount` to 0
     - Removes `status` and `failedAt` fields
     - Adds `_recovered: true` flag and `recoveredAt` timestamp
   - Saves recovered items back to offline storage
   - Logs how many orders were recovered

2. **Call recovery before cleanup** (line ~133-135):
   - Insert `await recoverPermanentlyFailedOrders();` before `cleanupStaleSyncItems` runs
   - This ensures recovered items are treated as fresh and not immediately re-marked as stale

3. **Update `cleanupStaleSyncItems`** (lines 45-81):
   - Add a check: if an item has `_recovered: true`, use `recoveredAt` as the age baseline instead of the original `timestamp`
   - This prevents a just-recovered item from being immediately classified as "stale" (since its original timestamp is hours old)

### Safety Guarantees
- **No duplicates**: The existing `CREATE_ORDER` handler (line 389-399) already checks if an order exists by ID before inserting
- **Idempotent**: Running recovery multiple times has no side effect -- already-recovered items simply get processed again
- **Only orders**: Recovery only targets `CREATE_ORDER` actions, leaving other sync types untouched
- **Silent**: No toast notifications or UI disruptions -- syncs quietly in the background

### Expected Outcome
Once deployed, the next time each salesperson opens the app on their original device:
1. Recovery function finds `permanently_failed` CREATE_ORDER items
2. Resets them so the sync processor picks them up
3. Orders insert into the database (constraint removed)
4. Console logs confirm: "Recovered X permanently failed orders for retry"

