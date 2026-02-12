
# Fix: Order Data Loss Due to Aggressive Sync Queue Cleanup

## Problem Summary
Sardar's order created today was not synced to the database because the sync queue cleanup mechanism is too aggressive. Orders are being deleted from the local sync queue after:
- 15 minutes have elapsed, OR
- 2 failed retry attempts

This causes permanent data loss before the order can be successfully synced to the database.

## Root Causes Identified

### Issue 1: Aggressive Sync Queue Cleanup (PRIMARY)
**File**: `src/hooks/useOfflineSync.ts` (lines 43-63, 166-180)

Current behavior:
- ALL sync items (including critical CREATE_ORDER) are deleted after 15 minutes
- Orders are deleted after just 2 failed retries
- No distinction between critical orders and non-critical updates

### Issue 2: Invalid Database Query
**File**: `src/components/VisitCard.tsx` (lines 682, 1191)

Current code queries:
```typescript
.gt('pending_amount', 0)  // WRONG - column doesn't exist on orders table
```

Should query:
```typescript
.gt('credit_pending_amount', 0)  // CORRECT - actual column name
```

This causes database errors every time pending orders are fetched.

## Implementation Plan

### Step 1: Fix Sync Queue Retention Logic
**File**: `src/hooks/useOfflineSync.ts`

**Location 1 - cleanupStaleSyncItems function (lines 43-63)**:
- Add 48-hour and 5-retry thresholds specifically for `CREATE_ORDER` items
- Keep 15-minute and 2-retry thresholds for other sync actions
- Logic:
  - If action === 'CREATE_ORDER': Only delete if older than 48 hours OR 5+ retries
  - Otherwise: Delete if older than 15 minutes OR 2+ retries

**Location 2 - Retry handling (lines 166-180)**:
- Change max retry limit: `maxRetries = item.action === 'CREATE_ORDER' ? 5 : 2`
- Instead of DELETING after max retries, KEEP the item in queue with status: 'permanently_failed'
- This ensures users are alerted and can manually retry if needed
- Add console error with full item context for manual intervention

### Step 2: Fix Database Column Query
**File**: `src/components/VisitCard.tsx`

**Location 1 (line 682)**:
```typescript
// BEFORE:
.gt('pending_amount', 0)

// AFTER:
.gt('credit_pending_amount', 0)
```

**Location 2 (line 1191)**:
```typescript
// BEFORE:
.gt('pending_amount', 0)

// AFTER:
.gt('credit_pending_amount', 0)
```

### Step 3: Improve Error Logging for Sync Failures
**File**: `src/utils/offlineOrderUtils.ts`

In the background sync catch block (around line 220), add more detailed logging:
- Log the complete order object when sync fails
- Include retry count and timestamp
- Help users understand why their order might not have synced

## Data Flow After Fix

```
Order Created (offline or slow connection)
    ↓
Local Cache → UI shows immediately (✅ Already working)
    ↓
Background Sync (5s timeout)
    ├─ Success → Remove from queue ✅
    ├─ Timeout → Add to queue, retry later
    │   ↓
    │ Sync Queue Processing
    │   ├─ Success → Remove from queue ✅
    │   ├─ Failure → Increment retry counter
    │   │   ├─ CREATE_ORDER: Retry up to 5 times over 48 hours ✅ (FIXED)
    │   │   ├─ Other actions: Retry up to 2 times over 15 mins
    │   │   └─ Max retries reached → Keep in queue, alert user (FIXED)
    │   └─ Stale cleanup: Only after max retries + time threshold
```

## Files Modified
1. `src/hooks/useOfflineSync.ts` - Stale cleanup + retry logic
2. `src/components/VisitCard.tsx` - Database column name fixes

## Testing Validation
- Test offline order creation and sync timing
- Verify that CREATE_ORDER items are retained for 48 hours
- Confirm that orders are retried up to 5 times
- Ensure no more "pending_amount" database errors
- Verify pending orders show correct "pending since" date

## Impact on Sardar's Lost Order
Unfortunately, Sardar's order data cannot be recovered as it was permanently deleted from the sync queue before reaching the database. **After this fix is applied, Sardar will need to manually re-create the order**, and it will be properly retained and synced going forward.

## Regression Prevention
- CREATE_ORDER items now have a 48-hour protection window
- Explicit logging of all cleanup actions
- Permanently failed items stay in queue (not auto-deleted)
- Better visibility into why sync might fail
