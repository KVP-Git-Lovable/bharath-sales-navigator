## Why some orders still show "0 items"

After the previous backfill, **150 items remained orphaned**. Looking at the orders in your screenshot:

- **Ansar - Mulky (S)** — ₹36,230, created `07:17:55` — its items were inserted at `07:21:29` (3m 34s **after** the order). Sum of those orphan items = ₹36,230 (matches `subtotal` exactly).
- **Amazon Orders** — ₹396, created `07:08:59` — its item was inserted at `07:11:28` (2m 29s **after** the order). Item total = ₹396 (matches).

The previous backfill matched each orphan item to the most recent order created **within 120 seconds before** the item. That works when items are inserted right after their order (online flow). But when the device is **offline**, the order row syncs first, then the items get pushed minutes later — so items end up with a `created_at` that is **after** the order, not before. The earlier query never considered that direction, so these stayed orphaned.

The other "Office" orders that are showing items correctly (Punith Rai, Suresh Kudrolli, Sunny General) had their items synced quickly enough to fall inside the original window, which is why the same user's other orders look fine.

## Fix — second backfill pass (data-only, no app code changes)

Run one more migration that:

1. For each remaining `order_items` row where `order_id IS NULL`, pick the candidate order whose `created_at` is closest to the item's `created_at` within a **±15-minute window** (covers offline sync delays without being reckless).
2. Group those tentative assignments and verify `SUM(items.total)` for the group equals the candidate order's `subtotal` within ±₹1 (same reconciliation rule as before).
3. Only commit `order_id` for groups that pass the subtotal check. Skip groups that don't reconcile (leave them orphaned for manual review).
4. Wrap in a single transaction. Report `relinked_items`, `relinked_orders`, and `still_orphan` counts.

### Safety guarantees

- Touches only rows where `order_id IS NULL`. No existing link is ever overwritten.
- Subtotal-equality check guarantees mathematically correct grouping (same rule that worked for the 4,645 items already relinked).
- Frontend code (`Operations.tsx`, `sync_order_with_items` RPC, invoice flow) is **not modified** — the bug is purely missing historical links, not logic.

### Expected outcome

- Ansar Mulky and Amazon Orders entries in the screenshot will show their real item counts and amounts.
- The remaining ~150 orphan items should drop to a much smaller number (only items whose order was deleted or whose totals genuinely don't reconcile).
- New orders going forward already work — they have `order_id` set at insert time via the RPC.

## Technical details

```text
WITH candidates AS (
  SELECT oi.id AS item_id,
         o.id  AS order_id,
         o.subtotal,
         oi.total,
         ABS(EXTRACT(EPOCH FROM (oi.created_at - o.created_at))) AS gap_sec
  FROM order_items oi
  JOIN LATERAL (
    SELECT id, subtotal, created_at
    FROM orders o2
    WHERE ABS(EXTRACT(EPOCH FROM (o2.created_at - oi.created_at))) <= 900  -- ±15 min
    ORDER BY ABS(EXTRACT(EPOCH FROM (o2.created_at - oi.created_at)))
    LIMIT 1
  ) o ON true
  WHERE oi.order_id IS NULL
),
groups AS (
  SELECT order_id, SUM(total) AS items_sum, MAX(subtotal) AS order_subtotal
  FROM candidates
  GROUP BY order_id
),
valid AS (
  SELECT order_id FROM groups WHERE ABS(items_sum - order_subtotal) <= 1
)
UPDATE order_items oi
SET order_id = c.order_id
FROM candidates c
WHERE oi.id = c.item_id
  AND c.order_id IN (SELECT order_id FROM valid)
  AND oi.order_id IS NULL;
```

Migration file would be created under `supabase/migrations/` with this query plus a final `SELECT COUNT(*) FILTER (WHERE order_id IS NULL)` for verification logging.

No frontend or RPC changes.
