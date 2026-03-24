

# Fix Mass Edit Beats: DB-First Beat Fetching

## Problem
The `MassEditBeatsModal` derives beat options from cached retailer records in IndexedDB, bypassing RLS, risking stale/cross-user data, and using the wrong source of truth.

## Solution
Fetch beats directly from the `beats` table (with RLS enforced), using cache only as offline fallback.

## Changes

### 1. Refactor `loadBeats` in `MassEditBeatsModal.tsx`

Replace the current cache-first logic (lines 44-96) with:

- **Online**: Query `supabase.from('beats').select('id, beat_id, beat_name').eq('owner_id', user.id).eq('is_active', true).order('beat_name')`
- **Offline fallback**: Fall back to `offlineStorage.getAll(STORES.BEATS)` (already cached by `useMasterDataCache.ts` during sync)
- Remove the retailer-derived beat extraction entirely
- Remove the `beats` prop dependency for building the dropdown (props can still supplement if needed)

### 2. Verify RLS on `beats` table

Check existing RLS policies on `beats`. If no policy restricts SELECT to `owner_id = auth.uid()`, add one via migration:

```sql
CREATE POLICY "Users can select their own beats"
ON beats FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR created_by = auth.uid()::text);
```

### 3. Update beat value mapping

The `beats` table uses `id` (UUID) as primary key and `beat_id` (string code). Ensure the dropdown uses `beat_id` as the value (since retailers store `beat_id`, not `id`), matching the existing `handleMassEdit` logic that writes `beat_id` to the retailers table.

## Files Modified
- `src/components/MassEditBeatsModal.tsx` — refactor `loadBeats` useEffect
- Possible migration — RLS policy on `beats` table if missing

