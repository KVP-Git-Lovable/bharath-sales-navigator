# Permanent fix: restore variant↔product link

## Root cause
`product_variants` table is missing the `product_id` column. The frontend filters variants with `v.product_id === product.id` — since that field doesn't exist on any row, **zero variants attach to any product** for every user. RLS is fine; the schema is broken.

This is a **pure database fix** — no app code changes, no rebuild, no APK redeploy. Once the column is added and backfilled, every existing user (web + installed app) will see all variants automatically on their next product cache refresh (~30s).

## Migration steps

**1. Add the column + index**
```sql
ALTER TABLE public.product_variants
  ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
```

**2. Backfill all 20 orphan variants** by matching brand keyword in `variant_name` to the existing base products:

| Variant names                                  | Linked to base product |
|------------------------------------------------|------------------------|
| ADUKU 100G / 250G / 500G                       | ADUKU 20G              |
| BLUE 100G / 250G / 500G                        | BLUE 20G               |
| GOLD 1KG / Gold 250G / GOLD 500G               | GOLD 40G               |
| YELLOW 100G / 250G / 500G / Yellow 1Kg / Yellow 40G | YELLOW 20G        |
| RL JAR 1KG / RL JAR 500G                       | RL JAR 250             |
| DAKSHIN 250G                                   | DAKSHIN 30G            |
| VAYU 250G                                      | VAYU 30G               |
| ELACHI 250G                                    | ELAICHI 40G            |
| ADARAK 250G                                    | ADRAK 40G              |

(RL POUCH 250G and DAKSHIN GOLD HORECA stay base-only — they have no variants in the table.)

**3. Verify**
```sql
SELECT count(*) FROM product_variants WHERE product_id IS NULL;  -- expect 0
```
Then reload Order Entry → each base product expands to show its full variant list.

## Why no code/app change is needed
- `useOfflineOrderEntry.ts` and `TableOrderForm.tsx` already read `product_id` from variants — they always did. The schema just needs the column back.
- IndexedDB cache auto-refreshes from Supabase on next open (background sync within 30s). No reinstall, no rebuild.
- All existing users — including those on the installed Android app — will pick up the fix on their next online product fetch.

Confirm and I'll run the migration.
