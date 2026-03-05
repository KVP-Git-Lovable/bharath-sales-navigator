

## Analysis: Current Offline Architecture vs. Document Requirements

### Question 1: "If I place an order offline and it's not synced when online, does it show details properly?"

**Yes, it does.** Here's how:

1. **Order data is stored locally** in `STORES.ORDERS` and a sync entry is added to `STORES.SYNC_QUEUE` via `useOfflineOrderComplete.submitOrder()`.
2. **Visit status is updated immediately** in both the local visit cache and `visitStatusCache`, so the UI shows "Productive" right away.
3. **The SyncStatusIndicator** shows a count of pending items via the database icon in the header. Tapping it opens a dropdown with "View Sync Queue (N)" which opens `SyncProgressModal` -- this shows each pending item with its action type, retailer name, amount, retry count, and a "Retry Sync" button.
4. **When online**, `useOfflineSync` auto-processes the queue. Items are **never auto-deleted** -- they persist indefinitely until verified in the database.

**So yes, you can see pending order details and manually trigger resync.**

---

### Gap Analysis: Current Implementation vs. Document Plan

| Document Requirement | Current Status | Gap |
|---|---|---|
| **SQLite Database** for critical data | Uses **Capacitor Preferences** (JSON in key-value store) | Preferences works but is not SQLite. For enterprise scale, SQLite would be better for querying/indexing. However, migrating to SQLite is a major architectural change. |
| **Separate Sync Queue table** from Orders | **Already separate**: `STORES.SYNC_QUEUE` vs `STORES.ORDERS` | No gap |
| **Sync Logs / Audit Trail** | **Missing**. No `sync_logs` table tracking each attempt with error details | Gap |
| **Error Classification** (NETWORK, VALIDATION, AUTH, CONFLICT, SERVER, UNKNOWN) | Errors are stored as raw strings in `lastError` | Gap |
| **Sync Lifecycle States** (LOCAL_CREATED → QUEUED → SYNCING → RETRYING → FAILED_SYNC → USER_RETRY → SUCCESS) | Simplified: items stay in queue with incrementing `retryCount`, no formal state machine | Partial gap |
| **Max 5 retries then FAILED_SYNC** | **Intentionally removed** -- items retry indefinitely | Architectural decision conflict (current approach is more conservative/safer) |
| **Exponential backoff** | **Missing**. Retries happen on fixed 15s debounce intervals | Gap |
| **Manual retry resets counter** | "Retry Sync" button triggers `processSyncQueue` but doesn't reset `retryCount` | Minor gap |
| **Logout clears auth tokens only, NOT SQLite** | **Current: `clearAll()` deletes everything on sign out** including orders and sync queue | **Critical gap** -- unsynced orders are lost on logout |
| **Cleanup never deletes orders/sync logs** | `deleteOldSyncedItems` is a no-op (good), but `clearAll()` on logout deletes everything | Gap (same as above) |
| **7-day offline expiry blocks new orders** | Not implemented | Gap |
| **Conflict resolution** (server vs local timestamp) | Not implemented -- upsert/insert with duplicate detection only | Gap |
| **App Metadata table** for flags | Not implemented (uses scattered localStorage) | Minor gap |
| **Secure Storage for auth tokens** | Supabase handles tokens internally | No gap |

### Recommended Implementation Plan (Priority Order)

**Phase 1 -- Critical (Prevent Data Loss)**

1. **Fix logout to preserve unsynced orders**: Modify `signOut` in `useAuth.tsx` to skip clearing `STORES.ORDERS` and `STORES.SYNC_QUEUE` if they contain unsynced items. Only clear after successful sync or with explicit user confirmation.

2. **Add sync audit logging**: Create a local `STORES.SYNC_LOGS` store to record each sync attempt with timestamp, error type, error message, and attempt number. Display this in `SyncProgressModal`.

3. **Classify sync errors**: Add an `errorType` field to sync queue items (NETWORK, VALIDATION, AUTH, CONFLICT, SERVER, UNKNOWN) based on error parsing. VALIDATION errors skip retry; NETWORK errors allow retry.

**Phase 2 -- Robustness**

4. **Implement exponential backoff**: Instead of fixed 15s intervals, use `Math.min(baseDelay * 2^retryCount, maxDelay)` for retry timing.

5. **Add formal sync state machine**: Track sync lifecycle states (QUEUED, SYNCING, RETRYING, FAILED_SYNC, SUCCESS) per item instead of just `retryCount`.

6. **Cap retries at 5, then mark FAILED_SYNC**: After 5 retries, stop auto-retry but keep data. Show prominent UI indicator. Manual "Retry" resets counter.

**Phase 3 -- Nice to Have**

7. **7-day offline expiry**: Track last online timestamp; block new order creation after 7 days offline (existing orders preserved).

8. **Conflict resolution**: Compare `updated_at` timestamps during sync; flag conflicts for user review instead of silent overwrite.

### Files to Modify

- `src/lib/offlineStorage.ts` -- Add `SYNC_LOGS` store, add error classification helper
- `src/hooks/useAuth.tsx` -- Preserve unsynced orders on logout
- `src/hooks/useOfflineSync.ts` -- Add error classification, exponential backoff, sync state machine, audit logging
- `src/components/SyncProgressModal.tsx` -- Show sync logs, error types, sync states
- `src/components/SyncStatusIndicator.tsx` -- Show FAILED_SYNC count prominently

This is a multi-phase effort. I recommend starting with **Phase 1** (prevent data loss on logout + audit logging + error classification) as it addresses the most critical gaps.

