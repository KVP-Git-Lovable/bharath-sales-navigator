## Forensic verification — what the DB actually says

Confirmed via direct DB inspection for Mokshith (`73044cad-2c19-4a47-89f1-6a755adc3362`):

| Check | Result | Implication |
|---|---|---|
| `recycle_bin` rows for Mokshith | **1 beat only** (2026-05-14) | Mass archive via admin flow did **not** happen |
| `permanent_deletion_log` rows for Mokshith | **0** | No bin-clear event |
| `beats.owner_id → profiles.id` FK | **ON DELETE CASCADE — CONFIRMED** | Profile delete silently wipes ALL his beats |
| Other tables CASCADE from `profiles` | Only `beats`, `hierarchy_target_allocations`, `hierarchy_targets`, `petty_cash_*`, `pm_*`. **NOT** `retailers`, `visits`, `orders` | Profile cascade explains beats, but not orders |
| Mokshith profile row | Present. `created_at = 2026-05-02`, `updated_at = 2026-05-22 06:36:54` | Profile was touched/recreated on May 22 |
| Retailers for Mokshith | **654 active**, `last_update = 2026-05-22 06:55` | Admin-delete-user-data did **not** run (it would wipe retailers too) |
| Visits | **1991** intact | Same — confirms no admin user wipe |
| `beat_audit_log` rows for Mokshith | **0** | Audit unusable: `beat_id` column is `UUID`, app uses string IDs → silent insert failures |

## Conclusion — two separate root causes, not one

### Cause A — Beats wipe = profile CASCADE
- Profile was deleted and recreated around `2026-05-22 06:36`.
- `beats.owner_id ON DELETE CASCADE` silently removed all 25 beats with zero audit trail and zero recycle_bin entry.
- Retailers, visits, and other Mokshith data survived because they don't cascade from `profiles`.
- This is the proven path.

### Cause B — Orders wipe = different mechanism (not admin-delete-user-data)
- Admin-delete-user-data is ruled out: retailers and visits would also be gone, they aren't.
- Orders have no CASCADE from profiles, so profile recreation didn't do it.
- Remaining suspects, in priority order:
  1. RLS `DELETE` policy `Users can delete own data` on `orders` (user_id = auth.uid()) — a client call or script could have triggered it.
  2. `src/utils/orderCleanup.ts` cleanup flow.
  3. A manual SQL/dashboard delete.
- This needs a targeted log review before any restore.

## Safest plan (do in this exact order)

### 1. Stop the proven destructive path first
- Migration: change `beats.owner_id` from `ON DELETE CASCADE` to **`ON DELETE SET NULL`**.
- This alone prevents the same wipe from happening again the next time a profile is recreated.
- Review every other `ON DELETE CASCADE` from `profiles` listed above and decide which should also become `SET NULL` (especially `hierarchy_*` and `petty_cash_*`).

### 2. Lock down user/profile recreation flow
- Audit any admin path that deletes + re-inserts a `profiles` row (instead of updating in place).
- Replace delete+insert with `UPDATE`. Profile delete must be treated as a destructive operation behind explicit confirmation.

### 3. Harden the orders deletion surface
- Tighten the `Users can delete own data` RLS policy on `orders` — restrict to specific cancellation flows or remove client-side delete entirely; require server-side cancellation only.
- Review `orderCleanup.ts` and any edge function that can `DELETE FROM orders`. Convert to soft delete (`deleted_at`, `deleted_by`) or move behind explicit admin action with logging.

### 4. Fix `admin-delete-user-data` even though it didn't fire this time
- Stop hard-deleting `beats`; route through soft-delete + `recycle_bin`.
- Same for `orders`.
- Add explicit confirmation and structured logging.

### 5. Fix audit so this is never invisible again
- Migrate `beat_audit_log.beat_id` from `UUID` to `TEXT` so string beat IDs (`beat_177...`) actually log.
- Add a DB-level `AFTER DELETE` trigger on `beats` and `orders` that writes to an audit table with `current_user`, `txid_current()`, `current_setting('application_name')`, timestamp, and full row payload — this captures CASCADE deletes too.

### 6. Preserve current evidence before any restore
- Snapshot current state of: Mokshith's retailers (beat_id references), visits, profile row, and any related rows.
- Keep a record of the 25 beat_ids the retailers point to.

### 7. Restore beats safely
- Idempotent UPSERT of the 25 beats using the exact `beat_id` values still referenced by retailers.
- Set `owner_id = Mokshith profile id` — now safe because cascade is removed.
- Verify count holds after running admin and profile maintenance flows.

### 8. Restore orders — only from a real source of truth
- Orders have no `beat_id` column, so beat linkage is indirect via `retailers.beat_id`.
- Search for recoverable order data in:
  - any `recycle_bin` / archive table
  - existing restore edge functions (`restore-sardar-orders` is the same pattern used previously)
  - any export, prior migration payload, or backup snapshot
  - `order_items` rows still pointing at missing `orders.id`
- Restore each order with original `id`, `user_id = Mokshith`, original `retailer_id`, `order_date`, status, amounts. Then restore `order_items`.
- If no source of truth exists, the orders cannot be invented — confirm this with the user before declaring done.

### 9. Re-link mapping
- Orders are linked to beats only through `orders.retailer_id → retailers.beat_id`.
- After step 7 + 8, this mapping resolves automatically. No schema change to `orders` needed.

### 10. Post-restore validation
- Reconfirm beat count after running admin tools and profile updates.
- Reconfirm Mokshith's orders are visible in UI and DB.

## Technical notes
- The `supabase/config.toml` `project_id` differs from the connected project ref — flagging so the hardening migration is applied to the correct deployment.
- `restoreFromRecycleBin` already handles beats with string `beat_id` correctly, so soft-delete + restore via `recycle_bin` is the right pattern for future delete flows.

## What I will do once you approve
1. Migration: change `beats.owner_id` to `ON DELETE SET NULL` + audit hardening (text `beat_id`, trigger-based delete audit on `beats` and `orders`).
2. Patch `admin-delete-user-data` to remove hard deletes on `beats` and `orders`.
3. Tighten the orders DELETE RLS policy and orderCleanup path.
4. Then re-restore the 25 beats and investigate the best source for restoring Mokshith's orders.