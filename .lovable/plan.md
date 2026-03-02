

## Fix: My Visits Page Shows "No Visits Found" After Tab Navigation

### Root Cause Analysis

After thorough code review, here is the exact sequence that causes the bug:

1. **Component remount clears in-memory cache**: When user navigates to another navbar tab (e.g., Attendance) and returns to My Visits, the `MyVisits` component fully unmounts and remounts. The `cacheRef` (useRef with a Map) is reset to empty on every mount.

2. **Auth timing race**: On remount, `useAuth` may not have resolved `userId` yet on the first render. `loadData` (line 667) returns early when `effectiveUserId` is undefined -- but **never sets `isLoading = false`**. The UI stays stuck on "Loading visits..."

3. **Safety guard fires with empty state**: After 15 seconds, the SafetyGuard (line 1090) forces `isLoading=false` and `hasLoadedOnce=true`. Since no data was loaded, the UI shows "No visits found / No beat planned."

4. **Late auth resolution doesn't help enough**: When `effectiveUserId` finally resolves (a few hundred ms later), `loadData` is recreated and re-invoked. By now it should load from snapshot/offline. But because the SafetyGuard already set `hasLoadedOnce=true` and the user sees empty state, there can be a brief flash or the data may load but the user already saw the wrong state.

5. **AbortController disconnected**: In `doFullInitialLoad` (line 945-946), an AbortController is created and a timeout set, but the signal is **never passed** to the Supabase queries. Network requests can hang indefinitely, causing the full-load path to never resolve.

### Fix Plan

**File: `src/hooks/useVisitsDataOptimized.ts`** (single file, 5 targeted changes)

#### Change 1: Handle undefined userId gracefully in loadData
At line 667, when `loadData` returns early due to missing `effectiveUserId`, also set `isLoading = false` -- but only if we don't expect the userId to arrive soon. Better approach: don't start the 15s safety timer until userId is available.

```
// Before (line 667):
if (!effectiveUserId || !selectedDate) return;

// After:
if (!effectiveUserId || !selectedDate) {
  // Don't leave isLoading stuck -- userId will arrive and re-trigger
  return;
}
```

And move the safety guard to only start when userId is present (adjust the useEffect at line 1084).

#### Change 2: Reset isLoading on every loadData re-entry when date/user changes
When `loadData` is called again with a valid userId (after auth resolves), ensure `isLoading` is set properly. Currently, if SafetyGuard already forced `hasLoadedOnce=true`, the subsequent load still works but the empty-state flash already happened.

Fix: In the main useEffect (line 1084), reset `isLoading=true` and `hasLoadedOnce=false` when the effect re-runs with a new `loadData` (which happens when userId/date changes). This ensures fresh loading state.

#### Change 3: Pass AbortSignal to Supabase queries in doFullInitialLoad
At line 948-953, pass the abort signal to Supabase queries so the 10s timeout actually cancels them:

```typescript
supabase.from('beat_plans').select('*').eq('user_id', uid).eq('plan_date', date).abortSignal(controller.signal),
// ... same for all queries
```

Do the same in `smartDeltaSync` (line 450-454).

#### Change 4: Make safety guard smarter
Instead of a fixed 15s timer from mount, start the safety timer only after `loadData` actually begins fetching (i.e., after userId is available). Reduce to 10s since the actual network timeout is already 8-10s.

#### Change 5: Ensure snapshot loads work on remount
Add a log/guard at the snapshot loading path (line 757-856) to confirm the snapshot is being found. If the snapshot key includes the userId but auth hasn't resolved yet on the first call, the snapshot lookup fails silently. Ensure the snapshot path is only attempted with a valid userId.

### Expected Result
- Navigating away and returning to My Visits: data loads instantly from snapshot (no 15s wait)
- No "No visits found" flash -- loading skeleton shows until real data arrives
- Network timeouts actually cancel hanging requests
- Auth race condition eliminated

### Technical Details
- Only `src/hooks/useVisitsDataOptimized.ts` needs changes
- All 5 changes are within the existing `loadData` function and the main `useEffect`
- No database or schema changes needed

