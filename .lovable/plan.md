

## Remove Hardcoded Notification from Auto-End-Day & Use Notification Rules Instead

### What's happening now
The `auto-end-day` edge function (line 173-183) directly inserts a notification into the `notifications` table with a hardcoded title "Day Auto-Closed" and message. This bypasses the Notification Rules engine entirely.

### What we'll do

**Step 1: Add a new event type `AUTO_DAY_CLOSED` to `notification_event_types`**

Insert a new event type so it appears in the Notification Rules UI dropdown:
```sql
INSERT INTO notification_event_types (event_code, label, description, is_active)
VALUES ('AUTO_DAY_CLOSED', 'Day Auto-Closed', 'Triggered when attendance is automatically closed at midnight', true)
ON CONFLICT DO NOTHING;
```

**Step 2: Remove the hardcoded notification insert from the edge function**

Delete lines 173-183 in `auto-end-day/index.ts` (the `Step 7: Send notification to user` block) and replace it with a call to `emit_notification_event` via Supabase RPC:

```typescript
await supabase.rpc('emit_notification_event', {
  p_event_code: 'AUTO_DAY_CLOSED',
  p_source_table: 'attendance',
  p_record_id: record.id,
  p_actor_user_id: userId,
  p_metadata: {
    record_name: 'Attendance',
    date: dateStr,
    last_activity: lastActivityTime
  }
});
```

This routes the notification through the rules engine. If no rule is configured for `AUTO_DAY_CLOSED` + `attendance`, no notification is sent -- giving admins full control.

**Step 3: How to configure it in Notification Rules UI**

After deployment, go to **Admin > Notification Rules > Add Rule** and set:
- **Event Type**: Day Auto-Closed
- **Source Table**: attendance
- **Receiver**: Employee (Actor) -- sends to the user whose day was closed
- **Channel**: In-App
- **Title Template**: `Day Auto-Closed`
- **Message Template**: `Your day was automatically closed at midnight on {date}. Last activity: {record_name}`

You can also add a second rule for managers or admins if needed.

### Files to change

| File | Change |
|---|---|
| New DB migration | Insert `AUTO_DAY_CLOSED` event type |
| `supabase/functions/auto-end-day/index.ts` | Replace hardcoded notification insert (lines 173-183) with `supabase.rpc('emit_notification_event', ...)` |

### Result
- No hardcoded notifications -- everything flows through the Notification Rules engine
- Admins can enable/disable/customize the auto-close notification from the UI
- Can add multiple rules (e.g., notify employee + notify manager) without touching code

