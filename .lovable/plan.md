
# Sardar Data Restore — From May 19 Snapshot

**Source of truth:** the two uploaded CSVs (371 retailers + 378 beat↔retailer mappings) captured on May 19 while Sardar's account was healthy.

**Confirmed:** No prior changes in this thread touched Sagar's user, beats, retailers, or orders. Only the products price-restore migration ran.

---

## Step 1 — Stage the snapshot

Load both CSVs into temporary tables in Postgres:
- `_restore_sardar_retailers` (371 rows, full retailer columns)
- `_restore_sardar_beats_map` (378 rows: beat_id, beat_name, retailer_id)

Done via `COPY ... FROM STDIN` using the uploaded files. No production tables touched yet.

## Step 2 — Diagnostic diff (read-only report)

For every retailer_id in the snapshot, classify current DB state:

| Bucket | Meaning | Action |
|---|---|---|
| A | Exists, `user_id = Sardar` | Skip — already correct |
| B | Exists, `user_id IS NULL` | Restore from snapshot |
| C | Exists, `user_id = Sagar` or other | **STOP — list to user** |
| D | Missing entirely | Re-insert from snapshot |

Same diff for the 21 beat_ids referenced. Output a CSV report to `/mnt/documents/sardar_restore_diff.csv` and pause.

## Step 3 — Conflict gate

If bucket C is non-empty, halt and surface the list (retailer id, name, current owner). No writes until you decide per-row. This honors your "Stop and list them" choice.

## Step 4 — Restore beats

For each beat_id in the snapshot:
- If missing → INSERT (id, name, created_by=Sardar, user_id=Sardar)
- If exists but unowned → UPDATE created_by/user_id to Sardar
- If owned by someone else → skip + list

## Step 5 — Restore retailers

For buckets B and D only:
- B: UPDATE retailers SET user_id, owner_id, owner_name, beat_id, created_by, address, phone, latitude, longitude, gst_number, category, retail_type, photo_url, … ← snapshot values, WHERE id = snapshot.id AND (user_id IS NULL OR user_id = Sardar).
- D: INSERT full row from snapshot, preserving original `id` so order FKs reattach automatically.

`updated_at = now()`, leave `created_at` from snapshot.

## Step 6 — Relink orphan orders

After retailers are back:
```
UPDATE orders o
SET retailer_id = r.id
FROM retailers r
WHERE o.user_id = '<Sardar>'
  AND o.retailer_id IS NULL
  AND r.user_id = '<Sardar>'
  AND lower(trim(o.retailer_name)) = lower(trim(r.name));
```
Ambiguous (multi-match) names skipped and reported.

## Step 7 — Verify & snapshot

- Pre/post row counts: retailers owned by Sardar, beats owned by Sardar, orders with non-null retailer_id.
- Export final report → `/mnt/documents/sardar_restore_report.csv`.
- Backup of pre-change state → `/mnt/documents/sardar_pre_restore_snapshot/`.

---

## Safety guarantees

- No changes to `user_roles`, `user_profiles`, `auth.users`.
- No changes to any record currently owned by Sagar (gated at Step 3).
- All writes idempotent — re-running is safe.
- No application code changes; SQL only.
- Original `id`s preserved so existing FKs (orders, visits, invoices) reconnect without further work.

## What you'll approve next

After you click "Implement plan", I'll run Steps 1–3 first and show you the diff report. Steps 4–7 only execute after you review the Step 3 conflict list (if any).
