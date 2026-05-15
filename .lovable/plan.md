# Fix: Backfill missing `order_items.order_id` so Items count and invoice linkage work

## What you're seeing

On the Operations list every row shows "0 items" and the invoice download is broken. The schema is now correct (`order_items.order_id` was restored in the previous migration), but **4,785 historical item rows still have `order_id = NULL`** because they were inserted during the period when the column didn't exist. Without a link, the UI can't count items per order and invoices can't pull line items.

Confirmed:
- `order_items` total = 4,792, with `order_id` set = **7** (only the brand-new ones).
- `order_items` orphan rows span **2025-10-24 → 2026-05-15** — exactly the window since the column was dropped.
- 99.3% of orphans can be matched to an order whose `created_at` is within seconds of the item's `created_at`.

## Why we can recover them

Every order is created via the `sync_order_with_items` RPC, which inserts the order row first, then the items in the same transaction. So:
- Each item's `created_at` is a few milliseconds **after** its parent order's `created_at`.
- The "most recent order created at or just before the item" is reliably the parent.

We will use that pairing, plus a **total-sum cross-check**: only commit a backfilled link when `SUM(items.total)` for that candidate order matches the order's `total_amount` (within ₹1 to absorb rounding). Anything that doesn't match cleanly stays NULL and will be reported.

## The fix (run as one transaction)

```sql
BEGIN;

-- 1. Tentatively assign each orphan item to the most recent order
--    created at or just before it.
WITH guesses AS (
  SELECT
    oi.id AS item_id,
    (SELECT o.id
       FROM public.orders o
      WHERE o.created_at <= oi.created_at + interval '2 seconds'
        AND o.created_at >= oi.created_at - interval '120 seconds'
      ORDER BY o.created_at DESC
      LIMIT 1) AS guessed_order_id
  FROM public.order_items oi
  WHERE oi.order_id IS NULL
),
-- 2. Verify: only accept if total_amount matches
verified AS (
  SELECT g.item_id, g.guessed_order_id
  FROM guesses g
  JOIN public.order_items oi ON oi.id = g.item_id
  JOIN public.orders o ON o.id = g.guessed_order_id
  WHERE g.guessed_order_id IS NOT NULL
),
-- 3. Group by order and check sum
order_sums AS (
  SELECT
    v.guessed_order_id AS order_id,
    SUM(oi.total) AS items_sum,
    o.total_amount AS order_total
  FROM verified v
  JOIN public.order_items oi ON oi.id = v.item_id
  JOIN public.orders o ON o.id = v.guessed_order_id
  GROUP BY v.guessed_order_id, o.total_amount
),
good_orders AS (
  SELECT order_id FROM order_sums
  WHERE abs(items_sum - order_total) <= 1
)
UPDATE public.order_items oi
   SET order_id = v.guessed_order_id
  FROM verified v
 WHERE oi.id = v.item_id
   AND v.guessed_order_id IN (SELECT order_id FROM good_orders);

-- 4. Report what's still unlinked
SELECT count(*) AS still_orphan FROM public.order_items WHERE order_id IS NULL;

COMMIT;
```

After this:
- Every order whose item totals reconcile gets its items back → "0 items" pills become real counts on Operations.
- Invoices that join through `order_id` start finding line items again.
- Any unrecovered items (mismatched totals or no nearby order) remain NULL — they're safe; nothing references them.

## Why this is safe

- It only **sets** NULL `order_id` values; it never overwrites a non-NULL link.
- The total-sum check guarantees we only attach an item set whose math equals the order's recorded `total_amount`. A wrongly-grouped set won't match and is rejected for that whole order.
- Wrapped in a single transaction — if anything errors, nothing changes.

## Verification steps

1. Apply the backfill.
2. Refresh `/operations` — item counts should appear on most rows.
3. Open one of the affected orders → confirm line items + invoice download both work.
4. The query reports `still_orphan` count — we'll review whether a second pass with a wider window is worth it.

## Not changing

- No frontend code touched.
- No schema changes (column already exists from the previous migration).
- The `sync_order_with_items` RPC and invoice flow are untouched — they already work correctly for new orders.
