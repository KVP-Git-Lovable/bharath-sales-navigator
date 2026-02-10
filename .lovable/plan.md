

## Fix: GPS Track Day Tracking Not Showing Subordinate Data

### Problem
When a manager selects a team member in **GPS Track > Day Tracking**, the visit stats (Planned, Productive, etc.) load correctly, but the **GPS route/polyline on the map shows almost no data** (only 0.1 km). This is because the `gps_tracking` database table has a Row Level Security (RLS) policy that only allows users to see **their own** GPS data or admins to see all data. There is **no policy for managers to view subordinates' GPS tracking data**.

### Root Cause
The `gps_tracking` table has these SELECT policies:
- "Users can view their own GPS tracking" -- `auth.uid() = user_id`
- "Admins can view all GPS tracking" -- admin role check

**Missing**: A policy that allows managers to view their subordinates' GPS data.

Other tables (`visits`, `beat_plans`, `orders`, `retailers`) have broader policies allowing authenticated users to view data, which is why visit stats load fine but GPS routes do not.

### Solution

**Add a new RLS policy on `gps_tracking`** that allows managers to view their subordinates' GPS data using the existing `get_all_subordinates` database function.

### Technical Details

| Change | Details |
|--------|---------|
| **New RLS Policy** | Add SELECT policy on `gps_tracking` table: "Managers can view subordinates GPS tracking" |
| **Policy Logic** | Check if the `user_id` column value exists in the result of `get_all_subordinates(auth.uid())` |
| **No code changes needed** | The `GPSTrack.tsx` page already correctly passes the selected subordinate's user ID to all queries. The only blocker is the RLS policy. |

The new policy SQL:
```sql
CREATE POLICY "Managers can view subordinates GPS tracking"
  ON public.gps_tracking
  FOR SELECT
  USING (
    user_id IN (
      SELECT subordinate_user_id
      FROM get_all_subordinates(auth.uid())
    )
  );
```

This reuses the same `get_all_subordinates` RPC function already used by the `useSubordinates` hook throughout the app, ensuring consistent hierarchy-based access control.

