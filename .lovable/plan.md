## Overview
Add a new **Support** entry to the website top nav (`WebsiteHeader.tsx`). It opens a tabbed hub — **Ideas · Tickets · Releases · Help Center** — accessible only to logged-in users. All create/comment/vote/like actions require sign-in; anonymous visitors are redirected to `/auth`.

## Routes
- `/support` → redirect to `/support/releases` (default landing tab)
- `/support/ideas`
- `/support/tickets`
- `/support/releases`
- `/support/releases/:slug` (release detail — e.g. `july-2026`)
- `/support/help` → renders the **existing** `HelpCenter` component (mirrored — same source, updates flow to both `/help` and `/support/help`)

Nav additions in `WebsiteHeader.tsx`: single "Support" link between Pricing and CTA buttons.

## Database (new tables, all with GRANTs + RLS)

**`support_ideas`** — id, title, description, category, status (submitted/under_review/planned/shipped/declined), created_by, created_at, updated_at
**`support_idea_votes`** — idea_id, user_id, vote (1/-1), unique(idea_id, user_id)
**`support_idea_comments`** — id, idea_id, user_id, body, created_at
**`support_tickets`** — id, ticket_number (auto), subject, description, company_name, category (bug/feature/question/billing), impact (low/medium/high/critical), status (open/in_progress/waiting/resolved/closed), created_by, assigned_to, created_at, updated_at
**`support_ticket_attachments`** — id, ticket_id, file_path, file_name, mime_type, size, uploaded_by
**`support_ticket_comments`** — id, ticket_id, user_id, body, is_internal, created_at
**`releases`** — id, slug (unique), version, title, release_date, summary, highlights (jsonb: string[]), body_md (long-form detail), status (draft/published), created_by
**`release_sections`** — id, release_id, title, position, features (jsonb: [{name, benefit}])  — scalable per-area grouping
**`release_likes`** — release_id, user_id, unique
**`release_comments`** — id, release_id, user_id, body, created_at

**Storage bucket:** `support-attachments` (private; RLS: user can read own + admins read all).

**RLS pattern:** authenticated users read published releases and all ideas/tickets they own or that are public; write only their own rows; admins (via existing `is_system_admin(auth.uid())`) manage everything. Ticket rows are private to creator + admins.

**Ticket number:** sequence `support_ticket_seq` + trigger formats `TKT-000123`.

## Seed content
Insert **July 2026** release from the uploaded document:
- slug `july-2026`, version `2026.07`, release_date `2026-07-01`, status `published`
- `highlights`: 4 headline capabilities (Beat Lifecycle, Retailer Verification, Order Edit & Cancellation, Notifications & Alerts)
- `release_sections`: Territory & Beats, Retailer Management, Orders & Order Editing, Primary Ordering/Packing/Dispatch, Payments & Credit, Products/UOM/Pricing/Tax, Platform & Configuration, Field/Activity/Portals, Analytics & Quality, How we roll it out — each with its feature/benefit rows from the doc.

Structure is **scalable** — every future month = one new `releases` row + N `release_sections` rows. New releases appear automatically on the Releases index sorted by `release_date DESC`.

## UI components (new)
- `src/pages/support/SupportLayout.tsx` — shared header + tab bar + auth gate
- `src/pages/support/IdeasPage.tsx` — list, submit modal, upvote, comment thread, status badges
- `src/pages/support/TicketsPage.tsx` — list "My Tickets" + admin view, "Raise ticket" dialog (subject, company, category, impact, description, screenshot uploads via storage bucket), ticket detail with comment thread + status changes
- `src/pages/support/ReleasesPage.tsx` — cards showing version, date, summary, highlight chips, like count
- `src/pages/support/ReleaseDetailPage.tsx` — full release: summary, headline capabilities, per-section feature/benefit tables, rollout notes, like button + comment thread
- `src/pages/support/HelpMirror.tsx` — thin wrapper rendering existing `HelpCenter` (single source of truth)

## Access control
`SupportLayout` wraps children with `<ProtectedRoute>` (existing pattern), so unauthenticated visits redirect to `/auth?redirect=/support/...`. The nav "Support" link is visible to everyone — clicking while logged out sends them to auth then back.

## Technical notes
- Uses existing `supabase` client, `useAuth`, `useAdminAccess`.
- Uses existing shadcn UI primitives (Card, Dialog, Tabs, Badge, Textarea, Input).
- File uploads via `supabase.storage.from('support-attachments').upload(...)` — 5MB per file, image/pdf only.
- Real-time not required for v1 — refetch on mutation via `react-query`.
- Ticket number generated server-side via trigger to keep it monotonic.
- `body_md` rendered with existing `react-markdown` (already used in `IdeasPanel`).

## Out of scope for this pass
- Email/WhatsApp notifications on ticket updates (can be added later via existing notification rules engine).
- SLA timers, ticket routing rules — v1 uses simple manual assign.

Ready to build on approval.