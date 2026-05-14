## Root cause (confirmed from DB + code)

Every order created since this morning saves the **header** but **0 items**. Two independent breakages, both schema-related:

**1. `order_items` table is missing `product_id` (and `variant_id`)**

Actual columns today:
`id, order_id, product_name, category, rate, unit, quantity, total, original_rate, discount_amount, hsn_code, sgst_amount, cgst_amount, created_at`

But `src/pages/Cart.tsx` (line ~880) builds each item with a `product_id` field and pushes it to `submitOrderWithOfflineSupport`. When that payload reaches the DB, Postgres rejects the insert with "column product_id does not exist", the items array is dropped, and only the order header survives → "0 items".

**2. RPC `public.sync_order_with_items` is using stale column names**

The function inserts `(order_id, product_id, product_name, variant_name, quantity, price, total, scheme_discount, scheme_name, category_id, hsn_code)` — none of `product_id`, `variant_name`, `price`, `scheme_discount`, `scheme_name`, `category_id` exist on `order_items`. So even after we add `product_id`, the RPC still fails on every call. The fallback path in `useOfflineSync.ts` then runs and hits the same wall.

This is why earlier orders (before today 06:37 UTC) have items but every order after is empty — the schema drifted away from what the RPC and the cart payload expect.

## Fix (database only — no app code change, no rebuild)

**Step 1 — Add the missing link columns to `order_items`**
```sql
ALTER TABLE public.order_items
  ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;

CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX idx_order_items_variant_id ON public.order_items(variant_id);
```

Both nullable + `ON DELETE SET NULL` so historical rows (which never had a product_id) and future product deletions don't break invoices.

**Step 2 — Rewrite `sync_order_with_items` to match the real `order_items` schema**

Insert columns become:
`order_id, product_id, product_name, category, rate, unit, quantity, total, original_rate, discount_amount, hsn_code, sgst_amount, cgst_amount`

Pulled out of the JSONB items the cart already sends — no client change needed. The `unique_violation` exception handler stays. The "order exists but has no items" branch gets the same column list so retries also recover correctly.

**Step 3 — Backfill the 17 broken orders from today**

For each empty order in `orders` that has `total_amount > 0`, we cannot reconstruct line items from thin air — the cart payload was lost. Two options I'll surface to you before running anything destructive:

- **3a (recommended):** leave the 17 empty orders as-is so finance/audit still sees the header + total, and ask the salespeople to re-enter only those specific orders. Future orders (from the moment the migration runs) save correctly.
- **3b:** delete the 17 empty orders entirely so users can re-enter cleanly without duplicate totals.

I'll wait for your call on 3a vs 3b.

**Step 4 — Verify**
```sql
-- After the next order is placed:
SELECT o.id, o.created_at, count(oi.*) AS items
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.created_at > now() - interval '10 min'
GROUP BY o.id ORDER BY o.created_at DESC;
-- Expect items > 0 for every new order.
```

## Why no frontend rebuild

- `Cart.tsx` already sends every column the new schema expects (`product_id`, `product_name`, `category`, `rate`, `unit`, `quantity`, `total`, `original_rate`, `discount_amount`, `hsn_code`, `sgst_amount`, `cgst_amount`).
- The RPC is server-side — fixing it instantly fixes web + installed Android app users on their next order.
- No APK redeploy, no service-worker invalidation needed.

Confirm **3a or 3b** for the 17 stranded orders and I'll run the migration.
