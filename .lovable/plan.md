

## Auto-Checkout at 10 PM IST — Implementation Plan

### What's Being Done
Configure the existing `auto-end-day` edge function to run automatically at 10:00 PM IST (16:30 UTC) every day using `pg_cron`.

### Changes

**1. File Edit: `supabase/functions/auto-end-day/index.ts`**
- Line 11: Change comment from `Runs at 11:59 PM IST (18:29 UTC) daily via cron job` to `Runs at 10:00 PM IST (16:30 UTC) daily via pg_cron job`
- No logic changes needed — the function already handles everything correctly.

**2. SQL (via Supabase SQL Editor — not migration, contains project-specific secrets)**

First, enable required extensions:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
```
(`pg_cron` is already enabled by default on Supabase.)

Then schedule the cron job:
```sql
SELECT cron.schedule(
  'auto-end-day-10pm',
  '30 16 * * *',
  $$
  SELECT net.http_post(
    url:='https://aoxdosjkwqyuvccuwhzc.supabase.co/functions/v1/auto-end-day',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveGRvc2prd3F5dXZjY3V3aHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5ODUyOTYsImV4cCI6MjA4MjU2MTI5Nn0.KcKh1kvHtMJ0dUfgZeSwUK64vUDJZzgoXUSOzEVF5R0"}'::jsonb,
    body:='{"time": "scheduled-10pm"}'::jsonb
  ) AS request_id;
  $$
);
```

### File Summary

| File | Action |
|------|--------|
| `supabase/functions/auto-end-day/index.ts` | **Edit** — update timing comment only |
| Supabase SQL Editor | **Run** — enable `pg_net`, schedule cron job |

