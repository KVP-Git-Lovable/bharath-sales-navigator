
# Resync Mokshith's beats and retailers from snapshot CSVs

## What the CSVs contain
- `beat.csv` → **25 beats** (24 of them referenced by the retailer CSV)
  - 19 rows: `user_id` / `owner_id` = Mokshith (`73044cad…`), `owner_name` = "Mokshith"
  - 6 rows: `user_id` / `owner_id` / `owner_name` are **NULL** in the snapshot (Elinje, Bajagoli-kuduremukha, Karkala 18, Hejamadi, Kodyadka, Moodabidre city, Kaikamba-Mullarpatna — all `created_by` = Mokshith)
- `retailer_650.csv` → **650 retailers**, all `user_id` = Mokshith, covering 24 of the 25 beats

## Current DB state (verified)
| Check | Result |
|---|---|
| Beats from CSV already in DB | **6** (exactly the 6 NULL-user rows — currently NULL in DB too) |
| Beats from CSV missing in DB | **19** (the Mokshith-owned ones — all hard-deleted) |
| Retailers from CSV already in DB | **0 of 650** |
| Mokshith's current retailers (4 in Padubidri) | Not in CSV — untouched |

## Plan

### Step 1 — Beats (idempotent UPSERT, no hardcoded values)
For each row in `beat.csv` we write **exactly what the CSV says** (no overrides):
- `INSERT … ON CONFLICT (beat_id) DO UPDATE` with every column from the CSV.
- The 19 missing rows get inserted with `user_id`/`owner_id` = Mokshith + `owner_name` = "Mokshith".
- The 6 NULL-user rows get their other columns refreshed but `user_id`/`owner_id` stay NULL (matching the snapshot).
- **Question 1 below** asks whether to override those 6 to Mokshith as well.

### Step 2 — Retailers (idempotent UPSERT, all 650 rows)
- `INSERT … ON CONFLICT (id) DO UPDATE` for each of the 650 rows, using **only** the columns present in the CSV (`id, retailer_name → name, user_id, beat_id, beat_name, owner_name, created_by, phone, address, created_at`).
- Required-but-missing columns (`entity_type`, `verified`) get their schema defaults on insert; existing rows aren't touched for those.
- Re-using the original UUIDs auto-relinks all FK-bearing rows in `visits`, `orders`, `retailer_visit_logs`, `credit_*`, `retailer_loyalty_*`, etc. — **nothing else needs to be touched on those tables to restore the link**.

### Step 3 — Historical user_id on `visits` and `orders` (needs your call — Question 2)
Right now those rows still hold `user_id` = Manvith (`d6d364d5…`). The retailer master will say Mokshith, but the visit/order history still says Manvith. Options below.

### Step 4 — Verification queries (after the writes)
- Count beats with `user_id` = Mokshith → expect 19 (or 25 if Q1=override).
- Count retailers with `user_id` = Mokshith → expect 650 + the 4 already-there = 654.
- Count `visits`/`orders` with `retailer_id` now linking to a real retailer row → should jump from ~0 back to 1,992 / 470.

## Open decisions

**Q1 — The 6 NULL-user beats in the snapshot (Elinje, Bajagoli-kuduremukha, Hejamadi, Kodyadka, Moodabidre city, Kaikamba-Mullarpatna, Karkala 18)**
The snapshot itself has them as NULL, but their retailers (in `retailer_650.csv`) are owned by Mokshith. Do you want me to:
- **A.** Keep them NULL exactly as the CSV says (snapshot-faithful), OR
- **B.** Also set their `user_id`/`owner_id`/`owner_name` to Mokshith so beats and retailers stay consistent.

**Q2 — Historical `visits` / `orders` `user_id` (currently Manvith)**
For every visit/order whose `retailer_id` is in this 650-row set:
- **A.** Leave `user_id` = Manvith (history stays factual), OR
- **B.** Rewrite `user_id` to Mokshith so Mokshith's analytics show the full history.
- (1,992 visits + 470 orders affected.)

## Technical notes
- All writes go through the migration/insert tool; no client-side or hardcoded UUID lists beyond what the CSVs literally contain.
- CSV → SQL conversion is done with `duckdb` so the data, not the AI, is the source of truth.
- Beats use `ON CONFLICT (beat_id)`, retailers use `ON CONFLICT (id)`, so re-running is safe.
- `beat_audit_log` will get one transfer entry per beat for traceability.

Reply with **Q1: A/B** and **Q2: A/B** and I'll execute.
