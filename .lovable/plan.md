## Goal
Restore the missing `order_items.rate` column so offline order sync stops failing with `column "rate" of relation "order_items" does not exist`.

## Verified state
- `public.order_items` currently has **no `rate` column** (confirmed via information_schema).
- `original_rate` column exists and is populated for **6,643 / 6,651** rows (8 rows are NULL — these will fall back to the `DEFAULT 0`).
- Triggers and the `sync_order_with_items` function reference `NEW.rate` — they will work as soon as the column exists again.
- No application code changes needed; frontend already writes `rate` in the insert payload.

## Migration (single statement block)
```sql
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS rate numeric NOT NULL DEFAULT 0;

UPDATE public.order_items
  SET rate = original_rate
  WHERE original_rate IS NOT NULL
    AND rate = 0;
```

## Post-migration verification
1. `SELECT COUNT(*) FROM order_items WHERE rate = 0;` — expect ~8 (the rows whose `original_rate` was NULL).
2. Retry the stuck "Satish kirana – ₹640.00" sync item from the Sync Progress drawer; expect success.
3. Spot-check 3 recent orders: `rate * quantity` ≈ `total` (minus discount).

## Out of scope
- No changes to `sync_order_with_items`, `trg_apply_event_stock_after_order_items`, or any code file.
- Not adding `retailer_price` (separate prior decision).
- Not touching the 8 NULL `original_rate` rows beyond the `0` default — flag for user only if verification shows they're recent/active orders.