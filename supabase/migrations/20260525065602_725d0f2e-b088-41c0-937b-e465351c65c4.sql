
-- =========================================================
-- 1. REMOVE PROFILE CASCADE on critical tables
-- =========================================================
ALTER TABLE public.beats DROP CONSTRAINT IF EXISTS beats_owner_id_fkey;
ALTER TABLE public.beats
  ADD CONSTRAINT beats_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.hierarchy_target_allocations DROP CONSTRAINT IF EXISTS hierarchy_target_allocations_user_id_fkey;
ALTER TABLE public.hierarchy_target_allocations
  ADD CONSTRAINT hierarchy_target_allocations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.hierarchy_targets DROP CONSTRAINT IF EXISTS hierarchy_targets_root_user_id_fkey;
ALTER TABLE public.hierarchy_targets
  ADD CONSTRAINT hierarchy_targets_root_user_id_fkey
  FOREIGN KEY (root_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.petty_cash_funds DROP CONSTRAINT IF EXISTS petty_cash_funds_user_id_fkey;
ALTER TABLE public.petty_cash_funds
  ADD CONSTRAINT petty_cash_funds_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.petty_cash_transactions DROP CONSTRAINT IF EXISTS petty_cash_transactions_user_id_fkey;
ALTER TABLE public.petty_cash_transactions
  ADD CONSTRAINT petty_cash_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- =========================================================
-- 2. TIGHTEN orders DELETE policy (no client-side deletes)
-- =========================================================
DROP POLICY IF EXISTS "Users can delete own data" ON public.orders;
CREATE POLICY "No client deletes on orders"
  ON public.orders FOR DELETE
  USING (false);

-- =========================================================
-- 3. DESTRUCTIVE AUDIT LOG + triggers on beats and orders
-- =========================================================
CREATE TABLE IF NOT EXISTS public.destructive_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  row_pk text NOT NULL,
  row_data jsonb NOT NULL,
  db_user text NOT NULL DEFAULT current_user,
  app_user uuid,
  application_name text,
  txid bigint NOT NULL DEFAULT txid_current(),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.destructive_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System admins can view destructive audit" ON public.destructive_audit_log;
CREATE POLICY "System admins can view destructive audit"
  ON public.destructive_audit_log FOR SELECT
  USING (public.is_system_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_destructive_audit_table_time
  ON public.destructive_audit_log (table_name, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.log_destructive_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pk text;
  v_app_user uuid;
BEGIN
  BEGIN
    v_app_user := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_app_user := NULL;
  END;

  IF TG_TABLE_NAME = 'beats' THEN
    v_pk := COALESCE(OLD.beat_id, OLD.id::text);
  ELSE
    v_pk := OLD.id::text;
  END IF;

  INSERT INTO public.destructive_audit_log
    (table_name, row_pk, row_data, app_user, application_name)
  VALUES
    (TG_TABLE_NAME, v_pk, to_jsonb(OLD), v_app_user,
     current_setting('application_name', true));

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_delete_beats ON public.beats;
CREATE TRIGGER trg_audit_delete_beats
  AFTER DELETE ON public.beats
  FOR EACH ROW EXECUTE FUNCTION public.log_destructive_delete();

DROP TRIGGER IF EXISTS trg_audit_delete_orders ON public.orders;
CREATE TRIGGER trg_audit_delete_orders
  AFTER DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_destructive_delete();

-- =========================================================
-- 4. RESTORE Mokshith's 25 beats (idempotent UPSERT)
-- =========================================================
INSERT INTO public.beats
  (beat_id, beat_name, is_active, created_by, owner_id, owner_name, user_id, created_at, updated_at)
VALUES
  ('beat_1761281421257_2u5rli464','Halegetu',                  true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1761368897317_9wo4ua0ra','Moorje',                    true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1762746584462_sis6elsoy','beat_1762746584462_sis6elsoy', true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1765167092097_d46zfr3ie','Karkala 1',                 true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1765248776015_eu5r3jewe','Karkala2',                  true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1765248798413_md470lrtl','Karkala3',                  true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1765420760205_uwsrjmx4g','Karkala4',                  true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1765506172360_rg7fd9fsy','Karkala 5',                 true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1765853097390_b4j49ocy1','Karkala 7',                 true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1765939234271_fxb16yk9v','Karkala 6',                 true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1766025930638_hpyfjfcd6','Karkala 8',                 true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1766117124659_gvngz9e1z','Karkala 9',                 true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1766203004977_6a1na7k5n','Karkala 10',                true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1768026506053_km02telad','BANGALORE 1',               true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1769497270960_kwzih4wfh','Surathkal city',            true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1771654981244_s7b7flr4e','Mudipu',                    true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1778481549460_z0txl9vhz','Kaikamba-Mullarpatna',      true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1778562313509_kwlkfb142','Moodabidre city',           true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1778643943663_kjcj9runn','Kodyadka',                  true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1778736209112_eufj4jy5q','Hejamadi',                  true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1778826480667_qtycw84uq','Bajagoli-kuduremukha',      true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1778907304500_qqbudgbzj','Elinje',                    true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('beat_1779342521597_v77drd3p3','Padubidri',                 true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('karkala-9',                   'karkala 9',                 true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now()),
  ('karkala9',                    'karkala9',                  true,'73044cad-2c19-4a47-89f1-6a755adc3362','73044cad-2c19-4a47-89f1-6a755adc3362','Mokshith','73044cad-2c19-4a47-89f1-6a755adc3362', now(), now())
ON CONFLICT (beat_id) DO UPDATE
SET
  beat_name  = EXCLUDED.beat_name,
  is_active  = true,
  owner_id   = EXCLUDED.owner_id,
  owner_name = EXCLUDED.owner_name,
  user_id    = EXCLUDED.user_id,
  created_by = EXCLUDED.created_by,
  updated_at = now();
