## Goal
Restore Sardar's beat → retailer → order linkage as close to the pre-incident state as safely possible, without overwriting any newer correct data and without losing order history.

## What the data shows (verified, not assumed)

Active Sardar: `user_id = 6220fc85-ae7f-4c22-9694-db6c47fe8fb0`
- Role: `user` in `user_roles`. Security profile re-assigned in `user_profiles` at 2026-05-21 05:48 UTC.
- Beats created by Sardar: **21** (all still present, `created_by = Sardar`).
- Retailers currently owned by Sardar (`retailers.user_id = Sardar`): **1** ("Mauail treders", created today 2026-05-21).
- Retailers on Sardar's 21 beats: **1** (same record).
- Orders by Sardar (`orders.user_id = Sardar`): **488** — all preserved, none deleted.
- Orders with `retailer_id IS NULL`: **487** out of 488. Only the order created today (after re-assigning the role) has a valid `retailer_id`.
- `distributor_beat_mappings` for Sardar's beats: 0.
- `beat_audit_log` for Sardar: 0 entries (no recorded transfers).
- `recycle_bin` for Sardar's user_id: only 2 unrelated retailer records (THIRTY BRAND PRODUCTS, Durga store) from Feb 2026 — no mass archive of Sardar's retailers/orders.

### What this means
- Beats are intact.
- Order rows are intact (no deletion), but their `retailer_id` foreign key was cleared.
- Retailer rows that previously belonged to Sardar are *not in recycle_bin*, which means they were not deleted via the in-app delete flow. The most likely cause is a bulk UPDATE that set `retailers.user_id` / `beat_id` to NULL or to another user. Without the original retailer rows, an exact 1:1 retailer restore is not possible from current DB state alone.
- However, the orders carry `retailer_name` and `order_date`. We can use those plus Sardar's beats to safely relink most orders to existing retailer records when a unique name match exists.

The role change in itself does not delete or null any beat/retailer/order columns (verified in `EditUserDialog.tsx` and `UserProfileAssignment.tsx`). So the linkage break is from a separate destructive action (e.g. the admin "Delete User Data" flow run earlier, or a bulk update). That flow archives to recycle_bin — and we see only 2 retailer rows there for Sardar — so it likely wasn't run for all retailers either. We'll proceed with what we can safely rebuild and clearly report what cannot be restored without a backup.

## Plan (safe, reversible, no UI changes)

### Step 1 — Snapshot current state (read-only)
Export to `/mnt/documents/`:
- Sardar's 21 beats
- All 488 orders with `id, retailer_id, retailer_name, beat-related metadata, order_date, total_amount`
- All retailers currently referencing any of Sardar's 21 beat_ids
- recycle_bin rows where `record_data` references Sardar
This snapshot lets us roll back any change.

### Step 2 — Try to relink existing retailers to Sardar (no overwrites of newer ownership)
SQL-only, idempotent:
- For each retailer where `beat_id IN (Sardar's 21 beat_ids)` AND `user_id IS NULL`: set `user_id = Sardar`, `owner_id = Sardar`, `owner_name = 'Sardar'`.
- Do NOT touch retailers whose `user_id` is already non-null and belongs to another user (avoids hijacking).

### Step 3 — Relink orders to existing retailers by exact name + Sardar ownership
- Build a map: `(lower(trim(retailer_name)) → retailers.id)` restricted to retailers where `user_id = Sardar` OR `beat_id IN Sardar's 21 beat_ids`.
- For each of Sardar's 487 orders with `retailer_id IS NULL`, if `lower(trim(retailer_name))` matches exactly one retailer in the map, set `orders.retailer_id` to that id.
- Skip ambiguous matches (multiple retailers with same name) and unmatched orders — log them.

### Step 4 — Recreate missing retailer rows from order history (only on explicit confirmation)
For orders whose `retailer_name` has no matching retailer row, the original retailer record is gone. Two options to choose from after Step 3:
- (a) Leave those orders with `retailer_id = NULL` and just keep `retailer_name` (no data invented).
- (b) Create new retailer stubs (`name = retailer_name`, `user_id = Sardar`, `beat_id = NULL`, `status = 'active'`) and link the orders. Stubs are clearly marked with `notes = 'Auto-recreated 2026-05-21 from order history'` so they can be deleted/merged later. This restores the data shape for reporting but the stubs will lack address/phone/GPS until the user re-edits them.
This step is only run after you confirm the count of unmatched orders.

### Step 5 — Verify and report
- Re-run the diagnostic counts (beats / retailers / orders linked).
- Output `/mnt/documents/sardar-restore-report.csv` with: before counts, after counts, list of relinked orders, list of skipped/ambiguous orders, list of newly created stubs (if Step 4b chosen).

### What this plan deliberately does NOT do
- Does not modify `user_roles` or `user_profiles` (current role/profile assignment is fine).
- Does not delete any data.
- Does not overwrite newer retailers that already belong to other users.
- Does not invent retailer details (GPS, address, phone) — only restores name + ownership for stubs if approved.
- Does not change any UI/component code; this is a data-only repair.

## Technical execution
All steps run via `supabase--migration` (data UPDATEs are run as one-shot data migrations) so they are version-controlled in `supabase/migrations/`. Each step is a separate migration so we can roll back independently. No code changes, no edge function changes, no client changes.

## What you need to decide before I implement
1. Confirm you want Steps 1–3 run now (snapshot + relink existing retailers + relink orders by name).
2. For Step 4, choose (a) leave unmatched orders unlinked, or (b) auto-create retailer stubs for them. I will surface the unmatched count from Step 3 before doing this so you can choose with full information.
