

# Fix: Total Visits Points Not Being Awarded

## Problem Identified

The user MANVITH had **54 completed visits** on December 17, 2025 (15 productive + 39 unproductive), which exceeds the **50 visit threshold** for the "Total Visits" gamification activity. However, the 20 points for this achievement were never awarded.

**Root Causes:**

1. **Missing Backend Logic**: The `gamificationPointsAwarder.ts` file does NOT contain any code to handle the `total_visits` action type. While the activity is configured in the admin UI, no code actually awards points when the threshold is met.

2. **Game Creation Date Issue**: The "Total Visits" game was created on January 28, 2026 with a start date of January 21, 2026. December 17, 2025 falls before this date, so even if the logic existed, it wouldn't have applied.

3. **No Trigger Point**: Unlike productive visits (triggered on order/checkout), there's no event that checks "did this user just hit 50 total visits today?"

## Solution

Add a new function `awardPointsForTotalVisits` to the gamification points awarder that:
1. Counts all completed visits (productive + unproductive) for the user on a given day
2. Checks if the count meets or exceeds the configured threshold (default: 50)
3. Awards points once per day when threshold is reached
4. Gets triggered whenever a visit is completed (both productive and unproductive)

## Implementation Plan

### Step 1: Add `awardPointsForTotalVisits` Function

Create a new exported function in `src/utils/gamificationPointsAwarder.ts`:

```typescript
export async function awardPointsForTotalVisits(userId: string, visitDate: string) {
  // 1. Get total completed visits (productive + unproductive) for the day
  // 2. Find active "total_visits" actions
  // 3. Check if threshold met (from metadata.daily_visit_target or default 50)
  // 4. Check if already awarded today
  // 5. Award points if conditions met
}
```

### Step 2: Integrate Trigger Points

Call the new function from `VisitCard.tsx` in two places:
1. When a visit is marked as productive (after order)
2. When a visit is marked as unproductive (no order)

This ensures points are checked whenever any visit is completed.

### Step 3: Handle Historical Data (Optional)

For December 17, 2025 specifically, since the game didn't exist then, the points cannot be retroactively awarded through the normal system. However, an admin could manually insert the points if needed.

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/gamificationPointsAwarder.ts` | Add new `awardPointsForTotalVisits` function |
| `src/components/VisitCard.tsx` | Call `awardPointsForTotalVisits` on visit completion |

## Technical Details

### New Function: `awardPointsForTotalVisits`

```typescript
export async function awardPointsForTotalVisits(userId: string, visitDate: string) {
  const today = new Date(visitDate);
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const todayDateOnly = visitDate;

  // Count completed visits for the day
  const { count: completedVisits } = await supabase
    .from("visits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("planned_date", todayDateOnly)
    .in("status", ["productive", "unproductive"]);

  if (!completedVisits) return;

  // Fetch user's territories
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("territories_covered, work_location")
    .eq("id", userId)
    .single();

  const userTerritories = userProfile?.territories_covered || [];
  const userLocation = userProfile?.work_location;

  // Fetch active games
  const { data: activeGames } = await supabase
    .from("gamification_games")
    .select("*")
    .eq("is_active", true)
    .lte("start_date", todayDateOnly)
    .gte("end_date", todayDateOnly);

  if (!activeGames || activeGames.length === 0) return;

  // Filter games applicable to user's territory
  const applicableGames = activeGames.filter((game: any) => 
    game.is_all_territories || 
    (game.territories && game.territories.some((t: string) => 
      userTerritories.includes(t) || t === userLocation
    ))
  );

  // Fetch total_visits actions
  const gameIds = applicableGames.map(g => g.id);
  const { data: actions } = await supabase
    .from("gamification_actions")
    .select("*")
    .in("game_id", gameIds)
    .eq("is_enabled", true)
    .eq("action_type", "total_visits");

  if (!actions || actions.length === 0) return;

  for (const action of actions) {
    const game = applicableGames.find(g => g.id === action.game_id);
    if (!game) continue;

    // Get threshold from metadata (default: 50)
    const threshold = action.metadata?.daily_visit_target || 50;

    // Check if threshold met
    if (completedVisits >= threshold) {
      // Check if already awarded today
      const { count: alreadyAwarded } = await supabase
        .from("gamification_points")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action_id", action.id)
        .eq("game_id", game.id)
        .gte("earned_at", todayStart.toISOString())
        .lte("earned_at", todayEnd.toISOString());

      if (alreadyAwarded === 0) {
        await supabase.from("gamification_points").insert({
          user_id: userId,
          game_id: game.id,
          action_id: action.id,
          points: action.points,
          reference_type: "total_visits",
          reference_id: todayDateOnly,
          metadata: { 
            completed_visits: completedVisits,
            threshold: threshold,
            visit_date: todayDateOnly
          },
        });
        console.log(`Awarded ${action.points} points for total visits (${completedVisits}/${threshold})`);
      }
    }
  }
}
```

### Trigger Integration in VisitCard.tsx

Add call after visit completion:
```typescript
// After marking visit as productive or unproductive
const { awardPointsForTotalVisits } = await import('@/utils/gamificationPointsAwarder');
await awardPointsForTotalVisits(userId, plannedDate);
```

## Important Notes

1. **All-or-nothing**: Points are only awarded when threshold is met (no partial points)
2. **Once per day**: Duplicate award prevention is built in
3. **Counts both productive AND unproductive**: Any completed visit counts
4. **Threshold configurable**: Uses `metadata.daily_visit_target` from the action config
5. **Historical limitation**: Cannot retroactively award for dates before the game existed

## Testing Checklist

- Create a Total Visits activity with 50 visit threshold
- Complete visits until reaching 50
- Verify 20 points are awarded
- Verify points only awarded once per day
- Verify Points Earned KPI updates correctly

