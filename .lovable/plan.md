## Root cause

The `public.gamification_points` table is **missing the `points`, `game_id`, and `action_id` columns**.

Current live schema:
```text
id, user_id, reference_type, reference_id, earned_at, metadata
```

Original migration (`20251109112756`) created it with:
```text
id, game_id, user_id, action_id, points, reference_type, reference_id, earned_at, metadata
```

Those three columns were dropped at some point (no migration in the repo did it — likely a manual change in the Supabase dashboard).

### Effect

Every read in the app does something like:
```ts
supabase.from("gamification_points").select("user_id, points, earned_at")
```

PostgREST returns **400 / column does not exist**, so:
- `Leaderboard.tsx` → `toast.error("Failed to load leaderboard")`, list stays empty
- `LeaderboardSection.tsx` (Analytics)
- `usePeriodStats.ts`
- `useHomeDashboard.ts`
- `ProfilePointsBadge.tsx`
- `PointsDetailsModal.tsx`
- `useVisitsDataOptimized.ts`, `TodaySummary.tsx`, etc.

…all silently fail or return 0.

The awarder (`gamificationPointsAwarder.ts`) also tries to insert `game_id`, `action_id`, `points` — those inserts now also fail (the 3,386 historical rows in the table were written before the columns were dropped, with `metadata` only).

## Fix

### 1. Restore the missing columns on `gamification_points`

New migration that re-adds them as **nullable** (so it doesn't break the existing 3,386 rows):

```sql
ALTER TABLE public.gamification_points
  ADD COLUMN IF NOT EXISTS points NUMERIC,
  ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES public.gamification_games(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS action_id UUID REFERENCES public.gamification_actions(id);

CREATE INDEX IF NOT EXISTS idx_gp_user_earned
  ON public.gamification_points (user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_gp_action ON public.gamification_points (action_id);
CREATE INDEX IF NOT EXISTS idx_gp_game   ON public.gamification_points (game_id);
```

(Indexes restore lookup performance the original migration had.)

### 2. Backfill historical rows

The 3,386 existing rows have no `points` value and no `action_id`. Best-effort backfill so the leaderboard doesn't show zeros for active users:

- Most existing rows are `reference_type = 'order'` from the `awardPointsForOrder` flow. The only enabled action that fires per order today is the same single action_type used in those flows.
- Backfill plan:
  - Set `action_id` = the currently enabled "order"-type action (single match in `gamification_actions`).
  - Set `game_id` = that action's `game_id`.
  - Set `points` = that action's `points`.
- Rows with `reference_type = 'visit'` get the visit action equivalent.
- Rows we cannot map are left at `points = 0` (still visible in count, just zero contribution).

I will confirm the action mapping with a quick check before running the UPDATE; **if the mapping is ambiguous I will pause and ask** rather than guess.

### 3. No code changes needed

`gamificationPointsAwarder.ts` and all read sites are already written against the original (`points / game_id / action_id`) schema, so once the columns exist again everything starts working.

### 4. Verify

After migration + backfill:
- Run `SELECT user_id, sum(points) FROM gamification_points GROUP BY 1` — should return non-zero for active users.
- Reload the **Leaderboard** page → top performers populate.
- Reload **Analytics → Leaderboard** section → same data.
- New orders/visits → confirm `awardPointsForOrder` writes a row with `points`, `game_id`, `action_id` populated (check the latest row in the table after submitting an order).

## Files / surfaces

- New migration under `supabase/migrations/` (DDL + backfill UPDATE).
- No `.ts` / `.tsx` changes.
- No RLS changes (existing policies already permit "Authenticated users can view all gamification points").

## Out of scope (not changing)

- The leaderboard banner / scheduled announcement system.
- Notification rules.
- Any UI styling.
- The gamification actions/games master data.
