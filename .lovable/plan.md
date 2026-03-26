

# Auto End Day — Complete Fix Plan

## Current State

**Policy configured:**
- Enabled, auto-close at 23:59 IST, pre-warning 15 min before (23:44), last activity source: `all_activity`
- `close_in_progress_visits`: OFF, `cancel_planned_visits`: ON, `mark_unproductive`: OFF

**What's broken:**

| Issue | Detail |
|---|---|
| No cron job | The `auto-end-day` edge function is never invoked automatically — no `pg_cron` job exists |
| Warning goes to manager, not user | `AUTO_DAY_WARNING` rule uses `receiver_type = 'employee'` which resolves to the manager. The user who needs to end their day never sees the warning |
| No `AUTO_DAY_CLOSED` rule | After auto-close, no notification is sent because no matching rule exists |
| `process_notification_event` has no `self` type | No way to send a notification to the actor (the user themselves) |
| `total_hours` not computed on auto-close | The edge function sets `check_out_time` but never calculates `total_hours` |
| `close_in_progress_visits` is OFF in config but code path exists | Not a bug — just noting this matches the saved config |

**What already works:**
- The edge function correctly reads the policy from the DB
- Time-window logic (±15 min) for warning vs close is correct
- Last activity detection across orders, visits, page views, sessions works
- Visit cancellation and retailer log closing logic is correct

---

## Plan

### Step 1 — Add `self` receiver type to `process_notification_event` (Migration)

Update the function so that when `receiver_type = 'self'`, the notification goes to `NEW.actor_user_id` directly (skipping the "don't notify self" filter that exists for other types).

### Step 2 — Fix `AUTO_DAY_WARNING` rule (Insert tool)

```sql
UPDATE notification_rules 
SET receiver_type = 'self' 
WHERE event_code = 'AUTO_DAY_WARNING';
```

This ensures the warning ("Your day will auto-end at 23:59") reaches the affected user.

### Step 3 — Create `AUTO_DAY_CLOSED` notification rule (Insert tool)

```sql
INSERT INTO notification_rules 
  (event_code, source_table, name, receiver_type, title_template, message_template, notification_channel, is_active)
VALUES 
  ('AUTO_DAY_CLOSED', 'attendance', 'Day Auto-Closed', 'self',
   'Your Day Was Auto-Closed',
   'Your day on {date} has been automatically ended. Last activity detected at {last_activity}.',
   'in_app', true);
```

### Step 4 — Compute `total_hours` on auto-close (Edge function update)

Update the edge function to calculate and store `total_hours` when closing attendance:

```typescript
const checkInDate = new Date(record.check_in_time)
const checkOutDate = new Date(lastActivityTime)
const totalHours = Math.round(((checkOutDate.getTime() - checkInDate.getTime()) / 3600000) * 100) / 100

// Include total_hours in the attendance update
.update({
  check_out_time: lastActivityTime,
  total_hours: totalHours,
  check_out_address: 'Auto-closed by system',
  notes: `Auto-closed. Last activity: ${lastActivityTime}`,
  updated_at: new Date().toISOString()
})
```

### Step 5 — Schedule cron job (Insert tool)

Set up `pg_cron` to invoke the edge function every 15 minutes. The function's internal time-window logic will determine whether to send warnings or close records.

```sql
SELECT cron.schedule(
  'auto-end-day-check',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://etabpbfokzhhfuybeieu.supabase.co/functions/v1/auto-end-day',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

### Step 6 — Add template placeholders for warning notification

Update the edge function's warning emission to include `user_name` in metadata so the notification message can be personalized:

```typescript
// Fetch user name for the notification
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name')
  .eq('id', record.user_id)
  .single()

await supabase.rpc('emit_notification_event', {
  p_event_code: 'AUTO_DAY_WARNING',
  p_source_table: 'attendance',
  p_record_id: record.id,
  p_actor_user_id: record.user_id,
  p_metadata: {
    user_name: profile?.full_name || 'User',
    record_name: 'Attendance',
    date: dateStr,
    auto_close_time: policy.auto_close_time,
    minutes_remaining: policy.pre_warning_minutes_before
  }
})
```

---

## Summary of Changes

| # | What | How |
|---|---|---|
| 1 | Add `self` receiver type | DB migration — update `process_notification_event` function |
| 2 | Fix warning recipient | Insert tool — update `AUTO_DAY_WARNING` rule |
| 3 | Add close notification rule | Insert tool — insert `AUTO_DAY_CLOSED` rule |
| 4 | Compute `total_hours` | Update edge function `auto-end-day/index.ts` |
| 5 | Schedule automatic execution | Insert tool — `cron.schedule` every 15 min |
| 6 | Enrich notification metadata | Update edge function to include user name |

After these changes, the full flow will be:
- Every 15 minutes, the cron triggers the edge function
- At 23:44 IST, users with open attendance get an in-app warning
- At 23:59 IST, open attendance records are auto-closed with `total_hours` computed, visits handled per policy config, and users notified

