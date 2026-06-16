
-- Ensure pg_net is available for async HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: fire-and-forget POST to the edge function
CREATE OR REPLACE FUNCTION public.notify_teams_on_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://etabpbfokzhhfuybeieu.supabase.co/functions/v1/notify-teams-lead',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('lead_id', NEW.id::text),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Never block the insert if pg_net or the function fails
    RAISE WARNING 'notify_teams_on_new_lead failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Idempotent trigger creation
DROP TRIGGER IF EXISTS trg_notify_teams_on_new_lead ON public.website_leads;
CREATE TRIGGER trg_notify_teams_on_new_lead
AFTER INSERT ON public.website_leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_teams_on_new_lead();
