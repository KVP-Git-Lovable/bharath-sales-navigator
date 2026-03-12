

# GPS-Based TA Calculation — Auto-calculate from actual kilometers traveled

## Overview
Add a third TA calculation method: **"From GPS Tracking"** — TA is auto-calculated from actual GPS kilometers traveled during the day, using the per-km rate. This replaces reliance on beat's `average_km` with real distance from `gps_tracking` data.

## Database Changes

### 1. Add `ta_type = 'from_gps'` option
Update `expense_master_config.ta_type`, `user_expense_config.ta_type`, `team_expense_config.ta_type`, and `expense_groups.ta_type` to accept `'from_gps'` as a valid value (these are text columns, no enum constraint — no migration needed).

### 2. New table: `daily_gps_distance`
Cache the computed daily GPS distance so it doesn't need recalculating from raw points every time.

```sql
CREATE TABLE public.daily_gps_distance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_km NUMERIC NOT NULL DEFAULT 0,
  point_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
-- RLS: users see own, managers see subordinates, admins see all
```

### 3. Edge function: `calculate-gps-distance`
Fetches `gps_tracking` points for a user+date, computes total distance using the Haversine formula between consecutive points, and upserts into `daily_gps_distance`. Called:
- Periodically during the day (when user views expenses)
- At end of day (auto-stop triggers it)

## Code Changes

### `src/hooks/useResolvedExpenseConfig.ts`
- Add `'from_gps'` to the `ta_type` union type in `ResolvedExpenseConfig`

### `src/hooks/useGPSDistance.ts` (new)
- Hook that fetches/calculates GPS distance for a user on a given date
- Uses Haversine formula on GPS tracking points to sum straight-line distances between consecutive points
- Caches result in `daily_gps_distance` table
- Returns `{ totalKm, isLoading }`

### `src/hooks/useMonthlyExpenseSummary.ts`
- When `ta_type === 'from_gps'`, fetch `daily_gps_distance` for the user+month
- Calculate daily TA as `gps_km * ta_per_km_rate` instead of using beat distance

### `src/components/BeatAllowanceManagement.tsx`
- When `ta_type === 'from_gps'`, show GPS KM and calculated TA per day
- Display "GPS KM" column showing actual distance traveled
- TA amount = `gps_km * ta_per_km_rate`, auto-updating

### `src/components/expenses/ExpensePolicyConfig.tsx`
- Add third option in TA Calculation Method dropdown: `"From GPS Tracking"` (`from_gps`)
- When selected, show info message explaining auto-calculation from GPS + per-km rate input
- Same distribution/override/group support as other methods

### `src/components/expenses/TeamExpenseSummary.tsx` & `ProductivityTracking.tsx`
- Add `from_gps` handling parallel to `from_beat`

### `src/components/expenses/DailyBreakdown.tsx`
- When GPS-based, show KM traveled alongside TA amount

## Distance Calculation Logic (Haversine)
```typescript
function haversineDistance(lat1, lon1, lat2, lon2): number {
  // Returns distance in KM between two GPS points
}

function totalGPSDistance(positions: GPSPosition[]): number {
  let total = 0;
  for (let i = 1; i < positions.length; i++) {
    total += haversineDistance(
      positions[i-1].latitude, positions[i-1].longitude,
      positions[i].latitude, positions[i].longitude
    );
  }
  return total;
}
```

## Files to Create/Edit
1. **Migration SQL** — create `daily_gps_distance` table with RLS
2. **`src/hooks/useGPSDistance.ts`** (new) — GPS distance calculation + caching hook
3. **`src/hooks/useResolvedExpenseConfig.ts`** — add `'from_gps'` to type
4. **`src/hooks/useMonthlyExpenseSummary.ts`** — handle `from_gps` TA calculation
5. **`src/components/BeatAllowanceManagement.tsx`** — show GPS KM + auto TA
6. **`src/components/expenses/ExpensePolicyConfig.tsx`** — add "From GPS Tracking" option
7. **`src/components/expenses/TeamExpenseSummary.tsx`** — handle `from_gps`
8. **`src/components/ProductivityTracking.tsx`** — handle `from_gps`

## How It Works End-to-End
1. Admin sets TA type to "From GPS Tracking" with per-km rate (e.g., ₹8/km)
2. User's GPS tracks throughout the day (existing feature)
3. When user views expenses, system calculates total GPS KM from tracking points
4. TA = total_km × per_km_rate (e.g., 45 km × ₹8 = ₹360)
5. Value updates as more GPS points are recorded during the day
6. Additional travel expenses beyond TA go through the existing Additional Expenses section with proof

