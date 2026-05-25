# Restore Missing Product Variants

## Root cause (verified)

- Backup CSV has **31** variants; DB has **26**. Exactly **5** rows are missing.
- The 5 missing variants match 1-to-1 with the 5 "missing product" names reported by the Mokshith order restore (`DAKSHIN 250G`, `ADUKU 250G`, `ELACHI 250G`, `VAYU 250G`, `BLUE 100G`).
- No backend/cron/trigger/edge-function deletes variants. Only three code paths can delete from `product_variants`:
  1. `executeDeleteVariant(id)` — single-row delete from Product Management UI
  2. `executeDeleteAllProducts()` — nukes everything (would have removed all 26)
  3. `migrateProducts()` in `productMigration.ts` — same, nukes everything
- Since only 5 rows are gone (not 26 or 0), this was **manual per-row deletion via the UI**, likely while pruning what looked like duplicates against the base products (`ADUKU 20G`, `DAKSHIN 30G`, `VAYU 30G`, `BLUE 20G`, `ELAICHI 40G`). No automatic deletion happened.

## Step 1 — Restore the 5 missing variants (idempotent INSERT)

Insert (via the database insert tool) only the rows whose `id` does not already exist in `product_variants`, using the exact values from the backup CSV so all existing references (orders, order_items.variant_id if any, schemes) remain intact:

```text
0bc4a82f-4ef1-4ae6-b8af-a413470a3fdf  ADUKU 250G   Adu250   342.86  product_id 7f9e8802…  hsn 90230
214f989c-3f6c-4f4e-9576-575d746834b0  ELACHI 250G  Ela250   314.29  product_id b7fbd116…  hsn 90230
9465d743-501a-4871-9d41-6cc248cfe211  DAKSHIN 250G Dak250   209.52  product_id b26b2c73…  hsn 90230
53b8017d-955d-4bb9-899b-01b045baaffb  VAYU 250     vay250   209.52  product_id 2f5fc10b…  hsn (none)
6db0d8e3-dce3-4fca-88a4-cae6236ded09  BLUE 100G    Blue100  333.33  product_id 44aec890…  hsn 90230
```

Use `INSERT ... ON CONFLICT (id) DO NOTHING` so re-running is safe. `is_active=true`, `stock_quantity=0`, discounts/focused fields default as in the CSV.

## Step 2 — Backfill `order_items.product_id` for the restored orders

The restore of Mokshith's orders left `product_id = NULL` for line items where these 5 names didn't resolve. After Step 1, update those rows:

```sql
UPDATE order_items oi
SET product_id = pv.product_id, hsn_code = COALESCE(oi.hsn_code, '90230')
FROM product_variants pv
WHERE oi.product_id IS NULL
  AND lower(trim(oi.product_name)) = lower(trim(pv.variant_name))
  AND oi.order_id IN ( /* the 23 restored Mokshith order ids */ );
```

This keeps the historical line items pointing at real catalog rows.

## Step 3 — Guard against silent variant deletion

Update `src/components/ProductManagement.tsx` so the per-variant Delete button routes through `useDeleteConfirm` (already used elsewhere in the project) with:
- A typed confirmation ("DELETE") for variants that have any historical `order_items` referencing them
- An impact line: "This variant is used in N past orders. Deleting it will not remove the orders but will break catalog linkage."
- Keep the "Delete All Products" button gated behind the same typed confirmation it already uses.

No schema change — only a UI-level confirmation tightening. This is the smallest, safest change that prevents a repeat without removing admin capability.

## Step 4 — Verify

- `SELECT count(*) FROM product_variants` → expect **31**
- `SELECT count(*) FROM order_items WHERE product_id IS NULL AND order_id IN (…23 ids…)` → expect **0**
- Open Product Management page → 5 variants reappear under their parent products
- Open one of Mokshith's restored orders → line items show product link, not just text

## Out of scope

- No edge function changes, no migrations, no RLS changes (none are needed — there is no automated deleter).
- The unrelated `productMigration.ts` "wipe everything" utility is left alone; only the per-variant UI delete is hardened.
