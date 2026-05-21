# Restore Sardar's Orders from May 19 Snapshot

## What the CSV proves

The uploaded file is the `orders` table filtered by `user_id = 6220fc85-...` (Sardar) — captured before the deletion. Verified:

- **479 orders**, all with `user_id = 6220fc85` (Sardar)
- Date range: **2026-01-28 → 2026-05-19**
- **227 distinct retailer_ids** referenced
- **Zero ID overlap** with Sagar's current 536 orders — confirms Sagar's orders are his own, and Sardar's 479 are genuinely missing
- All 479 IDs are absent from the current `orders` table (sample checks returned 0)
- All 44 CSV columns match the live `orders` schema exactly

So Sardar's orders were **hard-deleted**. We re-insert them verbatim.

## Step 1 — Stage the CSV

`COPY` the file into a temp staging table `_restore_sardar_orders` with all 44 columns matching `orders`.

## Step 2 — Pre-flight diff (read-only)

For each of the 479 rows:
- Is `id` already in `orders`? (expect 0 — abort if any collide)
- Is `retailer_id` present in `retailers`? Bucket missing ones.
- Is `visit_id` present in `visits`? Bucket missing ones (nullify if missing — visits aren't required).
- Is `assigned_agent_id` / `cancelled_by` / `counter_customer_id` / `packing_list_id` / `event_id` / `distributor_id` valid? Nullify any dangling FKs.

Write report to `/mnt/documents/sardar_orders_restore_diff.csv`. Pause for review only if `id` collisions exist or >5% retailer_ids missing.

## Step 3 — Insert the orders

```
INSERT INTO orders (<all 44 columns>)
SELECT <columns, with dangling FKs nulled per Step 2>
FROM _restore_sardar_orders
ON CONFLICT (id) DO NOTHING;
```

Force `user_id = '6220fc85-...'` and `owner_id_snapshot = '6220fc85-...'` to be safe (CSV already has them).

## Step 4 — Verify

```
SELECT COUNT(*), SUM(total_amount), MIN(order_date), MAX(order_date)
FROM orders WHERE user_id='6220fc85-...';
-- expect 479, total ≈ sum from CSV, dates 2026-01-28 → 2026-05-19
```

Cross-check against `_restore_sardar_orders` (counts and sum match).

## Step 5 — Report

Export final summary → `/mnt/documents/sardar_orders_restore_report.csv` with: rows inserted, rows skipped (and why), retailer/visit FKs nulled.

---

## ⚠️ Known limitation — order_items NOT in this snapshot

The CSV is **only the `orders` header rows**. It does not contain `order_items` (line items: product, qty, price per order). After Step 3:

- `orders.total_amount` will be correct (header value preserved).
- But **line-item detail will be empty** — invoices/PDFs that re-render from `order_items` will show "no items" for these 479 orders.

**Options:**
1. Accept header-only restore now (totals + retailer + date + payment status all correct; invoices that reference saved PDFs or `total_amount` work fine).
2. Also upload an `order_items` snapshot filtered by these 479 order_ids — I'll restore both together.

I'll proceed with **option 1 (header-only)** unless you upload items. The orders will show up in the dashboard with correct totals immediately.

## Safety

- No change to Sagar's data, retailers, beats, profiles, or auth.
- `ON CONFLICT DO NOTHING` makes re-runs safe.
- Dangling FKs nulled, not force-inserted — no constraint violations.
- Pre/post counts logged.

## What you approve next

Click **Implement plan** and I'll run Steps 1–2 (stage + diff) and show you the report before any insert.
