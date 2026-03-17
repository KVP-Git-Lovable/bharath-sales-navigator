

## Plan: Add App Activity (Page Views & Sessions) to Auto-Checkout

### Current Issue
The `findLastActivityTime` function in the `auto-end-day` edge function only checks field activity (visits, orders, retailer_visit_logs) and a non-existent `gps_positions` table. It does **not** check `user_page_views` or `user_sessions` — so if a user's last action was browsing the app (clicking around pages), that time is ignored.

### Changes

#### File: `supabase/functions/auto-end-day/index.ts`

Update the `findLastActivityTime` function to:

1. **Add `user_page_views`** — query the latest `visited_at` for the user on the given date. This captures the last page/click the user made in the app.

2. **Add `user_sessions`** — query the latest `logout_at` or `updated_at` for sessions created on that date. This captures when the user's session ended.

3. **Remove broken `gps_positions` query** — this table doesn't exist and silently fails.

After these changes, the function will pick the **latest** timestamp across all sources: visits, orders, retailer_visit_logs, page views, and sessions — ensuring the auto-checkout time reflects the user's absolute last interaction with the application.

### Files to Modify
- `supabase/functions/auto-end-day/index.ts` — update `findLastActivityTime` function (lines 252-324)

