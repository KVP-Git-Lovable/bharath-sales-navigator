## Goal
Auto-send formatted Microsoft Teams notifications to the "Demo and Enquiries" channel whenever a new row is inserted into `public.website_leads`, without ever blocking form submission.

## Approach
Use a Supabase **database trigger → `pg_net` async HTTP POST → Edge Function → Microsoft Teams gateway**. This is the most production-safe pattern in this project because:
- The trigger fires reliably on every insert (UI, API, edge function, manual).
- `pg_net` is asynchronous, so the INSERT commits even if Teams is slow/down.
- The Edge Function isolates Teams credentials (already available via the linked `microsoft_teams` connector) and handles formatting.
- Failures are logged in `net._http_response` and edge function logs, never surfaced to the visitor.

## Steps

1. **Link the Microsoft Teams connector to this project**
   The workspace has `prajwal's Microsoft Teams` available but it is not yet linked to this project (its secrets `TEAMS_ACCESS_TOKEN` / `TEAMS_API_KEY` are not yet in the project env). I'll link it via the connector tool — no new credentials needed from you.

2. **New Edge Function `notify-teams-lead`** (`verify_jwt = false`, called only by the DB trigger; validates a shared secret header)
   - Accepts `{ lead_id }` payload.
   - Looks up the row with the service role key.
   - Formats the message exactly as specified:
     - 🚀 New Lead for QuickApp header
     - Full Name / Email / Phone / Company / Team Size / Industry / Message / Lead Type / Source Page / Submitted At
     - Empty/NULL → `Not provided`
     - `contact_request` → `Contact Request (<lead_sub_type>)` when present
     - `demo_request` → append `🎯 Solutions Requested:` list from `metadata.selected_solutions`
     - `roi_callback_request` → label as `QuickApp Expert Callback`
   - POSTs to the gateway:
     `POST https://connector-gateway.lovable.dev/microsoft_teams/teams/fae1bb2c-e9bc-40f8-8e77-e07e5e07f79a/channels/19:5dad73110eca4ee48fb0bd3273cc933d@thread.tacv2/messages`
     with `contentType: "html"` body (line breaks via `<br>`) so emojis and layout render cleanly in Teams.
   - Always returns 200; errors only `console.error` so `pg_net` doesn't retry-storm.

3. **Secrets**
   - `TEAMS_NOTIFY_SHARED_SECRET` — added via the secrets tool, also stored in a private `app_settings` GUC so the trigger can send it as a header. (`LOVABLE_API_KEY` and `TEAMS_API_KEY` come from the connector link automatically.)

4. **Migration: trigger on `website_leads`**
   ```text
   AFTER INSERT ON public.website_leads
     FOR EACH ROW
     EXECUTE FUNCTION public.notify_teams_on_new_lead();
   ```
   The function uses `net.http_post` (extension `pg_net`, already enabled in Supabase) to call the edge function URL with `{ "lead_id": NEW.id }` and the shared-secret header. The function is `SECURITY DEFINER`, wrapped in `BEGIN ... EXCEPTION WHEN OTHERS THEN RETURN NEW; END;` so any failure is swallowed and the INSERT still commits. No changes to existing RLS, grants, or the client helper.

5. **Verification**
   - Submit a test contact form on quickapp.ai.
   - Confirm row appears in `website_leads`.
   - Confirm message appears in the "Demo and Enquiries" channel.
   - Re-test with demo_request (with `selected_solutions`) and roi_callback_request.
   - Force a Teams failure (bad token) and confirm the INSERT still succeeds and the user sees the normal success toast.

## Out of scope
- No UI changes.
- No changes to existing RLS / grants / `insertWebsiteLead` / `insertRoiEntry`.
- No changes to the ROI tracker assessment flow.
- No retry queue — `pg_net` logs failed POSTs in `net._http_response` for manual replay if ever needed.
