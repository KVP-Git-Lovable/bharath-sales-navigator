-- Notification module, staging -> production. PHASE 1: additive only.
--
-- Adds 4 columns to notifications and 4 event types. Nothing is dropped,
-- renamed or deleted. Every column is nullable or has a default, so existing
-- rows are unaffected and no rewrite of existing data occurs.
--
-- Deliberately NOT included (needs review first):
--   * emit_notification_event  - already wrapped separately; prod's 'self' and
--                                'reporting_chain' branches must be preserved
--   * notification_rules DATA  - production has 9 live configured rules,
--                                staging only 4. Production's win.
--   * the leave triggers       - prod uses trg_notify_leave_applied, staging
--                                uses a different pair; adding both duplicates
--                                every leave notification.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read_at         timestamptz,
  ADD COLUMN IF NOT EXISTS is_dismissed    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'delivered';

-- Keeps read_at in step with is_read without the UI having to set both.
CREATE OR REPLACE FUNCTION public.set_notification_read_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NEW.is_read IS TRUE AND (OLD.is_read IS DISTINCT FROM TRUE) AND NEW.read_at IS NULL THEN
    NEW.read_at := now();
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_notifications_read_at ON public.notifications;
CREATE TRIGGER trg_notifications_read_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_read_at();

-- Event types staging has that production lacks. ON CONFLICT keeps
-- production's existing rows (AUTO_DAY_WARNING, RECORD_APPROVED,
-- RECORD_DELETED) untouched.
INSERT INTO public.notification_event_types (event_code, label, description, is_active)
VALUES
  ('WEEKLY_LEADERBOARD',  'Weekly leaderboard',  'Weekly gamification leaderboard results', true),
  ('MONTHLY_LEADERBOARD', 'Monthly leaderboard', 'Monthly gamification leaderboard results', true),
  ('SCHEME_UPDATED',      'Scheme Updated',      'A scheme was created or changed', true),
  ('SCHEME_EXPIRED',      'Scheme Expired',      'A scheme reached its end date', true)
ON CONFLICT (event_code) DO NOTHING;