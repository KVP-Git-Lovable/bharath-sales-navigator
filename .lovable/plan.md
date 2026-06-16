## Goal

Persist all four public website form submissions into Supabase via two new tables, without changing any UI, validation, or UX.

## Database changes

### Table 1: `public.website_leads`

Columns:

- `id` uuid PK default `gen_random_uuid()`
- `created_at`, `updated_at` timestamptz default `now()`
- `lead_type` text NOT NULL — check constraint: `contact_request | demo_request | roi_callback_request`
- `lead_sub_type` text NULL
- `source_page` text (e.g. `/contact`, `/request-demo`, `/roi-calculator`)
- `form_origin` text (component identifier)
- `full_name` text NOT NULL
- `email` text NOT NULL
- `phone` text
- `company` text
- `job_title` text
- `team_size` text
- `industry` text
- `location` text
- `message` text
- `status` text NOT NULL default `new` (new | contacted | qualified | closed)
- `metadata` jsonb default `'{}'::jsonb` — stores demo `selected_solutions`, etc.
- `utm_source`, `utm_medium`, `utm_campaign`, `referrer` text

Indexes: `lead_type`, `created_at desc`, `email`.

### Table 2: `public.roi_calculator_entries`

Columns:

- `id` uuid PK
- `created_at`, `updated_at` timestamptz
- `full_name`, `company`, `email`, `phone` text (nullable — captured only if user proceeds to expert form; otherwise null)
- `company_size`, `industry`, `location` text
- `submission_data` jsonb NOT NULL — full questionnaire: company profile, every step's answers, challenges, priorities (ordered), radios, checkboxes, multi-selects
- `calculated_results` jsonb — computed scores/recommendations the page produces
- `roi_summary` jsonb — value map + key challenges summary the page renders
- `source_page` text default `/roi-calculator`
- `utm_source`, `utm_medium`, `utm_campaign`, `referrer` text

Index: `created_at desc`, `email`.

### GRANTs (mandatory, same migration)

```sql
GRANT INSERT ON public.website_leads TO anon, authenticated;
GRANT SELECT, UPDATE ON public.website_leads TO authenticated;
GRANT ALL ON public.website_leads TO service_role;

GRANT INSERT ON public.roi_calculator_entries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.roi_calculator_entries TO authenticated;
GRANT ALL ON public.roi_calculator_entries TO service_role;
```

### RLS policies

Both tables: `ENABLE ROW LEVEL SECURITY`.

- `anon_insert_*`: `FOR INSERT TO anon WITH CHECK (true)`
- `auth_insert_*`: `FOR INSERT TO authenticated WITH CHECK (true)`
- `admin_select_*`: `FOR SELECT TO authenticated USING (public.is_system_admin(auth.uid()))`
- `admin_update_*`: `FOR UPDATE TO authenticated USING (public.is_system_admin(auth.uid()))`
- No DELETE policy (admins delete via service role / dashboard).
- No public SELECT.

`updated_at` trigger using existing `public.update_updated_at_column()` pattern.

## Frontend wiring (no UI changes)

A small shared helper `src/lib/websiteLeads.ts`:

- `captureUtm()` — reads `URLSearchParams` + `document.referrer` once.
- `insertWebsiteLead(payload)` — wraps `supabase.from('website_leads').insert(...)`.
- `insertRoiEntry(payload)` — wraps `supabase.from('roi_calculator_entries').insert(...)`.

Replace the `setTimeout` simulations in:

1. `**src/pages/website/ContactPage.tsx**` — on submit, insert `lead_type='contact_request'`, `lead_sub_type=<inquiry type>`, `source_page='/contact'`. Keep toast + reset behavior on success. On error, still show existing success toast OR a non-blocking error toast (to be confirmed below).
2. `**src/pages/website/DemoRequestPage.tsx**` — insert `lead_type='demo_request'`, store `selected_solutions` array in `metadata.selected_solutions`. Keep existing Zod validation untouched.
3. `**src/pages/website/ROICalculator.tsx**`:
  - On final questionnaire completion (where results currently render), insert one row into `roi_calculator_entries` with full `submission_data` + `calculated_results` + `roi_summary`. Guard with a ref so it only fires once per session even if the results screen re-renders.
  - On "Talk to a QuickApp Expert" submit (`handleContactSubmit`), insert into `website_leads` with `lead_type='roi_callback_request'`, `lead_sub_type='quickapp_expert'`. If a ROI entry id exists from step 1, store it in `metadata.roi_entry_id` to link the two.

PDF generation, jsPDF code, and all rendering remain untouched.

## Verification

After migration approval:

1. Submit each of the 4 forms from the preview.
2. Run `SELECT * FROM website_leads ORDER BY created_at DESC LIMIT 5;` and same for `roi_calculator_entries` via `supabase--read_query`.
3. Confirm row counts, JSONB shape, and lead_type values.

## Out of scope

- No admin viewer UI.
- No email notifications.
- No PDF storage.
- No changes to form layouts, validations, copy, or success toasts.

## One clarification before I build

On insert failure (network/Supabase error), do you want me to:

- (A) Still show the existing success toast (never block the user, log error silently), or
- (B) Show an error toast asking them to retry?

Default if you don't specify: **(B)** for Contact / Demo / Expert forms (user expects acknowledgement), and **(A) silent** for the auto-capture of the ROI questionnaire (it's a background analytics write the user didn't explicitly trigger).  
  
On error, show the existing success toast (A)