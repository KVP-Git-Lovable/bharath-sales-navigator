

## Replace Usage Time with Attendance Duration

### What Changes
Replace the "Usage Time" column in Activity Logging to use attendance-based duration (Day Start to Day End) instead of session-based interval merging. Users who haven't started their day show "-".

### Changes Required

#### 1. Update SQL Function: `get_activity_logging_summary`
Create a new migration that replaces the `sess` subquery (which uses `user_sessions` with interval merging) with a simpler query against the `attendance` table:
- For each user, sum the duration between `check_in_time` and `check_out_time` for attendance records within the time window
- If `check_out_time` is NULL (day started but not ended yet), use `now()` as the end time
- Users with no attendance record for the period will have `total_seconds = -1` (sentinel value to indicate "not started")
- The INNER JOIN on `sess` changes to a LEFT JOIN so users with page views but no attendance still appear
- The main user list is driven by users who have either attendance OR page_views in the window

#### 2. Update Frontend: `ActivityLoggingSection.tsx`
- Modify `formatUsageTime` to handle the sentinel: if `total_usage_seconds < 0`, return `'-'`
- Update the `ActivityRow` interface -- `total_usage_seconds` can now be `-1`
- No other UI changes needed

### Technical Details

**New SQL for attendance-based duration** (replaces the `sess` CTE block):
```sql
LEFT JOIN (
  SELECT
    user_id,
    SUM(
      EXTRACT(EPOCH FROM (COALESCE(check_out_time, now()) - check_in_time))
    )::bigint AS total_seconds
  FROM public.attendance
  WHERE check_in_time >= v_window_start
    AND check_in_time <= now()
  GROUP BY user_id
) att ON att.user_id = p.id
```

The main query changes from `INNER JOIN sess` to driving from profiles that have either attendance or page_views, and uses `COALESCE(att.total_seconds, -1)` so the frontend can distinguish "no attendance" from "0 seconds".

**Frontend change** in `formatUsageTime`:
```typescript
function formatUsageTime(seconds: number): string {
  if (seconds < 0) return '-';
  if (seconds <= 0) return '0m';
  // ... rest unchanged
}
```

### Files to Modify
1. **New migration SQL** -- drop and recreate `get_activity_logging_summary` with attendance-based logic
2. **`src/components/status/ActivityLoggingSection.tsx`** -- update `formatUsageTime` to show `-` for users without attendance

