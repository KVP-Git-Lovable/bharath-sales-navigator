-- Gamification SCHEMA catch-up only. Brings production's gamification tables up
-- to staging's shape so the engine CAN be ported later — but ports no engine.
--
-- Nothing is dropped, renamed or re-typed. No function, trigger or cron job is
-- added. Production currently awards points by writing directly into
-- gamification_points from the client (7,597 rows, still active today) and that
-- path is completely untouched by this migration: every column added is either
-- nullable or has a default, so existing INSERTs that don't mention the new
-- columns keep working exactly as they do now.

-- gamification_actions: 19 columns (prod 16 -> staging 35) -------------------
ALTER TABLE public.gamification_actions
  ADD COLUMN IF NOT EXISTS conditions_json  jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS expiry_type      text    NOT NULL DEFAULT 'fy_end',
  ADD COLUMN IF NOT EXISTS expiry_days      integer,
  ADD COLUMN IF NOT EXISTS validity_from    date,
  ADD COLUMN IF NOT EXISTS validity_to      date,
  ADD COLUMN IF NOT EXISTS cap_scope        text    NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cap_value        integer,
  ADD COLUMN IF NOT EXISTS redemption_min   integer,
  ADD COLUMN IF NOT EXISTS award_mode       text    NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS leaderboard      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS eligibility_mode text    NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS eligibility_ids  uuid[]  NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS is_tiered        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kpi_id           uuid,
  ADD COLUMN IF NOT EXISTS target_period    text,
  ADD COLUMN IF NOT EXISTS tier_mode        text    NOT NULL DEFAULT 'highest',
  ADD COLUMN IF NOT EXISTS is_system        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS trigger_type     text;

-- gamification_points: 4 columns (prod 9 -> staging 13) ---------------------
-- 7,597 existing rows become status='active', which is the correct reading of
-- a point that was awarded and never expired or revoked.
ALTER TABLE public.gamification_points
  ADD COLUMN IF NOT EXISTS expires_at  timestamptz,
  ADD COLUMN IF NOT EXISTS status      text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS period_key  text,
  ADD COLUMN IF NOT EXISTS retailer_id uuid;

-- gamification_games: 3 columns (prod 13 -> staging 15) ---------------------
-- NOTE: prod also has points_to_rupee_conversion, which staging does NOT.
-- It is deliberately left in place — do not "sync" it away.
ALTER TABLE public.gamification_games
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'orders',
  ADD COLUMN IF NOT EXISTS icon     text,
  ADD COLUMN IF NOT EXISTS color    text;

-- gamification_daily_tracking: 2 columns (prod 7 -> staging 9) --------------
-- period_key is NOT NULL in staging. Added NULLABLE here on purpose: the table
-- is empty today, but if anything inserts into it without period_key a NOT NULL
-- would break a live write. Tighten to NOT NULL at engine cutover, once the
-- engine is the only writer.
ALTER TABLE public.gamification_daily_tracking
  ADD COLUMN IF NOT EXISTS period_key  text,
  ADD COLUMN IF NOT EXISTS retailer_id uuid;

-- gamification_settings: absent in prod ------------------------------------
-- engine_enabled defaults to FALSE, so creating this table does not switch
-- anything on.
CREATE TABLE IF NOT EXISTS public.gamification_settings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton             boolean     NOT NULL DEFAULT true,
  engine_enabled        boolean     NOT NULL DEFAULT false,
  currency_name         text        NOT NULL DEFAULT 'Points',
  point_conversion      numeric     NOT NULL DEFAULT 1,
  timezone              text        NOT NULL DEFAULT 'Asia/Kolkata',
  leaderboard_enabled   boolean     NOT NULL DEFAULT true,
  notifications_enabled boolean     NOT NULL DEFAULT true,
  default_award_mode    text        NOT NULL DEFAULT 'auto',
  approval_fallback     text        NOT NULL DEFAULT 'manager',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gamification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view gamification settings" ON public.gamification_settings;
CREATE POLICY "Authenticated can view gamification settings"
  ON public.gamification_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage gamification settings" ON public.gamification_settings;
CREATE POLICY "Admins manage gamification settings"
  ON public.gamification_settings FOR ALL TO authenticated
  USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

NOTIFY pgrst, 'reload schema';