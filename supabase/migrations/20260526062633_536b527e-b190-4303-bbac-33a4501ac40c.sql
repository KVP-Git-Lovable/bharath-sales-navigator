
-- ============================================================
-- 1. Restore Mokshith's 25 beats from destructive_audit_log
--    (preserves original id + beat_id so retailers stay linked)
-- ============================================================
INSERT INTO public.beats (
  id, beat_id, beat_name, category, travel_allowance,
  average_km, average_time_minutes, is_active, created_by,
  created_at, updated_at, territory_id, distributor_id,
  owner_id, owner_name, user_id
)
SELECT
  (row_data->>'id')::uuid,
  row_data->>'beat_id',
  row_data->>'beat_name',
  COALESCE(row_data->>'category','General'),
  COALESCE((row_data->>'travel_allowance')::numeric,0),
  COALESCE((row_data->>'average_km')::numeric,0),
  COALESCE((row_data->>'average_time_minutes')::int,0),
  true,
  NULLIF(row_data->>'created_by','')::uuid,
  COALESCE((row_data->>'created_at')::timestamptz, now()),
  now(),
  NULLIF(row_data->>'territory_id','')::uuid,
  NULLIF(row_data->>'distributor_id','')::uuid,
  NULLIF(row_data->>'owner_id','')::uuid,
  row_data->>'owner_name',
  NULLIF(row_data->>'user_id','')::uuid
FROM public.destructive_audit_log
WHERE table_name='beats'
  AND occurred_at::date='2026-05-26'
  AND row_data->>'owner_id'='73044cad-2c19-4a47-89f1-6a755adc3362'
ON CONFLICT (id) DO UPDATE
  SET is_active=true,
      beat_name=EXCLUDED.beat_name,
      owner_id=EXCLUDED.owner_id,
      owner_name=EXCLUDED.owner_name,
      updated_at=now();

-- ============================================================
-- 2. CASCADE -> SET NULL on beat-linked tables
-- ============================================================
ALTER TABLE public.distributor_beat_mappings
  DROP CONSTRAINT IF EXISTS distributor_beat_mappings_beat_id_fkey,
  ALTER COLUMN beat_id DROP NOT NULL,
  ADD CONSTRAINT distributor_beat_mappings_beat_id_fkey
    FOREIGN KEY (beat_id) REFERENCES public.beats(id) ON DELETE SET NULL;

ALTER TABLE public.van_beat_assignments
  DROP CONSTRAINT IF EXISTS van_beat_assignments_beat_id_fkey,
  ALTER COLUMN beat_id DROP NOT NULL,
  ADD CONSTRAINT van_beat_assignments_beat_id_fkey
    FOREIGN KEY (beat_id) REFERENCES public.beats(id) ON DELETE SET NULL;

ALTER TABLE public.user_business_plan_territory_beats
  DROP CONSTRAINT IF EXISTS user_business_plan_territory_beats_beat_id_fkey,
  ALTER COLUMN beat_id DROP NOT NULL,
  ADD CONSTRAINT user_business_plan_territory_beats_beat_id_fkey
    FOREIGN KEY (beat_id) REFERENCES public.beats(id) ON DELETE SET NULL;

-- ============================================================
-- 3. beat_audit_log: align schema with the app
-- ============================================================
ALTER TABLE public.beat_audit_log
  ADD COLUMN IF NOT EXISTS old_user_id uuid,
  ADD COLUMN IF NOT EXISTS new_user_id uuid;

-- ============================================================
-- 4. Block client-side hard deletes on beats and profiles
-- ============================================================
DROP POLICY IF EXISTS "No client deletes on beats" ON public.beats;
CREATE POLICY "No client deletes on beats"
  ON public.beats FOR DELETE
  USING (false);

DROP POLICY IF EXISTS "No client deletes on profiles" ON public.profiles;
CREATE POLICY "No client deletes on profiles"
  ON public.profiles FOR DELETE
  USING (false);

-- ============================================================
-- 5. Destructive audit trigger on profiles
--    (reuses existing log_destructive_delete() function)
-- ============================================================
DROP TRIGGER IF EXISTS trg_audit_delete_profiles ON public.profiles;
CREATE TRIGGER trg_audit_delete_profiles
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_destructive_delete();
