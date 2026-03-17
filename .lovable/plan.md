

## Analysis: Data Getting Permanently Stuck

You're right to be concerned. Currently, after **5 failed retries**, items are marked as `FAILED_SYNC` and **auto-sync stops trying them**. They sit in the queue forever unless the user manually opens the Sync Queue modal and clicks "Reset & Retry Failed." Most field users won't know to do this, so data effectively gets stuck.

Additionally, `VALIDATION` errors are marked as permanently failed on the **first attempt** (not retryable), which is too aggressive — a transient schema mismatch or edge case could cause valid data to be abandoned.

### Changes

#### 1. Remove permanent failure cap (`src/lib/syncErrorClassifier.ts`)
- Make `VALIDATION` errors retryable (with longer backoff) since constraint issues can be fixed server-side
- Keep `CONFLICT` as non-retryable (already treated as success)

#### 2. Never stop retrying (`src/hooks/useOfflineSync.ts`)
- Remove the `FAILED_SYNC` skip logic that blocks items after 5 retries
- Instead, keep all items in `RETRYING` state indefinitely with increasing backoff (capped at 30 minutes)
- Items always get retried on every sync cycle, just with longer delays between attempts
- Remove the `MAX_AUTO_RETRIES` cap — replace with a "slow retry" mode after 5 attempts (backoff increases but never stops)

#### 3. Update UI labels (`src/components/SyncProgressModal.tsx`)
- Remove "Failed" badge — replace with "Retrying (slow)" for items with many retries
- Keep the manual "Reset & Retry" button as a way to force immediate retry (resets backoff timer)
- Show retry count and next retry time so users know data is still being attempted

### Summary
After this change, **no data will ever be permanently failed**. Items will keep retrying with exponential backoff (up to 30 min max delay). The only items removed from the queue are successfully synced ones or confirmed duplicates (CONFLICT).

