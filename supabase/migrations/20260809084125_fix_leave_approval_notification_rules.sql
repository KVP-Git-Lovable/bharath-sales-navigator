-- The "When Approval requested" rule was set to event_code RECORD_UPDATED, but
-- trigger_notification_leave_applications never emits that code — it emits
-- RECORD_CREATED on insert and RECORD_APPROVED / RECORD_REJECTED on a status
-- change. So the rule could never fire.
--
-- Intent (confirmed): notify on the OUTCOME of a leave decision. Repointed to
-- RECORD_APPROVED and reworded — "Approval needed / requested approval" was
-- wrong for an event that means the leave has already been decided. A matching
-- RECORD_REJECTED rule is cloned from it so every other column (recipient,
-- channel, timezone, ...) carries over identically.
--
-- The actor passed by the trigger is NEW.user_id — the employee who applied —
-- so {user_name} renders the applicant, not the approver.
--
-- "When Leave applied" (RECORD_CREATED) is untouched and already works.

UPDATE public.notification_rules
   SET event_code       = 'RECORD_APPROVED',
       name             = 'When Leave approved → notify Prajwal C',
       title_template   = 'Leave approved — {user_name}',
       message_template = '{user_name}''s leave for {date} has been approved.',
       updated_at       = now()
 WHERE id = '85eac4e8-d928-4515-b775-e9f29a0e852e'
   AND source_table = 'leave_applications'
   AND event_code = 'RECORD_UPDATED';

INSERT INTO public.notification_rules (
  event_code, source_table, title_template, message_template, receiver_type,
  receiver_user_id, notification_channel, is_active, name, receiver_role,
  retailer_target_type, retailer_target_ids, created_by, timezone
)
SELECT
  'RECORD_REJECTED', r.source_table,
  'Leave rejected — {user_name}',
  '{user_name}''s leave for {date} has been rejected.',
  r.receiver_type, r.receiver_user_id, r.notification_channel, r.is_active,
  'When Leave rejected → notify Prajwal C', r.receiver_role,
  r.retailer_target_type, r.retailer_target_ids, r.created_by, r.timezone
FROM public.notification_rules r
WHERE r.id = '85eac4e8-d928-4515-b775-e9f29a0e852e'
  AND NOT EXISTS (
    SELECT 1 FROM public.notification_rules x
    WHERE x.source_table = 'leave_applications'
      AND x.event_code = 'RECORD_REJECTED');