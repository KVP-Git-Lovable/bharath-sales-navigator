-- Restore the columns that were dropped from gamification_points
-- (points, game_id, action_id). All reads/inserts in the app code expect them.
ALTER TABLE public.gamification_points
  ADD COLUMN IF NOT EXISTS points NUMERIC,
  ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES public.gamification_games(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS action_id UUID REFERENCES public.gamification_actions(id);

CREATE INDEX IF NOT EXISTS idx_gp_user_earned
  ON public.gamification_points (user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_gp_action ON public.gamification_points (action_id);
CREATE INDEX IF NOT EXISTS idx_gp_game   ON public.gamification_points (game_id);

-- Backfill: existing rows have no points value. Set a conservative 1-point value
-- so historical activity is reflected on the leaderboard without inflating ranks.
UPDATE public.gamification_points SET points = 1 WHERE points IS NULL;