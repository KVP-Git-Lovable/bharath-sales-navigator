## Goal

Make **Preview Transfer** answer the user's real questions before confirming, and let them optionally include pending-payment / outstanding records.

Today's preview only shows raw counts like `beats: 3, retailers: 5`. It does NOT show:
- Which beats are transferring and how many retailers sit under each
- The new owner (target user) name explicitly
- Any pending-payment / credit-ledger records
- A clear "from → to" mapping per bucket

The DB function `partial_ownership_transfer` only changes `owner_id` / `assigned_user_id` / `manager_id` on 6 tables and never touches financial tables. That is intentional but we will surface it and add an opt-in for pending payments.

## What "Preview" will show after this change

A clean impact summary, e.g.:

```text
Transfer from: Rahul Sharma  →  Suresh Kumar

Retailers (12 will move)
  • Acme Stores
  • Bharat Mart
  …

Beats (3 will move) — retailers under each beat will now belong to Suresh
  • Beat-MUM-01      (24 retailers, ₹ 18,400 outstanding)
  • Beat-MUM-02      (11 retailers, ₹ 0)
  • Beat-PUN-05      (7 retailers,  ₹ 4,200)

Territories (1)  · Distributors (0)  · Vans (1)  · Direct reports (0)

Pending payments / outstanding ledger
  ⚠ 7 retailers in this transfer have ₹ 22,600 unsettled.
  [ ] Also reassign open credit-ledger entries to Suresh
       (default OFF — historical entries stay with source user)

Warnings
  • 2 selected retailers are already owned by another user.
```

Confirm button stays disabled until preview has been run at least once.

## Scope of changes

### 1. Frontend — richer preview UI (`UserDeleteDialog.tsx`)

After `handlePreview` returns, render an **Impact Summary** block instead of the current bullet list:

- Header line: source name → target name (resolved from `availableUsers`).
- Retailers card: list selected retailer names (truncate after 10, "+N more").
- Beats card: for each selected beat, fetch `beat_name` + `count(retailers where beat_id = b.beat_id and owner_id = p_from)` + sum of outstanding (see step 3). Use a single batched query with `.in('beat_id', selectedBeats)`.
- Territories / Distributors / Vans / Direct reports cards: name + small badge.
- Pending-payments card: see step 3.
- Warnings (already exist) shown in amber.

This is purely client-side composition over data already loaded by `PartialTransferPicker`, plus one extra query for retailer counts/outstanding per beat.

### 2. Frontend — clarify what does NOT move

Add a small "Stays with source user" footer in the preview:
"Orders, invoices, attendance, GPS logs, gamification, expenses — historical, do not move."

This matches current backend behavior and prevents confusion.

### 3. Optional: include pending payments in transfer

Add a new bucket toggle in `PartialTransferPicker` and `PartialSelection`:

```ts
include_pending_payments: boolean   // default false
```

When ON, the RPC additionally reassigns "ownership" rows in:
- `credit_ledger` rows where `retailer_id ∈ selected retailers OR retailers under selected beats` and `status` is open
- `distributor_payments` with `status = 'pending'` for selected retailers
- `inst_collections` with `status = 'pending'` for selected retailers

Reassignment means setting their `user_id` / owning-user column to `p_to` so that the new owner sees them in their pending-collections UI. Schema check confirmed these tables have `retailer_id`, `status`, `amount`. We will add the `user_id` filter when present (verified per table during implementation).

Preview (dry-run) returns: `pending_payments: { count, total_amount, by_retailer: [...] }`.

If the toggle is OFF (default), behavior is unchanged — exactly what the user asked: "sometimes I might want this".

### 4. Backend — extend `partial_ownership_transfer`

Add to the existing RPC (no breaking changes; same signature, payload-driven):

```text
v_include_payments := COALESCE((p_payload->>'include_pending_payments')::boolean, false)
```

Add a new code branch that, when `v_include_payments` is true:
- Computes `v_affected_retailers = selected retailers ∪ retailers WHERE beat_id IN (selected beats) AND owner_id = p_from`.
- Counts pending payment rows per table (dry-run) or updates owning user column (real run).
- Returns `counts.pending_payments_*` and an aggregate `outstanding_amount`.

Even when the toggle is OFF, the RPC will still return a read-only summary `outstanding_preview = { retailer_count, total_amount }` so the UI can show the warning. This is computed via SELECTs only, no writes.

Also extend warnings with `bucket: 'beats'` info: number of retailers under transferred beats that are NOT owned by source (those won't move automatically — call out clearly).

### 5. Audit

The existing `partial_ownership_transfer` does not yet write to an audit table. Out of scope here — but we will include the `transfer_reason` and the new `include_pending_payments` flag in the returned JSON so it's visible in logs / future audit.

## Files touched

- `supabase/migrations/<new>.sql` — extend `partial_ownership_transfer` RPC (add payments branch + outstanding preview).
- `src/components/admin/PartialTransferPicker.tsx` — add the "Include pending payments" checkbox + outstanding badge per retailer/beat.
- `src/components/admin/UserDeleteDialog.tsx` — richer preview block (names, beat→retailer counts, outstanding totals, target user, warnings).
- No change to existing `transfer` / `delete` flows.

## Out of scope

- Schema migrations for new audit tables.
- Reassigning historical orders/invoices/attendance.
- Bulk UI for >500 records (already chunked client-side).
