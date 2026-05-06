## Goal

Establish the clean three-column model you described, fix beat visibility for transferred users, and keep historical financial ownership immutable while still letting the new user collect pending dues.

## Current schema reality (verified)

```text
beats     : created_by(uuid), owner_id(uuid)            ← NO user_id
retailers : owner_id(uuid),  user_id(uuid)              ← NO created_by
credit_ledger        : created_by(uuid),  retailer_id, amount
distributor_payments : created_by(text),  retailer_id, amount, status
inst_collections     : retailer_id, amount, status      ← no user column
```

So before anything else, beats are missing the operational column and retailers are missing the historical column. Both must be added so the model becomes uniform.  
Stop using created_by as operational ownership.

## Target model (uniform across beats and retailers)


| Column       | Meaning                                                     | Mutated on transfer?                        |
| ------------ | ----------------------------------------------------------- | ------------------------------------------- |
| `created_by` | Immutable historical creator                                | **No**                                      |
| `owner_id`   | Business / revenue owner                                    | Only when "Transfer ownership" toggle is ON |
| `user_id`    | Operational assignee (works the beat / retailer day-to-day) | **Yes**, every transfer                     |


## Why pending payments will "just work" after this

`PendingPaymentsAll.tsx` already filters retailers by `user_id = me OR owner_id = me`. Once the operational `user_id` actually moves to the new user during a transfer, pending dues automatically appear for them — without touching any financial table. Historical attribution on `credit_ledger.created_by` / `distributor_payments.created_by` stays untouched. This is exactly the "collector vs revenue owner" separation you asked for, achieved without schema bloat on financial tables.

If you later want a fully explicit `collector_user_id` on the financial tables, that becomes a clean follow-up — but it is not required to fix the current bug.

---

## Plan

### 1. Schema migration

```text
ALTER TABLE public.beats     ADD COLUMN user_id uuid;       -- operational assignee
ALTER TABLE public.retailers ADD COLUMN created_by uuid;    -- historical creator
CREATE INDEX idx_beats_user_id        ON public.beats(user_id);
CREATE INDEX idx_retailers_created_by ON public.retailers(created_by);
```

Backfill so existing rows behave correctly from day one:

- `beats.user_id := COALESCE(owner_id, created_by)` for all existing rows
- `retailers.created_by := user_id` (best-available historical proxy; original creator unknown for legacy rows, so we seed it once and never touch it again)

RLS: extend existing beats/retailers SELECT policies so a row is visible if `user_id = auth.uid()` (in addition to current owner/created_by paths). This is additive — no existing access is removed.

### 2. Update `partial_ownership_transfer` RPC

For the **beats bucket**:

- Always (both modes): `UPDATE beats SET user_id = p_to WHERE beat_id IN (...) AND (user_id = p_from OR owner_id = p_from)`
- "Transfer ownership" ON: also `SET owner_id = p_to` for the same rows
- **Never** touch `beats.created_by`

For the **retailers bucket** (already mostly correct, just align):

- Always: `UPDATE retailers SET user_id = p_to WHERE id IN (...) AND owner_id = p_from`
- "Transfer ownership" ON: also `SET owner_id = p_to`
- **Never** touch `retailers.created_by`

For **retailers cascaded under selected beats**: same rule — `user_id` always moves; `owner_id` only when ownership toggle is ON; `created_by` never.

Remove the (currently no-op and architecturally wrong) `include_pending_payments` writes against `credit_ledger` / `distributor_payments` / `inst_collections`. Keep only the **preview counts** and a clarified warning: *"Pending dues stay attributed to original owner for revenue history; new user will see them via retailer assignment for collection."*

### 3. Fix `MyBeats.tsx` query (the real Issue 1 fix)

Replace the operational filter from `created_by` to the new operational column, on both the cached and the online path:

```text
.in('created_by', effectiveUserIds)   →   .in('user_id', effectiveUserIds)
b.created_by                          →   b.user_id
```

`useMasterDataCache.ts` line 418 (`.eq('created_by', user.id)` for active beats) — same change to `user_id`.

`created_by` stays in the row for audit/history but is no longer used for visibility.

### 4. Backfill `beats.user_id` for the user who already lost their transferred beat

After the migration runs, the seeded `beats.user_id := COALESCE(owner_id, created_by)` will already place the previously-transferred beats with whichever user owns them now (because earlier transfers updated `owner_id`). So your earlier transfer becomes visible to the new user immediately — no manual cleanup needed.

### 5. Beat creation / existing flows

- `MyBeats.tsx` create flow (line 620) already sets `created_by = user.id`; add `user_id = user.id` and `owner_id = user.id` at creation so all three start aligned.
- `BeatTransferDialog.tsx` (legacy single-beat transfer) currently updates `beats.created_by` — change it to update `user_id` (and `owner_id` if you also want full ownership). This is the second place where `created_by` was being incorrectly mutated.

### 6. Out of scope (deliberately)

- No writes to `credit_ledger.*`, `distributor_payments.*`, `inst_collections.*`. Historical financial attribution stays immutable.
- No new `collector_user_id` column on financial tables yet — current retailer-based filter already covers the collection UX. Can be added later as Option A from your message if you want explicit per-row collector assignment.

---

## Files / artefacts

```text
supabase/migrations/<new>.sql
  - ALTER TABLE beats ADD user_id, retailers ADD created_by
  - backfill, indexes, RLS additions
  - CREATE OR REPLACE FUNCTION partial_ownership_transfer (rewritten per §2)

src/pages/MyBeats.tsx
  - swap created_by → user_id in the two list filters and cache filter
  - on create: also set user_id and owner_id

src/hooks/useMasterDataCache.ts
  - swap created_by → user_id on the active-beats fetch

src/components/BeatTransferDialog.tsx
  - update user_id (always) + owner_id (if ownership flag); stop touching created_by

src/integrations/supabase/types.ts
  - regenerated automatically from schema
```

## Verification

1. Run the migration — confirm `beats.user_id` populated for every row, `retailers.created_by` populated.
2. Reload `/my-beats` as the previously-target user: beats from prior transfers now appear.
3. New partial transfer (toggle OFF): new user sees the beat in MyBeats and pending dues for those retailers in `/pending-payments`. Original user keeps `owner_id` and all historical revenue / financial rows untouched.
4. New partial transfer (toggle ON): same as above plus `owner_id` moves to new user; new orders going forward attribute revenue to the new user.
5. Query `credit_ledger` / `distributor_payments` `created_by` for a sample retailer transferred long ago — values are unchanged from before the migration. Audit integrity preserved.