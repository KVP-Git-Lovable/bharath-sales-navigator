
## Diagnosis (verified against live DB)

The app is **rendering correctly**. The problem is data, not code.

Live `beats` table, filtered by Mokshith's id (`73044cad-2c19-4a47-89f1-6a755adc3362`) on `user_id` / `owner_id` / `created_by`:

```
total rows: 1
- beat_id: beat_1761221118299_esqwetbi8  name: Testbeat  is_active: FALSE
```

Yet `retailers` for Mokshith = **654 rows**, referencing **25 distinct beat_ids** (e.g. `beat_1765167092097_d46zfr3ie` = 68 retailers, `beat_1765248776015_eu5r3jewe` = 57, …). Those 25 parent beat rows are **missing from `public.beats`**.

The earlier migration `supabase/migrations/20260522065420_*.sql` had a 25-row `INSERT … ON CONFLICT (beat_id) DO UPDATE`. In the live DB only Testbeat reflects the migration (its `owner_id`/`user_id`/`owner_name` match the migration values). The other 24 rows are **not in `beats`, not in `recycle_bin`, not soft-deleted**. The previous AI's claim that "26 beats were restored" was incorrect — those beats never landed in the DB.

So when Mokshith opens My Beats:
- `BeatPlanning.tsx` / `MyBeats.tsx` query `beats` with `is_active=true` and the OR filter → returns 0 from DB.
- Anything he sees in the UI is from his local IndexedDB cache (a recently-created beat he made himself).

No frontend fix can make beats appear that don't exist in the database.

## What to do

Single migration that re-inserts the 25 historical beats with the exact `beat_id` values the 654 retailers already reference, so existing retailer → beat relationships start resolving.

### Step 1 — New migration `restore_mokshith_beats_v2.sql`

Re-run the same 25-row UPSERT, but in a way we can verify:

```sql
DO $$
DECLARE
  before_count int;
  after_count int;
BEGIN
  SELECT count(*) INTO before_count FROM public.beats
   WHERE user_id  = '73044cad-2c19-4a47-89f1-6a755adc3362'
      OR owner_id = '73044cad-2c19-4a47-89f1-6a755adc3362'
      OR created_by = '73044cad-2c19-4a47-89f1-6a755adc3362';

  INSERT INTO public.beats
    (id, beat_id, beat_name, category, travel_allowance, average_km,
     average_time_minutes, is_active, created_by, created_at, updated_at,
     territory_id, distributor_id, owner_id, owner_name, user_id)
  VALUES
    -- 25 rows copied verbatim from 20260522065420_*.sql --
  ON CONFLICT (beat_id) DO UPDATE SET
    beat_name      = EXCLUDED.beat_name,
    category       = EXCLUDED.category,
    is_active      = EXCLUDED.is_active,
    owner_id       = EXCLUDED.owner_id,
    owner_name     = EXCLUDED.owner_name,
    user_id        = EXCLUDED.user_id,
    updated_at     = now();

  SELECT count(*) INTO after_count FROM public.beats
   WHERE user_id  = '73044cad-2c19-4a47-89f1-6a755adc3362'
      OR owner_id = '73044cad-2c19-4a47-89f1-6a755adc3362'
      OR created_by = '73044cad-2c19-4a47-89f1-6a755adc3362';

  RAISE NOTICE 'Mokshith beats before=%, after=%', before_count, after_count;
  IF after_count < 25 THEN
    RAISE EXCEPTION 'Beat restore landed only % rows — aborting', after_count;
  END IF;
END $$;
```

The `RAISE EXCEPTION` guard guarantees we either land ≥25 rows or the migration visibly fails (so we can debug instead of silently ending up with 1 row again).

### Step 2 — Verify in DB

After migration applies, run:

```sql
SELECT count(*) FROM beats
 WHERE (user_id='73044cad-…' OR owner_id='73044cad-…' OR created_by='73044cad-…')
   AND is_active = true;
```
Expect ≥ 24 (one of the 25, `Karkala 18`, is `is_active=false` per the source data; Testbeat is also false).

### Step 3 — Refresh Mokshith's device

No APK rebuild. After the migration runs:
1. Mokshith opens **My Beat** while online → existing logic in `MyBeats.tsx` L322–342 overwrites `STORES.BEATS` cache with the freshly-restored list.
2. Then **My Visit → All Beats → Journey Plan** uses the same cache + the patched OR filter from the prior fix.

### Step 4 — Sanity-check the orphaned retailer references

Confirm zero retailer `beat_id`s remain orphaned after the restore:

```sql
SELECT r.beat_id, count(*)
  FROM retailers r
  LEFT JOIN beats b ON b.beat_id = r.beat_id
 WHERE r.user_id = '73044cad-…'
   AND r.beat_id NOT IN ('','unassigned')
   AND b.beat_id IS NULL
 GROUP BY r.beat_id;
```
Two known stragglers (`karkala9`, `karkala-9`, `beat_1779342521597_v77drd3p3`) are not in the restore set — flag those to you separately so you can decide whether to re-map them to existing beats or leave as-is.

## Technical notes

- No code changes are required. The earlier fixes to `MyBeats.tsx`, `BeatPlanning.tsx`, and `useMasterDataCache.ts` (filter on `user_id OR owner_id OR created_by`) are correct and stay as-is.
- The migration is idempotent (UPSERT) and guarded, so re-running is safe.
- No `auth.users` or other reserved-schema changes.

## Out of scope

- Rebuilding APK (not needed — web bundle is loaded remotely).
- Touching `retailers` (already restored, 654 rows present).
- The 3 orphan `beat_id`s above — surfaced for your decision, not auto-fixed.
