## Problem

The Scheme Master page crashes with "Something went wrong" and the schemes tab shows "Failed to fetch data". Console error:

```
column products.unit does not exist
```

## Root cause

`src/components/SchemeMaster.tsx` queries a `unit` column on `products`, but the actual column in the database is `base_unit`. Both the direct products query and the nested join via `product_variants` fail, which throws and triggers the error boundary (same error appears when adding a scheme because the same fetch runs).

## Fix

Update `src/components/SchemeMaster.tsx` to use `base_unit`:

- Line 203 — change `select('id, sku, name, description, category_id, rate, unit, is_active')` to use `base_unit`.
- Line 219 — change nested select `product:products!product_id(name, category_id, unit)` to `base_unit`.
- Lines 234 and 246 — read `p.base_unit` / `v.product?.base_unit` when mapping into the `unit` field of the local `Product` type (keep the local field name `unit` so the rest of the component is unaffected).

No schema change, no other files affected.
