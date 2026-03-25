

# Atomic Order Cancellation — Improved Plan with Ledger, Audit & Edge Cases

## Summary of Improvements (from your feedback)

Your 6 points are valid. Here is how each maps into the revised plan:

| Your Point | Action |
|---|---|
| 1. Credit Reversal via Ledger | New `credit_ledger` table; balance = SUM of entries |
| 2. Gamification Reversal (not Delete) | INSERT negative points instead of DELETE |
| 3. Visit Status edge case | Only revert if visit was marked productive *solely because of the order* |
| 4. Analytics: use `.eq('confirmed')` not `.neq('cancelled')` | Whitelist approach across all queries |
| 5. Double cancellation guard | `SELECT ... FOR UPDATE` + status check, return `already_cancelled` |
| 6. Cancellation audit log | New `order_cancellation_log` table |

---

## Database Changes (Migration)

### New Table: `credit_ledger`
```text
credit_ledger
  id          UUID PK
  retailer_id UUID FK → retailers
  amount      NUMERIC (positive = credit added, negative = reversal)
  type        TEXT ('order_credit', 'order_cancel', 'payment', 'adjustment')
  reference_id UUID (order_id or payment_id)
  created_by  UUID
  created_at  TIMESTAMPTZ DEFAULT now()
```
RLS: Users can SELECT/INSERT their own entries. Balance is always `SELECT SUM(amount) FROM credit_ledger WHERE retailer_id = X`.

The `retailers.pending_amount` column becomes a **computed cache** — updated by a trigger on `credit_ledger` inserts for fast reads, but the ledger is the source of truth.

### New Table: `order_cancellation_log`
```text
order_cancellation_log
  id              UUID PK
  order_id        UUID FK → orders
  reason          TEXT
  cancelled_by    UUID
  cancelled_at    TIMESTAMPTZ DEFAULT now()
  reversal_summary JSONB (credit reversed, points reversed, visit reverted, etc.)
```
RLS: Users can SELECT their own entries.

### RPC: `cancel_order_atomic(p_order_id, p_reason, p_cancelled_by)`

Single PL/pgSQL function wrapping everything in one transaction:

```text
1. SELECT order FOR UPDATE (row lock)
2. IF status = 'cancelled' → RETURN {already_cancelled: true}
3. IF status NOT IN ('confirmed','pending') → RETURN {error}
4. UPDATE orders → status='cancelled', cancelled_at, cancellation_reason, cancelled_by
5. UPDATE invoices → status='cancelled' WHERE order_id = p_order_id
6. IF credit order:
   INSERT INTO credit_ledger (retailer_id, amount, type, reference_id)
   VALUES (retailer_id, -credit_amount, 'order_cancel', order_id)
   — trigger auto-updates retailers.pending_amount
7. Recalculate last_order_date from remaining confirmed orders
8. Visit logic:
   IF visit exists AND visit.status = 'productive'
   AND visit was NOT checked-in independently (check if visit has check_in_time but order was the only reason for productive)
   AND no other confirmed orders for this visit
   → UPDATE visit SET status = 'planned'
9. INSERT INTO gamification_points (user_id, points, action_id, reference_id, reference_type)
   VALUES (user_id, -original_points, action_id, order_id, 'order_reversal')
   — negative entry, not a delete
10. INSERT INTO retailer_loyalty_points with negative points (same pattern)
11. Decrement gamification sequences and daily tracking
12. INSERT INTO order_cancellation_log (order_id, reason, cancelled_by, reversal_summary)
13. RETURN jsonb summary
```

Any failure → automatic ROLLBACK. Nothing changes.

### Trigger: `credit_ledger_sync_pending_amount`

After INSERT on `credit_ledger`:
```sql
UPDATE retailers
SET pending_amount = (
  SELECT COALESCE(SUM(amount), 0) FROM credit_ledger WHERE retailer_id = NEW.retailer_id
)
WHERE id = NEW.retailer_id;
```

This keeps `retailers.pending_amount` in sync while the ledger remains the source of truth.

---

## Frontend Changes

### Refactor `src/utils/orderCancellation.ts`

Replace the 12-step orchestrator with:
1. Client-side validation (`fetchOrderWithDetails` + `validateCancellable`) for fast UI feedback
2. Single `supabase.rpc('cancel_order_atomic', {...})` call
3. Handle response: `already_cancelled`, `success`, or `error`
4. `clearLocalCaches()` stays client-side (cache invalidation + event dispatch)

### Fix Analytics Queries — Whitelist Pattern

Change all order queries in analytics/reporting pages from `.neq('status', 'cancelled')` to `.eq('status', 'confirmed')` (or `.in('status', ['confirmed', 'delivered'])` where delivered orders should count):

- **`src/pages/TerritoryDetail.tsx`** ~line 238 — add `.eq('status', 'confirmed')`
- **`src/pages/Attendance.tsx`** — add status filter to order totals query
- **`src/pages/Analytics.tsx`** — add status filter to leaderboard query
- **`src/pages/GPSTrack.tsx`** ~line 284 — add `.eq('status', 'confirmed')`
- **`src/pages/MyBeats.tsx`** ~line 898 — add `.eq('status', 'confirmed')`

---

## Files Modified
- **New migration** — `credit_ledger` table, `order_cancellation_log` table, `cancel_order_atomic` RPC, `credit_ledger_sync` trigger
- **`src/utils/orderCancellation.ts`** — Replace orchestrator with single RPC call
- **5 page files** — Add `.eq('status', 'confirmed')` to order queries

