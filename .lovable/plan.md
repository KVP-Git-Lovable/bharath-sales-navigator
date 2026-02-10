

## Fix: Green dot indicators not showing for selected subordinate's data

### Problem
When a manager selects a subordinate (e.g., "Sagar") in the My Visits page, the beat plan details load correctly, but the green dot indicators on the weekly date selector still show the **logged-in user's** planned dates instead of the selected user's planned dates.

### Root Cause
In `src/pages/MyVisits.tsx` (line 430), the `loadWeekPlans` query that fetches planned dates for the green dots is hardcoded to `user.id` (the logged-in manager's ID):

```
.eq('user_id', user.id)
```

It should use the **selected user's ID** when viewing a subordinate's data.

### Fix

**File: `src/pages/MyVisits.tsx`**

1. Update the `loadWeekPlans` effect (around line 419-441) to use the effective user ID based on selection:
   - When `isViewingSelf` is true, use `user.id`
   - When viewing a subordinate, use `selectedUserIds[0]`
2. Add `selectedUserIds` and `isViewingSelf` to the effect's dependency array so it re-runs when the user selection changes

The query change is a single line:
```
// Before:
.eq('user_id', user.id)

// After:
.eq('user_id', isViewingSelf ? user.id : selectedUserIds[0])
```

And the dependency array updates from `[user, weekDays]` to `[user, weekDays, isViewingSelf, selectedUserIds]`.

This ensures the green dots reflect the selected user's beat plan schedule, not just the logged-in user's.
