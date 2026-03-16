

# Plan: Fix Beat ID Showing Instead of Beat Name

## Problem
The BeatDetail page shows the raw `beat_id` code (e.g., `beat_1770806648518_sop441izi`) as the title instead of the human-readable beat name (e.g., "Nagasaki"). The DB has the correct `beat_name`, but the query fails silently.

## Root Cause
In `src/pages/BeatDetail.tsx` line 130, the query `or(\`id.eq.${id},beat_id.eq.${id}\`)` tries to match the URL parameter against both the `id` (UUID) column and `beat_id` (text) column. When the URL contains a non-UUID string like `beat_1770806648518_sop441izi`, PostgreSQL throws an error on `id.eq.beat_1770806648518_sop441izi` because `id` is a UUID column. This error causes the entire query to return null, making the page fall back to displaying the raw `beat_id` code as the title.

## Fix

### Modify `src/pages/BeatDetail.tsx` (~lines 126-131)
Change the beat fetch logic to detect whether the URL `id` is a UUID format or a beat_id code, and query accordingly:

```typescript
// Detect if id is a UUID
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

let query = supabase.from('beats').select('*');
if (isUUID) {
  query = query.or(`id.eq.${id},beat_id.eq.${id}`);
} else {
  query = query.eq('beat_id', id);
}
const { data: beat, error: beatError } = await query.maybeSingle();
```

This prevents the UUID type mismatch error and ensures the beat record is found correctly, so `beat.beat_name` ("Nagasaki") is used for the title instead of the fallback `beat_id` code.

### Files to Modify
- **`src/pages/BeatDetail.tsx`** — Fix the beat query logic (~lines 126-131)

