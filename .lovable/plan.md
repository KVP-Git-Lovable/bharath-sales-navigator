

# Fix: Leaderboard "All Team" Showing Only Own Data

## Root Cause

The issue is **not in the frontend code** -- it's in the **Row Level Security (RLS) policies** on the `gamification_points` table.

Current SELECT policies:
- "Users can view their own points" -- restricts to `auth.uid() = user_id`
- "Admins can view all points" -- only for admin role users

When Harshith (a manager, not an admin) selects "All Team", the frontend correctly removes the user ID filter from the query. However, the database RLS policy still only returns his own rows because he's not an admin. So the query silently returns only his data.

## Solution

Add a new RLS policy that allows **managers to view gamification points for their subordinates** (using the existing `get_subordinate_users` function), and also allow viewing all points when "All Team" is selected by any authenticated user.

Since the leaderboard is meant to be a motivational/competitive feature visible to everyone on the team, the simplest and most appropriate fix is to **allow all authenticated users to read all gamification points**.

### Database Change

Add a new RLS SELECT policy on `gamification_points` that grants all authenticated users read access:

```sql
CREATE POLICY "All authenticated users can view points"
  ON gamification_points FOR SELECT
  TO authenticated
  USING (true);
```

And remove the now-redundant restrictive policies:
- Drop "Users can view their own points"
- Drop "Admins can view all points"

(The test policy `testuser_select_gamification_points` with `USING(true)` may already partially do this, but it may be scoped to a specific role. We'll clean it up.)

### No Frontend Changes Needed

The component code already handles both scopes correctly:
- **My Scope**: filters by `selectedUserIds` (line 63-64)
- **All Team**: removes the filter, fetching all rows (which RLS currently blocks)

Once the RLS policy is updated, the existing code will work as intended.

## Technical Details

| Item | Detail |
|------|--------|
| Table | `gamification_points` |
| Change | Update RLS SELECT policy to allow all authenticated users |
| Risk | Low -- gamification points are non-sensitive ranking data |
| Files changed | None (database migration only) |

