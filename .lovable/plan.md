

## Fix Inflated Usage Time in Activity Logging

### Root Cause

Two bugs combine to produce wildly inflated usage times:

1. **Duplicate session creation**: The `useActivityTracker` hook creates a new `user_sessions` row every time React re-mounts the component (due to StrictMode, navigation, or hot reload). One user accumulated 61 sessions in a single day with 43 never closed.

2. **RPC sums all open sessions**: The `get_activity_logging_summary` function calculates duration as `COALESCE(logout_at, now()) - login_at` and sums ALL sessions. Each orphaned session contributes its full elapsed time, so 43 open sessions each running for ~1.5 hours = ~65 hours.

### Fix 1: Prevent Duplicate Sessions (useActivityTracker.ts)

- Add a `creatingRef` guard to prevent concurrent session creation
- On mount, check localStorage for an existing session ID and reuse it instead of creating a new one
- Only create a new session if no valid session exists
- Close any previous orphaned session before creating a new one

### Fix 2: Only Count Latest Session Per User (RPC)

Change the RPC to use `DISTINCT ON (user_id)` or a smarter aggregation that:
- For active (non-closed) sessions, only counts the **most recent** one
- For closed sessions, sums their actual durations (`logout_at - login_at`)
- This prevents orphaned sessions from inflating the total

### Fix 3: Clean Up Existing Orphaned Sessions (Migration)

Add a one-time cleanup + a periodic auto-close rule:
- Close all orphaned sessions (active = true, no logout) older than 12 hours
- In the RPC, ignore sessions with unreasonably long durations (e.g., > 16 hours) as they are clearly orphaned

### Technical Details

**File: `src/hooks/useActivityTracker.ts`**

- Add `creatingRef = useRef(false)` to prevent double-creation during StrictMode
- In `createSession`: check `sessionIdRef.current` and `localStorage` first; skip if session already exists
- Before creating, close any prior orphaned session for the same user
- On cleanup, ensure `endSession` only fires once (guard with a ref)

**File: `get_activity_logging_summary` RPC (migration)**

Replace the session duration calculation:

```text
-- Old (broken): sums ALL sessions including orphans
SUM(EXTRACT(EPOCH FROM (COALESCE(logout_at, now()) - login_at)))

-- New (fixed): for closed sessions sum actual duration;
-- for active sessions only count the latest one
WITH ranked_sessions AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY user_id, is_active ORDER BY login_at DESC) as rn
  FROM user_sessions
  WHERE login_at >= now() - (p_days || ' days')::interval
)
SELECT user_id, SUM(
  CASE
    WHEN is_active = false THEN EXTRACT(EPOCH FROM (logout_at - login_at))
    WHEN rn = 1 THEN EXTRACT(EPOCH FROM (now() - login_at))  -- only latest active
    ELSE 0  -- ignore orphaned active sessions
  END
) as total_seconds
FROM ranked_sessions
GROUP BY user_id
```

**Migration: cleanup orphaned sessions**

```text
-- Close orphaned sessions older than 12 hours
UPDATE user_sessions
SET logout_at = login_at + interval '30 minutes',
    is_active = false
WHERE is_active = true
  AND logout_at IS NULL
  AND login_at < now() - interval '12 hours';
```

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useActivityTracker.ts` | Add guards against duplicate session creation; reuse existing session from localStorage |
| New migration SQL | Update `get_activity_logging_summary` RPC with fixed duration logic; clean up orphaned sessions |

### Result

- Each user will have at most one active session at a time
- Orphaned sessions won't inflate usage time
- The displayed usage time will accurately reflect actual time spent in the app

