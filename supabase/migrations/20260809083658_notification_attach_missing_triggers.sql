-- Attaches the 3 notification triggers production is missing. Their trigger
-- functions ALREADY exist here — they simply were never wired to a table, so
-- they have never run.
--
-- Why this matters concretely: production has 2 ACTIVE notification_rules on
-- leave_applications ("notify Prajwal C when leave applied / approval
-- requested") that could never fire, because nothing emitted the event. This
-- switches on rules you already configured.
--
-- activity_events and visits have no rules yet, so they emit events that match
-- nothing and send nothing — harmless, and ready for when rules are added.
--
-- pm_tasks is DELIBERATELY EXCLUDED: staging's trigger_notification_pm_tasks
-- references NEW.assigned_to, and this database's pm_tasks has no such column
-- (only created_at, created_by, id, status, title). Wiring it would abort every
-- pm_tasks write. Revisit once the column exists.
--
-- Safety: emit_notification_event here is already wrapped in EXCEPTION WHEN
-- OTHERS (migration guard_notification_emit_never_aborts_writes_prod), so a
-- notification fault degrades to a WARNING instead of losing the business row.

DROP TRIGGER IF EXISTS trg_notification_activity_events ON public.activity_events;
CREATE TRIGGER trg_notification_activity_events
  AFTER INSERT ON public.activity_events
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notification_activity_events();

DROP TRIGGER IF EXISTS trg_notification_leave_applications ON public.leave_applications;
CREATE TRIGGER trg_notification_leave_applications
  AFTER INSERT OR UPDATE ON public.leave_applications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notification_leave_applications();

DROP TRIGGER IF EXISTS trg_notification_visits ON public.visits;
CREATE TRIGGER trg_notification_visits
  AFTER INSERT OR UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notification_visits();

NOTIFY pgrst, 'reload schema';