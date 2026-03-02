
Goal: make the My Visits page reliably show the correct retailers for the selected beat after tab navigation, and always show accurate historical (previous date) visit activity data.

What I found
- Your DB has the expected source data:
  - Beat plan exists for 2026-03-02 (Nagasaki)
  - 4 retailers are linked to that beat
  - visits exist for that date (2 rows currently)
- The current issue is mostly in client data lifecycle (cache/snapshot/sync timing), not missing DB data.
- In `useVisitsDataOptimized`, there are a few weak points that can cause exactly what you described:
  1) foreground/tab-return sync is today-only in key places, so historical dates can stay stale
  2) `visitDataChanged` handling is not date-aware (events don’t carry date, and marker is today-only)
  3) timeout controllers are created but not attached to Supabase queries in this hook, so loading can get stuck when network hangs
  4) loading state depends on async flow that can remain in “Loading visits…” longer than expected during remount/navigation races

Implementation plan

1) Make sync date-aware (not only today) for My Visits reload paths
- File: `src/hooks/useVisitsDataOptimized.ts`
- Update `handleVisibility` and `handleVisitDataChanged` logic so selected date can revalidate even when it is a previous date.
- Keep throttling via `shouldSyncNow(selectedDate)` to avoid excess traffic.
- Result: when user returns to My Visits, selected date data (including older days) is refreshed and not stuck on stale snapshot.

2) Make visit data change events carry date context
- Files:
  - `src/lib/visitChangeMarker.ts`
  - call sites: `src/utils/noOrderUtils.ts`, `src/hooks/useOfflineOrderEntry.ts`, `src/pages/Cart.tsx` (and any other critical emitters)
- Extend marker API to accept optional date:
  - `markVisitDataChanged(date?: string)`
  - default remains today for backward compatibility
- Dispatch `visitDataChanged` as `CustomEvent` with `{ date }` where known.
- In `useVisitsDataOptimized`, consume event date and invalidate/reload that date’s cache specifically.
- Result: previous-date updates appear correctly instead of being treated as today-only changes.

3) Prevent hanging loading states with real request cancellation + safe fallback
- File: `src/hooks/useVisitsDataOptimized.ts`
- Attach `.abortSignal(controller.signal)` to Supabase queries in `smartDeltaSync` and `doFullInitialLoad`.
- Add a final safety guard so `isLoading`/`hasLoadedOnce` cannot remain blocked if network fetch stalls.
- Result: eliminates recurring “Loading visits…” blocks after switching tabs/routes under unstable network.

4) Harden beat-to-retailer derivation consistency
- File: `src/hooks/useVisitsDataOptimized.ts`
- Centralize retailer inclusion rule for a date:
  - retailers from selected date’s beat plans
  - + retailers referenced by selected date’s visits/orders
  - + explicit `beat_data.retailer_ids`
- Use the same rule in snapshot load, offline load, and network sync paths.
- Result: My Visits consistently shows retailers linked to the selected beat, regardless of navigation path or cache source.

5) Preserve UX while revalidating
- Files:
  - `src/hooks/useVisitsDataOptimized.ts`
  - optionally `src/pages/MyVisits.tsx` (minor display guard)
- Keep stale data visible while background refresh runs, but only show skeleton for true first-load.
- Ensure no flicker and no false empty state while revalidation is in progress.

Validation checklist after implementation
1) Open `/visits/retailers` for today:
- Beat name and linked retailers appear (e.g., Nagasaki retailers) without manual refresh.
2) Navigate to another tab (e.g., Attendance or My Beats), then return:
- list remains correct and refreshes safely (no stuck loading, no wrong beat retailers).
3) Select a previous date with known activity:
- statuses/orders/unproductive counts and list match DB records for that date.
4) Trigger update flow (order/no-order), then return to My Visits:
- date-specific changes reflect immediately.
5) Simulate slow/intermittent network:
- page avoids permanent loading lock and falls back gracefully.

Technical notes
- Primary fix surface: `useVisitsDataOptimized` (single source of truth for My Visits data).
- Secondary fix surface: change-marker/event payloads for cross-page synchronization accuracy.
- No backend schema changes needed.
