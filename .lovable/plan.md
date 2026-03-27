

## Root Cause

The `user_page_views` and `user_data_usage` tables are **completely empty** (0 rows). The database function was fixed to reference correct column names, but the **tracker hook** (`useActivityTracker.ts`) has been silently failing to insert data because it references columns that don't exist in the actual tables.

### Mismatches in `useActivityTracker.ts`

**`user_page_views` table** has columns: `id`, `user_id`, `page`, `created_at`

The hook tries to insert/query with non-existent columns:
- `session_id` — does not exist
- `page_path` — does not exist (actual: `page`)
- `module_name` — does not exist
- `duration_seconds` — does not exist
- `visited_at` — does not exist

**`user_data_usage` table** has columns: `id`, `user_id`, `data_used_mb`, `created_at`

The hook tries to insert with non-existent columns:
- `session_id` — does not exist
- `bytes_uploaded` — does not exist
- `bytes_downloaded` — does not exist

Since these inserts fail silently, no page view or data usage data is ever recorded, so the summary function returns `-` and `0` for those metrics.

## Fix

Two options — fix the **tables** to match the hook, or fix the **hook** to match the tables. Since the tables are empty and the hook has richer tracking logic, the cleanest approach is a combination:

### 1. Database migration — Add missing columns to both tables

**`user_page_views`**: Add `session_id` (nullable uuid), `module_name` (text), `duration_seconds` (integer). Rename is not needed — the hook will be updated to use `page` instead of `page_path`.

**`user_data_usage`**: Add `session_id` (nullable uuid), `bytes_uploaded` (bigint), `bytes_downloaded` (bigint).

### 2. Frontend fix — Update `useActivityTracker.ts`

- Change `page_path` → `page` in all insert/update/query calls
- Change `visited_at` → `created_at` in the order clause
- Convert bytes to MB when inserting into `data_used_mb`: `data_used_mb = (uploaded + downloaded) / (1024 * 1024)`
- Remove references to `bytes_uploaded` and `bytes_downloaded` (or use new columns if added)

### Recommended approach

Add the missing columns to the tables (migration) so the tracker can write richer data, AND fix the hook to use `page` instead of `page_path` and `created_at` instead of `visited_at`. This way both the tracker and the summary function work correctly.

### Technical details

**Migration SQL:**
```sql
ALTER TABLE user_page_views
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS module_name text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

ALTER TABLE user_data_usage
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS bytes_uploaded bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bytes_downloaded bigint DEFAULT 0;
```

**Hook changes** (`useActivityTracker.ts`):
- Line 124: `page_path` → `page`
- Line 126: `visited_at` → `created_at`
- Line 138: `page_path: path` → `page: path`
- Data usage insert: keep `bytes_uploaded`/`bytes_downloaded` (now columns exist) and also compute `data_used_mb`

**Summary function update**: Update `get_activity_logging_summary` to also use `module_name` column for most/least used (better than raw `page` paths), and use `bytes_uploaded + bytes_downloaded` for data usage instead of `data_used_mb` conversion.

