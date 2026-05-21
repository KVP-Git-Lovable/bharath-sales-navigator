# Sardar Restore — Phase 1: Audit & Dry-Run (READ-ONLY)

This phase ships **only** a read-only audit. No DB writes. No reassignments. No inserts. No updates. No calls to existing `restore-sardar` / `restore-sardar-orders` functions.

Approving "Implement" builds Phase 1 only. Phases 2–4 require a separate, explicit approval with the specific row ids to act on.

## What gets built

### 1. New edge function: `sardar-restore-audit`

Path: `supabase/functions/sardar-restore-audit/index.ts`

- Verifies JWT, requires the caller to be a system admin (`public.is_system_admin(auth.uid())`). Non-admins get 403.
- Accepts `{ mode: "audit" }` only in this phase. Any other mode returns 400 ("apply mode not enabled in phase 1").
- Reads the 371-row snapshot already hardcoded in the existing `restore-sardar` function (imported as a JSON constant, not executed).
- For each snapshot row, looks up the live `public.retailers` row by `id` and classifies it into one of:
  1. `OK_PRESENT_OWNED_BY_SARDAR` — id present, `user_id = SARDAR_ID`, no field drift
  2. `MISSING` — id not present in DB
  3. `OWNED_BY_OTHER_USER` — id present, `user_id ≠ SARDAR_ID` (CONFLICT, never auto-fixable)
  4. `FIELDS_DRIFTED` — id present, owned by Sardar, but one or more snapshot fields differ (name, phone, beat_id, address, lat/lng, gst, etc.)
  5. `DUPLICATE_BY_PHONE_OR_NAME` — id missing but another retailer with same phone or normalized name exists (CONFLICT, skip)
- Second pass: for the May 20 / May 21 window, joins `orders` and `visits` against snapshot retailer ids and reports counts per bucket so we can see how many orphan orders/visits would be reconnected by a future restore.
- Returns a JSON summary (counts per bucket) **and** writes a per-row CSV to `/mnt/documents/sardar_restore_audit_<timestamp>.csv` via the function response (the function returns the CSV body; the caller in step 3 below saves it).

### 2. Audit log table (no data writes from the function itself)

Migration adds:

- `public.sardar_restore_audit_runs` — one row per audit invocation: `id`, `run_at`, `run_by`, `mode`, `summary jsonb`. RLS: only system admins can select/insert.
- `public.sardar_restore_log` — empty table prepared for Phase 3. Columns: `id`, `run_id`, `retailer_id`, `action` (`insert` | `update_fields` | `skip_conflict` | `noop`), `before jsonb`, `after jsonb`, `actor`, `created_at`. RLS: admin-only. No triggers, no writes in Phase 1.

Creating the log table now keeps Phase 3 a pure code change with no schema surprises.

### 3. Caller script + admin UI entry point

- Script: `scripts/run-sardar-audit.ts` (invokable via `bun`) — calls the edge function with the current admin session and writes the CSV to `/mnt/documents/sardar_restore_audit_<timestamp>.csv`. Used for the first run so we can hand the CSV back to the user.
- UI: add a single "Run Sardar restore audit" button on the existing system-admin diagnostics page (no new route). Button:
  - Calls `sardar-restore-audit` with `mode: "audit"`
  - Shows the bucket counts in a card
  - Offers a "Download CSV" link of the per-row report
  - Explicitly labels: "Read-only. No data is modified."

No other UI is added. No "Apply" / "Restore" button anywhere in this phase.

## Guardrails baked into Phase 1

- The function **rejects** any `mode` other than `"audit"`.
- The function does not import or call `restore-sardar` or `restore-sardar-orders`.
- The function uses the service role only for reads; the only writes it performs are a single row into `sardar_restore_audit_runs` recording that an audit ran.
- The hardcoded 371-row snapshot is treated as input data, not as a target to upsert.
- `OWNED_BY_OTHER_USER` and `DUPLICATE_BY_PHONE_OR_NAME` rows are flagged and counted, never written.

## Deliverable to the user after Phase 1 runs

1. JSON summary with counts per bucket (snapshot 371 → buckets 1–5) and orphan order/visit counts for May 20–21.
2. CSV at `/mnt/documents/sardar_restore_audit_<timestamp>.csv` with one row per snapshot retailer: `retailer_id, snapshot_name, snapshot_phone, snapshot_beat_id, current_user_id, current_name, current_phone, bucket, drift_fields, conflict_reason`.
3. Orphan orders CSV: `/mnt/documents/sardar_orphan_orders_<timestamp>.csv` listing May 20–21 orders whose retailer falls into bucket 2/3/5.

The user reviews these two CSVs and, in a separate message, lists the exact retailer ids they authorize for Phase 3.

## Out of scope for Phase 1 (require separate approval)

- Phase 2: human review of the CSV (no code).
- Phase 3: `mode=apply` with `allowedIds` / `forceReassignIds`, per-row writes, `sardar_restore_log` population, transactions of 50.
- Phase 4: post-apply re-audit.

## Technical notes

- Snapshot source: extract the existing 371-row array from `supabase/functions/restore-sardar/index.ts` into `supabase/functions/_shared/sardar-snapshot.ts` so both functions read from one place. The existing `restore-sardar` function keeps working but is not invoked.
- `SARDAR_ID = 6220fc85-ae7f-4c22-9694-db6c47fe8fb0` (confirmed earlier in this thread).
- Field-drift comparison ignores `created_at`, `updated_at`, and any column not present in the snapshot.
- Normalized name match for duplicate detection: lowercased, whitespace-collapsed, punctuation stripped.
- Phone match: last 10 digits only.
- Edge function is admin-only and rate-limited to 1 audit per minute per admin to avoid accidental spam.
