
# Plan: Display Target vs Actual for All Users in Dashboard

## Problem Summary
The Target Management Dashboard currently shows only one user's data by default (the logged-in user). Admins need the ability to view Target vs Actual performance for **all users** in the organization.

## Root Cause
- The `TeamTargetDashboard` component receives `effectiveUserIds` from the parent page
- The parent page (`TargetVsActual.tsx`) defaults to `userScope='single'` with `selectedUserId='self'`
- The fallback is `subordinateIds` from `useSubordinates()`, which only includes direct/indirect reports
- There is no "All Users" option for admins to see the entire organization

## Solution Overview

### Step 1: Update TeamTargetDashboard Component
**File:** `src/components/admin/TeamTargetDashboard.tsx`

Add a new "All Users" scope option for admin users:
- Add a user scope filter dropdown with options: "My Team" and "All Users" (admin only)
- Fetch all profile IDs using the existing `get_limited_profiles_for_admin` RPC when "All Users" is selected
- Update the display to show organization-wide data when this option is chosen

### Step 2: Create useAllUserIds Hook
**File:** `src/hooks/useAllUserIds.ts` (new file)

Create a reusable hook that:
- Calls `get_limited_profiles_for_admin` RPC to get all user profiles
- Extracts and returns an array of all user IDs
- Only enables the query when the user has admin access
- Caches results appropriately

### Step 3: Update TargetVsActual Page
**File:** `src/pages/admin/TargetVsActual.tsx`

- Add an "All Users" option to the `UserScope` type
- Update `effectiveUserIds` calculation to support the "all" scope
- Pass admin access status to TeamTargetDashboard for conditional rendering

## Implementation Details

### New Hook: useAllUserIds
```typescript
// Returns all user IDs in the organization for admins
export const useAllUserIds = () => {
  const { hasAdminAccess } = useAdminAccess();
  
  return useQuery({
    queryKey: ['all-user-ids-for-targets'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_limited_profiles_for_admin');
      if (error) throw error;
      return (data || []).map(p => p.id);
    },
    enabled: hasAdminAccess,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
```

### TeamTargetDashboard Changes
- Add "User Scope" filter with "My Team" and "All Users" options
- Conditionally show "All Users" only for admin users
- When "All Users" is selected, use all user IDs from the new hook
- Update the summary statistics header to reflect the selected scope

### UI Changes
- Add a scope selector in the Filters card
- Show "All Users" option only for admins (checked via `useAdminAccess`)
- Default to "My Team" for managers, show "All Users" for pure admins

## Files to Create/Modify
| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useAllUserIds.ts` | Create | New hook to fetch all user IDs for admins |
| `src/components/admin/TeamTargetDashboard.tsx` | Modify | Add scope selector and "All Users" support |
| `src/pages/admin/TargetVsActual.tsx` | Modify | Add "all" to UserScope type and update effectiveUserIds logic |

## Technical Notes
- Uses existing `get_limited_profiles_for_admin` RPC which is already secured for admin-only access
- No database migrations required
- Maintains backward compatibility with existing subordinate-based filtering
- Performance consideration: For large organizations, the query fetches all profiles but only extracts IDs

## Expected Outcome
After implementation:
1. Admins will see a "User Scope" filter in the Dashboard tab
2. Selecting "All Users" will display Target vs Actual for every user in the organization
3. The summary cards will show totals across all selected users
4. The table will list every user with their respective targets, actuals, and achievement percentages
