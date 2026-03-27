

## Root Cause

The `get_activity_logging_summary` database function references **wrong column names** that don't exist in the actual tables:

| Table | Function References | Actual Column |
|-------|-------------------|---------------|
| `user_page_views` | `page_path` | `page` |
| `user_page_views` | `viewed_at` | `created_at` |
| `user_data_usage` | `data_bytes` | `data_used_mb` |
| `user_data_usage` | `recorded_at` | `created_at` |

The error `column pv.page_path does not exist` (code 42703) confirms this — the function crashes before returning any data.

Additionally, the `user_sessions` table lacks `login_at`, `logout_at`, `is_active` columns that the `useActivityTracker` hook expects, but the function itself uses `attendance` for usage time, so the main fix is the column name mismatches.

## Fix

**Database migration** — Recreate the `get_activity_logging_summary` function with corrected column names:
- `pv.page_path` → `pv.page`
- `pv.viewed_at` → `pv.created_at`
- `du.data_bytes` → `(du.data_used_mb * 1024 * 1024)` (convert MB back to bytes for the frontend)
- `du.recorded_at` → `du.created_at`

No frontend changes needed — the component already handles the response format correctly.

