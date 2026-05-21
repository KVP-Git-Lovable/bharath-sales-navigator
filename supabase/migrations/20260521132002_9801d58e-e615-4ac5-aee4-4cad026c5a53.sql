
CREATE TABLE IF NOT EXISTS public.sardar_restore_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  run_by uuid,
  mode text NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.sardar_restore_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sardar_audit_runs_admin_select"
  ON public.sardar_restore_audit_runs FOR SELECT
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "sardar_audit_runs_admin_insert"
  ON public.sardar_restore_audit_runs FOR INSERT
  WITH CHECK (public.is_system_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.sardar_restore_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.sardar_restore_audit_runs(id) ON DELETE SET NULL,
  retailer_id uuid,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sardar_restore_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sardar_restore_log_admin_select"
  ON public.sardar_restore_log FOR SELECT
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "sardar_restore_log_admin_insert"
  ON public.sardar_restore_log FOR INSERT
  WITH CHECK (public.is_system_admin(auth.uid()));
