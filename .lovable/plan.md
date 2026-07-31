## Confirmed: `products.base_unit` really is gone

Verified against the live database — `public.products` currently has `unit`, `base_unit_category`, `conversion_factor`, `rate`, but **no `base_unit` column**. That is exactly why PostgREST returns `column products.base_unit does not exist` (42703), and why the product list in Order Entry comes back empty.

**How it was dropped:** statement history shows

```text
ALTER TABLE public.products DROP COLUMN base_unit CASCADE
```

It carries no Management-API source comment (unlike the earlier `DROP COLUMN rate`, which was tagged `pat:3894160`), and its `CASCADE`/`RESTRICT` phrasing matches the Supabase **Dashboard Table Editor** "delete column" action. Two sibling drops from the same tool — `product_variants.product_id RESTRICT` and `retailers.beat_name RESTRICT` — were already re-added; only `products.base_unit` is still missing. `CASCADE` also means anything that depended on the column (views, generated columns) was dropped with it.

**Why order placement breaks:** the product fetches select the whole row or an explicit picker column list that includes `base_unit`:
- `src/hooks/useMasterDataCache.ts` (`PRODUCT_PICKER_COLUMNS`) — feeds the Order Entry / Cart product picker
- `src/hooks/useOfflineOrderEntry.ts` — offline product cache (`ProductRow.base_unit`)
- `src/utils/exportProductsMaster.ts` — explicit `..., rate, base_unit, ...` select
- plus display/UOM consumers: `OrderEntry.tsx`, `Cart.tsx`, `TableOrderForm.tsx`, `resolveProduct.ts`, `uomEngine.ts`, invoice generators, `ProductManagement.tsx`, product import.

A single failing column in the picker query makes the whole request 400, so no products render and no order can be placed.

## Plan

### 1. Restore the column (migration)
```sql
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_unit text;
```
Idempotent, nullable — matches how `product_variants.base_unit` is defined and how the code reads it (optional string).

### 2. Backfill sensible values
No data survived the drop, so repopulate deterministically:
- Set `base_unit` from the product's **base UOM in `product_uom_mapping`** (`is_base = true` → `uom_master.code`) where a mapping exists — this is the authoritative source.
- Otherwise fall back to `products.unit`, and to `'Piece'` when both are empty.
- Only fill rows where `base_unit IS NULL`; no blanket overwrite.

### 3. Verify end to end
- Confirm the column exists and every product has a non-null `base_unit`.
- Reload Order Entry and check the product picker populates and a line item can be added; confirm no `42703` in the Postgres logs.
- `schemaHealthCheck.ts` already probes `products.rate` / `products.unit` — add `products.base_unit` to that probe list so a future drop shows the banner instead of an empty picker.

### 4. Prevent recurrence
Add a Postgres **event trigger** that blocks `ALTER TABLE ... DROP COLUMN` on `products`, `product_variants`, `orders`, `order_items`, and `retailers`. This is the third columns-dropped incident on these tables (rate, product_id, beat_name, base_unit) and the drops are coming from the Dashboard Table Editor / a Management-API token, both of which bypass migrations and review. The trigger raises a clear error telling the operator to go through a migration instead.

## Technical notes
- Evidence: `information_schema.columns` for the current shape, `extensions.pg_stat_statements` for the DDL text (DDL isn't in `postgres_logs` because statement logging is off).
- No application code needs changing for the fix itself — the code already expects `base_unit`; step 3's health-check addition is the only source edit.
