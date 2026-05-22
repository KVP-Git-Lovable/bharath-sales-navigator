# Sardar Order Items — DB Verification & Backfill Plan

## What I checked

**CSV file** (`Supabase_Snippet_Per-User_Order_Summary.csv`, 632 rows):
- 480 distinct `order_id` values, all under user `6220fc85…fb0` (Sardar)
- 620 rows carry product details, 12 rows have `product=null / kg=null` (i.e. 12 orders are header-only even in the CSV)
- 21 distinct product names, total qty ≈ **1,323,613 g (≈ 1,323.6 kg)**, total item value ≈ **₹406,220**

**DB current state for Sardar (user `6220fc85…fb0`)**:
- `orders` rows: **481** (478 confirmed + 3 cancelled)
- `orders` with `order_items` rows: **1**  →  **480 orders have zero line items**
- Spot-checked 10 random CSV order_ids → **all 10 exist in `orders` as Sardar's orders, all 10 have 0 items**

So the CSV is the missing line-item source for 480 historic orders.

## Mismatches found

1. **`orders.total_amount` ≠ Σ `item_total` in CSV** (e.g. order `ae60e434` total=₹3,180 vs CSV sum ₹3,028.56; `3c3ab2fa` total=₹880 vs CSV ₹838.08). The header totals are rounded/different. Plan: **do NOT overwrite `orders.total_amount`** — only insert items. We'll flag the gap but leave the header totals untouched (they're what the user has been seeing in Analytics for ₹).

2. **CSV product names don't match the `products` master directly** — they map cleanly to **`product_variants`** instead:

   | CSV product | Maps to | variant/product id |
   |---|---|---|
   | DAKSHIN 250G | variant of DAKSHIN 30G | `9465d743-…` |
   | ADUKU 250G | variant of ADUKU 20G | `0bc4a82f-…` |
   | VAYU 250G / VAYU 250 | variant of VAYU 30G ("VAYU 250") | `53b8017d-…` |
   | ELACHI 250G | variant of ELAICHI 40G | `214f989c-…` |
   | ELACHI 40G | base product ELAICHI 40G | `b7fbd116-…` |
   | ELAICHI 40G | base product ELAICHI 40G | `b7fbd116-…` |
   | ADUKU 20G | base product ADUKU 20G | `7f9e8802-…` |
   | RL POUCH 250G | base product RL POUCH 250G | `6dbf027a-…` |
   | DAKSHIN 30G | base product DAKSHIN 30G | `b26b2c73-…` |
   | Gold 250G | variant of GOLD 40G | `43d7fd45-…` |
   | GOLD 1KG | variant of GOLD 40G | `5ab5a8e1-…` |
   | DAKSHIN GOLD (HORECA) | base product | `73fa608c-…` |
   | DAKSHIN SPL 250 | variant of DAKSHIN 30G | `d9154444-…` |
   | BLUE 100G | variant of BLUE 20G | `6db0d8e3-…` |
   | BLUE 250G | variant of BLUE 20G | `43cbda3e-…` |
   | RL JAR / RL JAR 250G | base product RL JAR 250 | `7b9cf8c9-…` |
   | ADARAK 250G | variant of ADRAK 40G | `722594f5-…` |
   | ADARAK 40G | base product ADRAK 40G | `f69e969b-…` |
   | Yellow 1Kg | variant of YELLOW 20G | `3b0f2ca9-…` |

   All 21 CSV product names resolve. ✓ Zero unmapped products.

## Proposed backfill

Insert **620 rows** into `order_items` from the 620 CSV rows that have a product. Field mapping per row:

| order_items column | Value |
|---|---|
| `order_id` | CSV `order_id` |
| `product_name` | CSV `product_name` (kept as-is for display) |
| `product_id` | base product id (from mapping above) |
| `variant_id` | variant id when row is a variant, else NULL |
| `quantity` | CSV `kg` value (already integer **grams** — matches the one existing Sardar order which also stored grams as integer) |
| `unit` | `'grams'` |
| `rate` | `item_total / (kg/1000)` (per-kg price, matches existing convention) |
| `original_rate` | same as `rate` |
| `total` | CSV `item_total` |
| `category` | `''` (column NOT NULL but no category info in CSV — empty string, same as existing legacy rows) |
| `hsn_code` | `'90230'` (constant across all current products) |
| `sgst_amount`, `cgst_amount`, `discount_amount` | `0` |

The 12 CSV rows with `product=null` are skipped (those 12 orders remain header-only — no source data exists for their items).

After backfill, expected DB state for Sardar:
- 481 orders, **468 with items** (480 in CSV − 12 null), 13 still header-only (12 from CSV + the 1 pre-existing was already itemised — net 13 header-only).
- Analytics "Total KG" for Sardar will jump from 5 kg → ~1,323 kg.

## Safety

- All `orders.total_amount` values stay untouched.
- All `orders` header rows stay untouched (no UPDATE/DELETE on `orders`).
- Pure INSERT into `order_items` for orders that currently have **zero** items (we'll add a `NOT EXISTS` guard so re-running is idempotent).
- The 1 pre-existing itemised order is automatically skipped.

## Confirm before I execute

Reply **"proceed"** and I'll run the migration that:
1. Creates a temporary staging table from the CSV (uploaded as VALUES inside the migration).
2. Inserts 620 `order_items` rows with the mapping above, guarded by `WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = staging.order_id)`.
3. Drops the staging table.

Or tell me to change anything (e.g. update `orders.total_amount` to match CSV sums, treat `kg` as kg instead of grams, skip certain products).
