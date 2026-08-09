-- 3,386 of 7,597 point rows (all earned before ~May 2026) have NULL action_id
-- and NULL game_id: they predate the client version that started recording the
-- link. Balances are unaffected — gam_user_balance sums by status/expiry only.
--
-- But gam_refresh_leaderboard INNER JOINs gamification_actions on action_id, so
-- once the engine is live those points would silently disappear from the
-- leaderboard: 19 of 21 users would see a total 44% below their own balance,
-- looking as though their history had been deleted.
--
-- Fix: give that history a real home — a system "Legacy" game and action — and
-- point the orphans at it. Nothing is moved or deleted; only the two FK columns
-- are filled. Safe to run before the engine cutover: production has no
-- leaderboard function yet, so this changes nothing visible today.

DO $mig$
DECLARE v_game uuid; v_action uuid; v_first date; v_linked int;
BEGIN
  SELECT min(earned_at)::date INTO v_first
    FROM gamification_points WHERE action_id IS NULL;
  IF v_first IS NULL THEN
    RAISE NOTICE 'no unlinked points; nothing to do';
    RETURN;
  END IF;

  SELECT id INTO v_game FROM gamification_games WHERE name = 'Legacy (pre-engine)';
  IF v_game IS NULL THEN
    INSERT INTO gamification_games (name, description, start_date, end_date,
                                    is_active, is_all_territories, category)
    VALUES ('Legacy (pre-engine)',
            'Historical points earned before the gamification engine recorded an action link. Kept so past totals still appear on the leaderboard.',
            v_first, DATE '2026-05-31', false, true, 'orders')
    RETURNING id INTO v_game;
  END IF;

  SELECT id INTO v_action FROM gamification_actions
   WHERE game_id = v_game AND action_name = 'Legacy points';
  IF v_action IS NULL THEN
    INSERT INTO gamification_actions (game_id, action_type, action_name, points,
                                      is_enabled, leaderboard, is_system, description)
    VALUES (v_game, 'legacy', 'Legacy points', 0, true, true, true,
            'Placeholder for points awarded before action linkage existed. Awards nothing; exists so historical points join the leaderboard.')
    RETURNING id INTO v_action;
  END IF;

  UPDATE gamification_points
     SET action_id = v_action,
         game_id   = COALESCE(game_id, v_game)
   WHERE action_id IS NULL;
  GET DIAGNOSTICS v_linked = ROW_COUNT;

  RAISE NOTICE 'linked % legacy point rows to game % / action %', v_linked, v_game, v_action;
END $mig$;