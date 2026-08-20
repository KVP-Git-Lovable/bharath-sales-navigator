# "ADDUKU FREE approved in meeting" scheme — what the data shows, and closing the audit gap

## What I found (verified by querying the database)

One matching row in `product_schemes`:

- Name: `ADDUKU FREE approved in meeting`
- Description: `ADDUKU FREE`
- ID: `25321b13-391b-44fa-9a3f-c8b06d942f06`
- Type: `percentage_discount`, 50% off, applies to 44 target products
- Source: `manual` (not AI-generated)
- Created: 2026-08-12 07:24:03 UTC (12:54 PM IST)
- Start date: 2026-08-12, no end date
- Last updated: 2026-08-20 05:13:55 UTC (10:43 AM IST)
- Current state: `is_active = false` (it is switched OFF right now)

## Why "who created it" cannot be answered today

The `product_schemes` table has no `created_by` or `updated_by` column, and the only trigger on it is the generic `updated_at` timestamp trigger. There is no scheme audit log table. So the database physically does not store which user inserted or toggled this row — the timestamps above are all the evidence that exists.

Related checks I ran, all negative:
- No matching row in `ai_scheme_suggestions` (so it was not created by the AI scheme suggestion flow — `source` is `manual`, meaning it came from the Scheme Master UI).
- No cron/automation trigger on the table.
- `user_page_views.page_path` is stored as NULL, and `module_usage_logs` only records coarse modules (Dashboard, Visit, Orders...) with no "Scheme Master" entries, so activity logs cannot pin the actor either.

On "activated without any manual user": there is no automated process that creates or activates schemes. `source = 'manual'` plus the absence of any AI suggestion record indicates a signed-in admin created it through Scheme Master on 12 Aug and someone toggled it on 20 Aug — we just have no stored identity for either action.

## Proposed fix: make schemes fully auditable

1. Add `created_by uuid` and `updated_by uuid` to `product_schemes`, auto-populated from `auth.uid()` by a trigger on INSERT/UPDATE.
2. Add a `product_scheme_audit_log` table capturing: scheme id, action (created / updated / activated / deactivated / deleted), changed fields (old → new), actor user id, and timestamp — written by an AFTER INSERT/UPDATE/DELETE trigger, with GRANTs and admin-read RLS.
3. Surface the history in the Scheme Master UI: an "Activity" panel on each scheme showing who created it, who last changed it, and every activate/deactivate toggle with name and timestamp.

Existing rows (including this one) will show `created_by` as unknown — history starts from the migration date forward.

## Technical notes

- Migration: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `CREATE OR REPLACE FUNCTION` — fully idempotent, no data changes to existing schemes.
- Audit reads restricted to admins via `public.is_system_admin(auth.uid())`.
- No change to how schemes are calculated or applied to orders.
