

# Atomic Order Cancellation — Refined Plan

## 4 Refinements Applied

### 1. Gamification reversal strictly by order_id
The current `removeGamificationPoints` matches by `retailer_id + date range` — this can reverse points from unrelated orders on the same day. The RPC will query `gamification_points` using `reference_id = order_id` only. A fallback for legacy points (pre-fix, stored with `retailer_id` as `reference_id`) will use the old date+retailer match but only if no order-linked points are found.

### 2. Credit ledger trigger uses incremental update
Instead of `SELECT SUM(amount) FROM credit_ledger` on every insert (expensive as ledger grows), the trigger will do:
```sql
UPDATE retailers
SET pending_amount = GREATEST(0, COALESCE(pending_amount, 0) + NEW.amount)
WHERE id = NEW.retailer_id;
```
This adds the entry's amount directly (negative for reversals), avoiding a full table scan.

### 3. Visit completion_source flag
Currently there is no way to know *why* a visit became `productive`. We add a `completion_source` column to the `visits` table:
- `'order'` — set when an order makes the visit productive
- `'manual'` — set when a rep independently marks visit complete
- `'check_in'` — set on check-in based completion

The RPC only reverts visit status to `planned` when `completion_source = 'order'` AND no other confirmed orders exist for that visit. If `completion_source` is `'manual'` or `'check_in'`, the visit stays as-is even if the order is cancelled.

### 4. No DELETE on sequence/tracking — use update/reversal
Current code deletes `gamification_retailer_sequences` rows when count reaches 0, and deletes `gamification_daily_tracking` rows when count reaches 1. Instead:
- **Sequences**: Set `consecutive_orders = GREATEST(0, consecutive_orders - 1)` — never delete
- **Daily tracking**: Set `count = GREATEST(0, count - 1)` — never delete
This preserves history and avoids orphaned references.

---

## Implementation

### Migration (single file)

**Tables:**
- `credit_ledger` — retailer_id, amount, type, reference_id, created_by, created_at
- `order_cancellation_log` — order_id, reason, cancelled_by, cancelled_at, reversal_summary (JSONB)
- `ALTER TABLE visits ADD COLUMN completion_source TEXT` — values: `'order'`, `'manual'`, `'check_in'`

**Trigger:** `credit_ledger_sync_pending_amount` — incremental:
```sql
UPDATE retailers
SET pending_amount = GREATEST(0, COALESCE(pending_amount, 0) + NEW.amount)
WHERE id = NEW.retailer_id;
```

**RPC:** `cancel_order_atomic(p_order_id UUID, p_reason TEXT, p_cancelled_by UUID)` returns JSONB

Transaction flow:
1. `SELECT ... FOR UPDATE` on order row (row lock)
2. If already `cancelled` → return `{already_cancelled: true}`
3. If status not in `('confirmed','pending')` → return error
4. Update order status to `cancelled` with metadata
5. Update linked invoices to `cancelled`
6. If credit order: INSERT into `credit_ledger` with negative amount (trigger handles `pending_amount`)
7. Recalculate `last_order_date` from remaining confirmed orders
8. Visit: only revert if `completion_source = 'order'` AND no other confirmed orders for that visit
9. Gamification: INSERT negative point entries matching by `reference_id = order_id, reference_type = 'order'` (fallback: retailer+date for legacy)
10. Loyalty: INSERT negative point entries matching by `reference_id = order_id`
11. Sequences: `UPDATE SET consecutive_orders = GREATEST(0, consecutive_orders - 1)` — no delete
12. Daily tracking: `UPDATE SET count = GREATEST(0, count - 1)` — no delete
13. INSERT into `order_cancellation_log` with full reversal summary
14. Return JSONB summary

RLS on new tables: authenticated users can SELECT their own rows.

### Frontend: `src/utils/orderCancellation.ts`

Replace the 12-step orchestrator with:
1. Client-side `validateCancellable` for fast UI feedback
2. `supabase.rpc('cancel_order_atomic', { p_order_id, p_reason, p_cancelled_by })`
3. Handle `already_cancelled`, `success`, `error` responses
4. `clearLocalCaches()` for frontend cache invalidation

### Frontend: Set `completion_source` on order creation

Update the order creation flow to set `completion_source = 'order'` on the visit when marking it productive due to an order. This needs a small update in the order placement logic.

### Analytics query fixes (whitelist pattern)

Add `.eq('status', 'confirmed')` (or `.in('status', ['confirmed', 'delivered'])`) to:
- `src/pages/Analytics.tsx` ~line 370
- `src/pages/TerritoryDetail.tsx` ~line 238
- `src/pages/Attendance.tsx` ~line 944
- `src/pages/GPSTrack.tsx` ~line 284
- `src/pages/MyBeats.tsx` ~line 898

---

## Files Modified
- **New migration** — `credit_ledger`, `order_cancellation_log`, `visits.completion_source`, trigger, RPC, RLS
- **`src/utils/orderCancellation.ts`** — Replace with single RPC call + cache cleanup
- **Order creation flow** — Set `completion_source = 'order'` on visit
- **5 page files** — Whitelist status filter on order queries

