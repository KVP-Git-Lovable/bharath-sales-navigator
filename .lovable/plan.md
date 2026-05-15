# Fix: "column order_id does not exist" — Restore order_items.order_id

## Root cause

The `public.order_items` table is missing its `order_id` column. Every order sync goes through the `sync_order_with_items` RPC, which inserts into `order_items (order_id, …)`. With the column gone, every insert errors with `column "order_id" does not exist` — exactly what the Sync Progress sheet shows ("Retry #4 · Unknown: column \"order_id\" does not exist").

This also explains why orders worked fine on May 11: `order_id` existed then. It was dropped some time after, during the recent invoice-related changes.

Confirmed by inspection:
- `order_items` columns today: `id, product_name, category, rate, unit, quantity, total, created_at, original_rate, discount_amount, hsn_code, sgst_amount, cgst_amount, variant_id, product_id` — no `order_id`.
- Constraints today: only `pkey` on `id` and FK on `variant_id`. No FK to `orders` exists.
- RPC `sync_order_with_items` still references `order_items.order_id` everywhere (insert and the existence check).

## What the fix does

Single migration that restores the column and the relationship, with no other behavior changes:

```sql
ALTER TABLE public.order_items
  ADD COLUMN order_id uuid;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items(order_id);
```

After this:
- The queued offline order in your Sync Progress sheet will succeed on the next "Sync Now" tap.
- New orders save normally (the working May-11 behavior is restored).
- Invoice generation is untouched — that lives on the `invoices` table.

## About the 4,785 existing order_items rows

They currently have no link back to their parent order (the column didn't exist while they were inserted). After the migration, their new `order_id` will be NULL. We do **not** try to guess/repair those — there is no reliable signal to match them, and inventing links could corrupt invoices or analytics. They remain in the table as-is; only newly synced orders will have a proper link going forward.

If you later confirm a backup is available with the original `order_id` values, we can run a one-off restore from that backup. That's a separate task and not part of this fix.

## Verification steps

1. Apply the migration.
2. Open Sync Progress → tap "Sync Now". The retrying order ("B M general store · ₹960") should clear.
3. Create a fresh order from order entry — it should save without the "order_id" error.
4. Confirm Pay Now invoice flow still works (unchanged path).

## No frontend changes needed

The app code already sends `order_id` on every item (see `src/utils/offlineOrderUtils.ts` line 56–59). The mismatch is purely on the database side.
