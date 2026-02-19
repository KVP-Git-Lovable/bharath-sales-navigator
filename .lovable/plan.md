

## Fix: Usage Time Calculation in Activity Logging

### Problem

The current SQL function sums the duration of every session independently. But the app creates many duplicate/overlapping sessions (from React StrictMode, HMR, page refreshes, tab reopens). For example, Abhishek KP has **334 sessions in a single day** -- many overlapping in time. Summing them all gives 33h+ for a 24h day.

### Solution

Replace the session duration calculation in the `get_activity_logging_summary` database function with an **interval-merging algorithm**. This is a classic technique:

1. Sort all sessions by `login_at`
2. Walk through them, merging any session that overlaps with the previous one into a single continuous interval
3. Sum only the merged (non-overlapping) intervals

This gives the actual **wall-clock time** the user was logged in, regardless of how many duplicate sessions exist.

### Technical Details

**Database migration** -- Replace the `get_activity_logging_summary` function.

The key change is in the session duration subquery. Instead of:

```text
Current (broken):
  Session 1: 10:00 - 10:30  (30 min)
  Session 2: 10:05 - 10:35  (30 min)  <-- overlaps!
  Session 3: 10:10 - 10:40  (30 min)  <-- overlaps!
  Total: 90 min (WRONG - actual time is only 40 min)
```

The new logic merges overlapping intervals:

```text
Fixed:
  Session 1: 10:00 - 10:30
  Session 2: 10:05 - 10:35  --> merged into 10:00 - 10:35
  Session 3: 10:10 - 10:40  --> merged into 10:00 - 10:40
  Total: 40 min (CORRECT)
```

The SQL uses a window function approach:
1. For each session, compute `login_at` and `COALESCE(logout_at, now())` as the interval
2. Use `LAG()` to track the running maximum end time
3. When a session starts after the previous max end, it begins a new group
4. Sum only the non-overlapping merged intervals per user

Additionally, cap any single merged interval at 16 hours (57600 seconds) as a safety net.

### Files Changed

- **Database function only** -- one migration to replace `get_activity_logging_summary`
- **No frontend code changes needed** -- the component already displays whatever the RPC returns

