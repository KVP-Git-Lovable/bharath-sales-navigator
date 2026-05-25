# Restore Mokshith's Orders + Order Items from Backup CSVs

Two CSVs uploaded:
- **CSV #3** — 23 order headers (id, retailer, beat, date, totals)
- **CSV #4** — 29 line items across the same 23 orders, with product_name, category, unit, quantity, rate, discounts, CGST/SGST, item_total

This is enough to restore both `orders` and `order_items` (header + line items). One order (`88f27316...` Meharaj Mini Market, 2026-05-14) has all-null line fields = a zero-value "visit-only" order → restore header only, no item.

## What can be restored

| Table | Field | Source |
|---|---|---|
| `orders.id` | order_id | CSV |
| `orders.user_id` | Mokshith | CSV |
| `orders.retailer_id` | lookup by `name` + `user_id=Mokshith` | DB join |
| `orders.retailer_name` | retailer_name | CSV |
| `orders.total_amount` / `subtotal` | sum of item_total per order | CSV #4 (matches CSV #3 totals) |
| `orders.order_date` / `created_at` / `updated_at` | order_date | CSV |
| `orders.status` | `'confirmed'` | fixed |
| `orders.sales_channel` | `'field'` | fixed |
| `order_items.order_id` | order_id | CSV #4 |
| `order_items.product_name`, `category`, `unit`, `quantity`, `rate`, `discount_amount`, `cgst_amount`, `sgst_amount`, `total` | from CSV #4 | direct |
| `order_items.product_id` / `variant_id` | resolved by name match on `products.name` / `product_variants` if findable; else NULL | best-effort lookup |

## What is NOT in the backup (will be left default/NULL)

- payment method, payment proof, credit details
- invoices, packing lists, delivery info (`delivery_status` stays `'pending'`)
- HSN code, original_rate
- visit_id (orders won't be linked to a visit record)

## Execution Plan

### Step 1 — Stage CSVs
Copy both CSVs into `supabase/functions/restore-mokshith-orders/` as JSON (`orders.json`, `items.json`).

### Step 2 — Edge function: `restore-mokshith-orders`
Service-role function that:
1. Loads JSON payloads.
2. Builds a `retailer_name → retailer_id` map by querying `retailers` for Mokshith.
3. Builds a `product_name → {product_id, hsn_code}` map by querying `products` (case-insensitive).
4. Inserts orders with `upsert({onConflict: 'id'})` — idempotent, safe to re-run.
5. Inserts order_items with `upsert({onConflict: 'id'})` using deterministic UUIDs derived from `order_id + product_name + idx` so re-runs don't duplicate.
6. Returns a JSON report: counts inserted, retailer/product names not matched, per-order totals reconciled vs CSV #3.

### Step 3 — Invoke once and verify
- Run function.
- Read back: `SELECT COUNT(*) FROM orders WHERE user_id = Mokshith` (expect 23) and `SELECT COUNT(*) FROM order_items WHERE order_id IN (...)` (expect 29).
- Spot-check 2–3 orders end-to-end in UI (`/visits/retailers` → order detail).

### Step 4 — Audit
Insert a `destructive_audit_log` entry (table already exists from prior hardening) recording: source = "user-uploaded backup CSVs #3 + #4", 23 orders + 29 items restored, actor = Mokshith profile, timestamp.

### Step 5 — Tell user about gaps
Surface clearly:
- Payment / invoice / delivery info is gone (not in backup).
- Any product names that didn't match `products` table → `product_id` left NULL (item still shows correctly in reports because product_name/rate/qty/total are stored on the row).

## Open question

Confirm and I'll switch to build mode to implement Steps 1–4.
