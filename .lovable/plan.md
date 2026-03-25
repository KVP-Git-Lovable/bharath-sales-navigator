

# Fix: Mass Edit Beats Showing Beats Not Owned by Current User

## Problem
The "Mass Edit Beats" modal shows all active beats in the system instead of only the current user's beats. The query filters by `is_active` but does not filter by `owner_id`.

## Root Cause
In `src/components/MassEditBeatsModal.tsx` (line 54-58), the query is:
```ts
supabase.from('beats').select('beat_id, beat_name').eq('is_active', true)
```
Missing: `.eq('owner_id', user.id)`

## Plan

### File: `src/components/MassEditBeatsModal.tsx` (line 54-58)

Add `owner_id` filter to the beats query:
```ts
const { data, error } = await supabase
  .from('beats')
  .select('beat_id, beat_name')
  .eq('owner_id', user.id)
  .eq('is_active', true)
  .order('beat_name');
```

This single-line addition ensures only the logged-in user's beats appear in the dropdown, matching what the "My Beats" page shows (5 beats).

No other file changes needed.

