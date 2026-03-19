

## Plan: Create Standalone SQL Script for Target Project

Since you'll use `git pull` to move code files, you only need a SQL script to run on the target project's Supabase SQL Editor to set up the database.

### What the script will include

The complete contents of the migration file — creating the `auto_end_day_policy` table, RLS policies, seed data, and the `AUTO_DAY_WARNING` notification event type. It's a single copy-paste script.

### Steps

1. **Generate the SQL script** — Copy the migration SQL into a standalone file at `/mnt/documents/auto_end_day_setup.sql` so you can download it
2. **Usage** — Open the target project's Supabase SQL Editor, paste and run the script

### What you get after `git pull` + running the script

| Layer | How it transfers |
|-------|-----------------|
| Edge function (`auto-end-day`) | Via git pull ✅ |
| UI components & hooks | Via git pull ✅ |
| `auto_end_day_policy` table + seed | Run SQL script ✅ |
| `AUTO_DAY_WARNING` event type | Run SQL script ✅ |
| Cron job schedule | Must set up separately per project |

The script uses `IF NOT EXISTS` / `ON CONFLICT` guards so it's safe to run even if parts already exist.

