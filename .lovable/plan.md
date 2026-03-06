

# Event-Based Notification Engine

## Current State
- Existing `notifications` table stores simple notifications (user_id, title, message, type, is_read)
- `notification_preferences` table exists but only for push content template types
- Notifications are currently hardcoded in only one place (`RetailManagement.tsx` for retailer verification)
- No event system, no notification rules, no configurable engine exists

## Architecture

```text
Module Action (order created, leave approved, etc.)
       ↓
  DB Trigger on target table
       ↓
  calls process_notification_event() PG function
       ↓
  Looks up notification_rules for matching event_type + module
       ↓
  Resolves receiver (employee, manager, admin, role, specific user)
       ↓
  Renders message template with placeholders
       ↓
  Inserts into notifications table
       ↓
  Real-time subscription in NotificationBell picks it up
```

## Database Changes (3 new tables + 1 function)

### 1. `notification_event_types` (reference table)
- `id` uuid PK
- `event_code` text UNIQUE (RECORD_CREATED, RECORD_APPROVED, etc.)
- `label` text (human-readable)
- `description` text
- `is_active` boolean default true

Seed with 10 system events: RECORD_CREATED, RECORD_UPDATED, RECORD_DELETED, RECORD_APPROVED, RECORD_REJECTED, TASK_ASSIGNED, ACTIVITY_COMPLETED, TARGET_ACHIEVED, COMMENT_ADDED, FILE_UPLOADED

### 2. `notification_rules` (admin-configurable)
- `id` uuid PK
- `name` text (rule name)
- `event_code` text (FK to event_types)
- `source_table` text (which table triggers this, e.g. 'orders', 'leave_applications')
- `receiver_type` text ('employee', 'manager', 'admin', 'role', 'specific_user')
- `receiver_role` text nullable (if receiver_type = 'role')
- `receiver_user_id` uuid nullable (if receiver_type = 'specific_user')
- `notification_channel` text default 'in_app' ('in_app', 'email', 'push')
- `message_template` text (with {placeholders})
- `title_template` text
- `is_active` boolean default true
- `created_by` uuid
- `created_at`, `updated_at` timestamps

### 3. `notification_event_log` (audit trail)
- `id` uuid PK
- `event_code` text
- `source_table` text
- `record_id` uuid
- `actor_user_id` uuid
- `metadata` jsonb (snapshot of relevant data for placeholder resolution)
- `processed` boolean default false
- `created_at` timestamp

### 4. DB Function: `emit_notification_event()`
A SECURITY DEFINER function that:
1. Inserts into `notification_event_log`
2. Queries matching `notification_rules` by event_code + source_table
3. Resolves receiver (looks up manager via employees table, or admin users, etc.)
4. Renders templates by replacing placeholders from metadata jsonb
5. Inserts into `notifications` table
6. Marks event as processed

### 5. DB Triggers on key tables
Create AFTER INSERT/UPDATE triggers on: `orders`, `leave_applications`, `regularization_requests`, `approval_requests`, `visits`, `activity_events`, `pm_tasks` — each calling `emit_notification_event()` with appropriate event_code and metadata.

## Frontend Changes

### Admin UI: Notification Rules Manager
- New page `/admin/notification-rules` (replace or extend current `/push-content-setup`)
- Add to AdminControls module list
- Features:
  - List all rules with toggle active/inactive
  - Create/edit rule dialog: select event, source table, receiver type, channels, message template with placeholder helper
  - Preview rendered message
  - Test rule button

### Components
- `src/pages/admin/NotificationRulesAdmin.tsx` — main admin page
- `src/components/admin/NotificationRuleForm.tsx` — create/edit form with placeholder picker

### Permission Integration
Already has permission entries: `action_admin_notification_create`, `action_admin_notification_edit`, etc. — will reuse these.

## Implementation Steps
1. Create DB migration: 3 tables + seed event types + `emit_notification_event()` function
2. Create DB triggers on key tables (orders, leave_applications, etc.)
3. Build NotificationRulesAdmin page with CRUD for rules
4. Add route and update AdminControls entry
5. Existing `NotificationBell` + `useNotifications` hook already handle real-time display — no changes needed

## Placeholder Resolution
The `metadata` jsonb passed to `emit_notification_event()` will contain all available context. The function will do simple `REPLACE()` on template strings:
- `{user_name}` — actor's full_name from profiles
- `{module_name}` — derived from source_table
- `{record_name}` — from metadata
- `{date}` — current date or from metadata
- `{points}` — from metadata if applicable

