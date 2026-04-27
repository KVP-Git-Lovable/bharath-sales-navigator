# Fix Gamification Points Display (Leaderboard + My Visits)

Two distinct problems were verified by inspecting the code and the live DB.

---

## Problem 1 — Leaderboard / Gamification section: points don't match for all users

### What's broken

`src/pages/Leaderboard.tsx` mixes two different "totals" and exposes the wrong one in places:

- **`fetchMyPoints()`** (line 210) — fetches the user's points **without any time filter** and bins them into `today / week / month / quarter / year / total`. So `myPoints.total` is correct (lifetime), but the per-period buckets are recomputed on every render based on the user's local clock.
- **`fetchLeaderboardData()`** (line 93) — fetches **everyone's** points filtered by `startDate` only (no `endDate`). For `timeFilter="yesterday"`, this is wrong: it includes today's points too, so a rep who is leading the leaderboard "Yesterday" actually shows points earned today.
- **`fetchPointsBreakdown()`** (line 323) — only filters by `startDate`, same bug as above.
- **My Points card** (line 519) shows `getDisplayPoints()` (period bucket from `fetchMyPoints`) but rank under it is computed from `leaderboard` which uses a different, broken date range. So your card can show 120 pts while the rank list shows you with 0 — the values come from two different queries.
- **`profiles` lookup** uses `.in("id", userIds)` with no chunking. Confirmed in the DB there are 15 distinct users — fine today, but the bigger issue is users who have points but **no row in `profiles`** (or whose profile row is filtered out by RLS for the viewer) become "Unknown User" and still show in the leaderboard. Verified the DB: every points row has a real `user_id`, so missing names = profiles RLS / missing profile, not missing data.

### Fix

In `src/pages/Leaderboard.tsx`:
1. Make `fetchLeaderboardData()` and `fetchPointsBreakdown()` use **both** `startDate` and `endDate` from `getDateRange()` (the same range the modal already uses correctly).
2. Make `fetchMyPoints()` reuse `getDateRange()` so the "My Points" card and the leaderboard are guaranteed to be on the same window. Keep `myPoints.total` as a separate lifetime query.
3. After fetching profiles, drop any `userPointsMap` entry whose profile didn't come back (or label it once as "Unknown User" but log a warning) — prevents ghost rows.
4. Ensure the rank shown under "My Points" comes from the **same** filtered leaderboard array, so card and list always agree.

No DB / RLS changes needed — the existing `Authenticated users can view all gamification points` policy already allows the leaderboard to see everyone.

---

## Problem 2 — My Visits: points should show which game they came from, per visit

### What exists today

- `MyVisits.tsx` shows one aggregate tile **"Points Earned"** for the day (line 1448). Clicking it opens `PointsDetailsModal` which already lists game name + retailer + points correctly.
- Each individual visit card (`VisitCard.tsx`) shows **no points and no game name** at all.
- A `VisitPointsDisplay` component exists (`src/components/VisitPointsDisplay.tsx`) but is unused, and even if used it only shows a total "+N pts" badge with no game attribution.

### Fix

1. **Extend `useVisitsDataOptimized`'s `fetchPointsForDate`** to also return per-retailer breakdown by game:
   - Join `gamification_points` → `gamification_games(name)` and `gamification_actions(action_name)` in the same fetch.
   - Group per `metadata.retailer_id` into `{ totalPoints, entries: [{ gameName, actionName, points }] }`.
2. **Replace `VisitPointsDisplay`** with a new compact component (or rewrite the existing one) that, given a `retailerId`, renders the chip in two modes:
   - Collapsed: `+3.75 pts` amber badge.
   - Tap / hover: small popover listing each game name + points (e.g. `Productive Visit Game — +0.75`, `Daily Target Game — +3.00`).
   - Source data comes from the new per-retailer map already in `useVisitsDataOptimized`, so no extra DB call per card.
3. **Render the badge inside `VisitCard.tsx`** in the visit header row, only when `status === 'productive'` and points exist for that retailer/date.
4. **Update `PointsDetailsModal`** "Game Name" column — it already pulls `gamification_games.name`, but verify it shows the **game's `name`**, not the action name (currently `game_name: item.gamification_games?.name`, which is correct — keep as is).

### Files touched

- `src/hooks/useVisitsDataOptimized.ts` — extend `fetchPointsForDate` shape (add per-retailer game breakdown). Update the cache snapshot serialization to include the new field.
- `src/components/VisitPointsDisplay.tsx` — rewrite to accept the new breakdown and render popover.
- `src/components/VisitCard.tsx` — render `<VisitPointsDisplay>` next to the status badge for productive visits.
- `src/pages/MyVisits.tsx` — pass the new per-retailer breakdown down to `VirtualizedVisitList` / `VisitCard` (likely via existing `pointsData` prop chain).
- `src/pages/Leaderboard.tsx` — fix the three queries described above.

No database migrations, no RLS changes, no edge function changes.

### What stays untouched

- Points award logic (`gamificationPointsAwarder.ts`).
- `PointsDetailsModal` query / layout (already correct).
- All ordering, visit-status, attendance, and offline-sync code.
- The 44 historical empty orders and the visit backfill from the previous task.

---

## Result

- Leaderboard "My Points", rank, and "Activity Performance" all use the same date window — values agree across cards for every user and every time filter.
- Each productive visit card in My Visits shows its earned points and, on tap, a clean breakdown of which game(s) awarded them — no extra queries per card.
