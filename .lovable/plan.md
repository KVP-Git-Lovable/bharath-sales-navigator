
Goal: eliminate the “data appears only after multiple clicks” behavior on My Visits after switching tabs, and ensure immediate, correct display on return.

What is actually happening now
1) In `src/hooks/useVisitsDataOptimized.ts`, the auth listener clears all in-memory state on every `SIGNED_IN` event:
- `clearAllCachesAndState()` sets `beatPlans/visits/retailers/orders` to empty and sets loading state.
- On browser tab return, Supabase auth can emit auth events (including sign-in/session refresh flows), so this clear can happen even when user did not truly change.

2) After that clear, there is no guaranteed immediate `loadData()` re-run from that auth callback itself.
- If date/user dependencies didn’t change, the main load effect may not re-run right away.
- Visibility sync is throttled by `MIN_SYNC_INTERVAL_MS` (5 min), so the fallback sync may be skipped.
- Result: page looks empty/stuck until user manually clicks and triggers another UI state change.

3) This exactly matches your symptom:
- Navigate away → come back → My Visits not shown immediately.
- Multiple clicks eventually trigger data refresh.

Implementation plan

1) Fix auth-event cache invalidation strategy (primary fix)
File: `src/hooks/useVisitsDataOptimized.ts`
- Replace unconditional `SIGNED_IN` clearing with event-safe logic:
  - Keep clearing on `SIGNED_OUT`.
  - For `SIGNED_IN` (or initial/session refresh events), clear only if authenticated user actually changed (compare previous effective user id vs new session user id).
  - If same user, do not wipe existing UI state.
- This prevents unnecessary “blanking” on tab return/session refresh.

2) Trigger reload immediately when a clear is truly needed
File: `src/hooks/useVisitsDataOptimized.ts`
- When cache/state is cleared due to real identity change:
  - explicitly reset per-date sync throttle for `selectedDate`,
  - invoke a controlled reload path immediately (local-first `loadData` or `invalidateData` equivalent),
  - avoid waiting for visibility throttle/user click.
- This ensures one deterministic recovery path after a legitimate clear.

3) Guard visibility/tab-return revalidation when UI is empty
File: `src/hooks/useVisitsDataOptimized.ts`
- Update `handleVisibility` logic:
  - if current date state is empty (no beatPlans/retailers/visits/orders), bypass `shouldSyncNow` throttle once and force revalidation,
  - keep existing throttle for normal/non-empty state to avoid excess network calls.
- This handles edge cases where data was cleared unexpectedly and app returns to foreground.

4) Remove loading deadlock risk from auth callback side-effects
File: `src/hooks/useVisitsDataOptimized.ts`
- Ensure auth callback does not only clear state; it must either:
  - preserve current state (same-user event), or
  - clear + immediately schedule reload.
- Keep safety timer as backup only, not as primary recovery mechanism.

5) Add targeted diagnostics logs for this flow
File: `src/hooks/useVisitsDataOptimized.ts`
- Add concise logs for:
  - auth event type + whether clear skipped/executed,
  - reason for clear (user changed vs sign-out),
  - whether immediate reload started,
  - whether visibility sync was throttle-bypassed due to empty state.
- This will make future regressions easy to verify from console.

Why this resolves your exact issue
- The repeated-click behavior is caused by state being wiped on auth/tab-return events without deterministic reload.
- These changes stop unnecessary wipes and guarantee immediate reload when a wipe is legitimate.
- So returning to My Visits will show cached/snapshot data instantly, with background sync updating it—without requiring multiple manual clicks.

Validation checklist (must run end-to-end)
1) Open My Visits (today), confirm list loads.
2) Switch to another tab/page, return to My Visits:
- data should still be visible immediately (no repeated clicks needed).
3) Repeat rapid tab switching 5–10 times:
- no blank state lock, no delayed “appears after clicks”.
4) Test previous date:
- correct beat-linked retailers and activity details render immediately.
5) Offline test:
- with snapshot present, return to My Visits and confirm instant data display.
6) Check console:
- no repeated same-user auth-clear logs; reload only on real user change/sign-out.

Technical scope
- Primary file to change: `src/hooks/useVisitsDataOptimized.ts`.
- No database/schema changes required.
- No API contract changes required.
