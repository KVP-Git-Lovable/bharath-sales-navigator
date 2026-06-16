## Root cause (confirmed live)

The published quickapp.ai forms DO reach Supabase. Insert is allowed by the `anon` policy, but the client uses `.insert(payload).select('id').single()`. That tells PostgREST to return the inserted row, which requires SELECT access. The `website_leads` / `roi_calculator_entries` SELECT policies are admin-only (`is_system_admin(auth.uid())`), so for an anonymous visitor PostgREST refuses to return the row and surfaces it as `42501 new row violates row-level security policy` — making it look like the INSERT failed when it was actually the read-back that failed.

Verified with a direct anon REST call:
- POST without `Prefer: return=representation` → `201 Created`
- POST with `Prefer: return=representation` (what `.select().single()` produces) → `401 / 42501`

So nothing is wrong with grants or RLS. The fix lives entirely in the client helper.

## Fix

Update `src/lib/websiteLeads.ts` so anonymous inserts no longer ask PostgREST to return the row:

1. `insertWebsiteLead`
   - Generate `const id = crypto.randomUUID()` and include it in the insert payload.
   - Call `supabase.from('website_leads').insert(payload)` (no `.select()`, no `.single()`).
   - Return `{ data: { id }, error }` so existing call sites keep working.

2. `insertRoiEntry`
   - Same treatment: generate `id` client-side, include in payload, plain `.insert()`.
   - Return `{ data: { id }, error }` so `ROICalculator.tsx` can still stash `roi_entry_id` in the callback request's metadata.

No UI, RLS, grant, or schema changes are needed. No migration. Existing call sites in `ContactPage.tsx`, `DemoRequestPage.tsx`, and `ROICalculator.tsx` continue to work because the helpers' return shape is preserved.

## Verification

1. After deploy + publish, submit the contact form on https://quickapp.ai/contact.
2. Run `SELECT id, lead_type, full_name, created_at FROM website_leads ORDER BY created_at DESC LIMIT 5;` — the diagnostic submission should appear.
3. Repeat for /request-demo and the ROI calculator (questionnaire auto-capture + "Talk to a QuickApp Expert").

## Out of scope

- No changes to grants, RLS, or table definitions.
- No UI / validation / toast changes.
- Admin viewer remains as-is.
