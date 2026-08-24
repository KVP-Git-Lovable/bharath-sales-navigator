-- Stop the every-15-minute RLS_POLICY_MISSING alert e-mails to info@kvpcorp.com
-- Project: etabpbfokzhhfuybeieu  (Application test)
-- Applied live 2026-08-24 via Supabase MCP as two migrations:
--   1. rls_drift_alert_dedup
--   2. silence_rls_policy_alert_emails
--
-- Root cause: public.rls_baseline lists a policy "No client deletes on profiles"
-- on public.profiles that does not exist. check_rls_drift() ran every 15 min and
-- INSERTed a fresh securityaudit_events row on EVERY run while the condition held.
-- The securityaudit_notify_trg trigger e-mails on every such insert
-- -> 96 e-mails/day (192 events observed over 2 days).

-- ---------------------------------------------------------------------------
-- PART 1: make drift detection state-aware (alert on transition, not on poll)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rls_drift_state (
  event_type  text NOT NULL,
  table_name  text NOT NULL,
  policy_name text NOT NULL DEFAULT '',
  first_seen  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_type, table_name, policy_name)
);

ALTER TABLE public.rls_drift_state ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: reachable only by SECURITY DEFINER routines / service role.

CREATE OR REPLACE FUNCTION public.check_rls_drift()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_drift int := 0;
  v_missing text[];
  v_key text;
  v_is_new boolean;
  v_seen text[] := '{}';
BEGIN
  FOR r IN SELECT table_name, policy_names FROM public.rls_baseline LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = r.table_name AND c.relkind = 'r') THEN

      -- RLS switched off entirely: auto-remediate and always log
      -- (self-limiting, cannot repeat once fixed)
      IF NOT (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = r.table_name) THEN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
        INSERT INTO public.securityaudit_events(event_type, schema_name, table_name, object_identity, ddl_command, session_user_name)
        VALUES ('RLS_DRIFT_REENABLED', 'public', r.table_name, format('public.%I', r.table_name), 'auto re-enabled RLS (was disabled)', session_user);
        v_drift := v_drift + 1;
      END IF;

      SELECT array_agg(pn) INTO v_missing
      FROM unnest(r.policy_names) pn
      WHERE pn NOT IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = r.table_name);

      IF v_missing IS NOT NULL AND array_length(v_missing, 1) > 0 THEN
        v_key  := array_to_string(v_missing, ',');
        v_seen := v_seen || (r.table_name || '|' || v_key);

        INSERT INTO public.rls_drift_state(event_type, table_name, policy_name)
        VALUES ('RLS_POLICY_MISSING', r.table_name, v_key)
        ON CONFLICT (event_type, table_name, policy_name)
        DO UPDATE SET last_seen = now()
        RETURNING (xmax = 0) INTO v_is_new;

        -- Only a newly-opened condition writes an audit row
        IF v_is_new THEN
          INSERT INTO public.securityaudit_events(event_type, schema_name, table_name, policy_name, object_identity, ddl_command, session_user_name)
          VALUES ('RLS_POLICY_MISSING', 'public', r.table_name, v_key, format('public.%I', r.table_name), 'baseline policy missing', session_user);
        END IF;

        v_drift := v_drift + 1;
      END IF;
    END IF;
  END LOOP;

  -- Clear conditions that no longer apply, so a genuine recurrence alerts again.
  DELETE FROM public.rls_drift_state
  WHERE event_type = 'RLS_POLICY_MISSING'
    AND NOT ((table_name || '|' || policy_name) = ANY (v_seen));

  RETURN v_drift;
END $function$;

-- Seed currently-open drift so the next cron run stays silent.
INSERT INTO public.rls_drift_state(event_type, table_name, policy_name)
SELECT 'RLS_POLICY_MISSING', b.table_name, array_to_string(m.missing, ',')
FROM public.rls_baseline b
CROSS JOIN LATERAL (
  SELECT array_agg(pn) AS missing
  FROM unnest(b.policy_names) pn
  WHERE pn NOT IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = b.table_name)
) m
WHERE m.missing IS NOT NULL
  AND array_length(m.missing, 1) > 0
  AND EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public' AND c.relname = b.table_name AND c.relkind = 'r')
ON CONFLICT (event_type, table_name, policy_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- PART 2: no e-mail at all for RLS policy drift / policy changes
-- Audit rows are still written; only the outbound e-mail is suppressed.
-- DROP TABLE alerts are deliberately preserved (destructive, non-RLS event).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.securityaudit_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.event_type IN ('DROP TABLE') THEN
    PERFORM public.notify_admins(
      'security_alert',
      'Security change: '||NEW.event_type,
      COALESCE(NEW.event_type,'')||' on '||COALESCE(NEW.table_name,'?')||COALESCE(' ('||NEW.policy_name||')','')||' by '||COALESCE(NEW.session_user_name,'?')
    );
  END IF;
  RETURN NEW;
END
$function$;

-- ---------------------------------------------------------------------------
-- OPTIONAL root-cause fix (NOT applied -- your call).
-- public.profiles has RLS on and no DELETE policy, so client deletes are
-- already denied by default. This makes the baseline match reality and
-- resolves the drift condition permanently. It is a no-op security-wise
-- (deny -> deny).
--
--   CREATE POLICY "No client deletes on profiles"
--     ON public.profiles AS RESTRICTIVE FOR DELETE
--     TO authenticated, anon USING (false);
--
-- Alternative: drop the stale name from the baseline instead --
--   UPDATE public.rls_baseline
--   SET policy_names = array_remove(policy_names, 'No client deletes on profiles')
--   WHERE table_name = 'profiles';
-- ---------------------------------------------------------------------------
