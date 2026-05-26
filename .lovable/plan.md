# Final plan — Beats safety, restore & audit

## What we already confirmed

- Mokshith currently has **0 active beats**.
- The destructive audit trigger captured the event: **25 beats deleted in one transaction on 2026-05-26 05:37:45 UTC**, with `application_name = supabase/dashboard`, `db_user = postgres`, `app_user = NULL`.
- This was **not** the auto-beat-plan feature. It was a destructive action from the Supabase dashboard / SQL side, outside the app UI.
- `beats.owner_id → profiles.id` is already `ON DELETE SET NULL` (good), but several beat-linked tables (`distributor_beat_mappings`, `van_beat_assignments`, `user_business_plan_territory_beats`) reference `beats.id` as `ON DELETE CASCADE` — so if a `beats` row is hard-deleted, those mappings vanish silently.
- The in-app `beat_audit_log` schema is missing `old_user_id` and `new_user_id`, so the app's audit writes/reads are partially broken.

Your 7-point checklist is correct. The plan below covers all of them as one coherent fix.

## Plan

### 1. Restore Mokshith's beats with original IDs (idempotent)
- Re-insert the 25 beats from the previous restore migration values using `ON CONFLICT (beat_id) DO UPDATE`, preserving original `beat_id`s so existing `retailers.beat_id`, `beat_plans.beat_id`, `beat_allowances.beat_id`, `orders.beat_id` references stay intact.
- Mark all restored beats `is_active = true`.

### 2. Backfill retailer & plan mappings
- For any `retailers` rows that lost `beat_id` linkage during the deletion window, re-link them by `beat_name` where unambiguous; leave the rest as unassigned with a report.
- Keep `beat_plans` and `beat_allowances` rows that already exist (they were not cascade-deleted because they don't FK to `beats.id`).

### 3. Replace CASCADE with SET NULL on beat-linked tables
- Change `distributor_beat_mappings.beat_id`, `van_beat_assignments.beat_id`, `user_business_plan_territory_beats.beat_id`, and any other `REFERENCES beats(id) ON DELETE CASCADE` to `ON DELETE SET NULL`.
- This guarantees a future beat removal can never silently wipe distributor/van/territory mappings.

### 4. Fix the beat audit log schema
- Add the missing columns the app already writes/reads: `old_user_id uuid`, `new_user_id uuid`.
- Keep existing rows; new fields nullable.
- After the migration, the `BeatAuditTimeline` component, `MyBeats`, `BeatDetail`, and `BeatTransferDialog` writes will work end-to-end without the `as any` cast hiding mismatches.

### 5. Add DB-level destructive audit + block client deletes on beats
- The `destructive_audit_log` table and `trg_audit_delete_beats` trigger already exist and worked — they're how we identified this incident. Keep them.
- Add a hardened DELETE policy on `public.beats`:
  - `CREATE POLICY "No client deletes on beats" ON public.beats FOR DELETE USING (false);`
  - This forces in-app "delete" flows to use **soft delete** (`is_active = false`), which they already do via `MyBeats.handleConfirmDeleteBeat` and `BeatDetail`. Hard deletes will then only be possible via service role / dashboard, and those will always be logged in `destructive_audit_log` with `db_user` and `application_name` identifying the source.

### 6. Soft-delete-only for beats in the app
- Audit the three deletion code paths in the app:
  - `src/pages/MyBeats.tsx` (already soft-delete via `update is_active=false`) — confirm no hard delete branch remains.
  - `src/pages/BeatDetail.tsx` (already soft-delete) — confirm.
  - `src/hooks/useOfflineSync.ts` case `'DELETE_BEAT'` currently does `from('beats').delete()` — change this to `update({ is_active: false })` so queued offline deletions cannot hard-delete from `beats`.
- Ensure every soft-delete path writes a `beat_audit_log` row with action `delete` (or `deactivate`) and a non-null `performed_by`.

### 7. Stop delete-and-recreate profile flows + protect profiles
- Audit `UserDeleteDialog` / admin user removal to ensure it does **soft deactivation** (e.g. `is_active=false`, role removal) instead of `DELETE FROM profiles`.
- Block client-side hard deletes on `profiles`:
  - `CREATE POLICY "No client deletes on profiles" ON public.profiles FOR DELETE USING (false);`
- Add a `destructive_audit_log` trigger on `profiles` so any future profile hard-delete (e.g. via dashboard) is captured the same way the beat deletion was.
- This prevents the "user is removed and re-created with a new id" pattern that orphans beats/orders.

### 8. Surface the audit in the app
- In `BeatAuditTimeline`, when no `beat_audit_log` entries exist for a beat, fall back to `destructive_audit_log` (filtered by `table_name='beats'` and `row_pk=beat_id`) and render the entry as "Deleted externally from {application_name} at {occurred_at}". Admin-only.
- This makes incidents like Mokshith's instantly explainable from inside the app.

### 9. Verification checklist (after deploy)
- `SELECT count(*) FROM beats WHERE owner_id = '73044…3362' AND is_active = true;` → **25**.
- Mokshith opens **My Beats** → all beats visible with retailers re-attached.
- Try to hard-delete a beat from the app → blocked by RLS, soft-delete still works and audit row written.
- Delete a test beat from the Supabase dashboard → `destructive_audit_log` row appears, and the beat shows "Deleted externally" in the audit timeline.
- `beat_audit_log` insert from the app no longer requires the `as any` cast in practice (schema matches).

## Technical details (for engineers)

Files touched:
- `supabase/migrations/<new>.sql` — items 3, 4, 5, 7 (schema + RLS + triggers).
- Data restore via insert tool — items 1, 2.
- `src/hooks/useOfflineSync.ts` — change `DELETE_BEAT` to soft-delete.
- `src/components/BeatAuditTimeline.tsx` — add destructive_audit_log fallback (admin-only).
- `src/components/admin/UserDeleteDialog.tsx` — confirm soft-deactivation path; remove any profile hard-delete.

What this does NOT change:
- The auto-beat-plan edge function (it was never the cause).
- Existing soft-delete UX in `MyBeats` / `BeatDetail`.
- Order, invoice, or retailer business logic.

## Outcome

After this:
- Mokshith's beats are back, mapped to the right retailers.
- Beats cannot be silently lost — neither from the app, nor from offline sync, nor from cascade chains.
- Any future destructive action (even from the Supabase dashboard) is captured and visible inside the app's audit timeline.
- Profile delete-and-recreate, which is the upstream cause of "auto-deleted" beats, is blocked at the DB layer.