# Pending Payments & Revenue Ownership — Verification + Hardening

## What I checked in the code

| Layer | Today's behaviour | Matches your model? |
|---|---|---|
| `retailers.owner_id` | Historical owner. Default transfer leaves it on Manvith. Optional toggle moves it. | Yes |
| `retailers.user_id` | Operational assignee. Transfer always moves this to new user. | Yes |
| `orders` table | Has `user_id` (whoever placed the order). **No `owner_id` column.** | Partially |
| `invoices` table | Same — `user_id` only, no `owner_id` snapshot. | Partially |
| Pending payments UI (`PendingPayments`, `PendingPaymentsAll`) | Lists by `retailers.user_id`, shows "Credited to <owner>" badge when `owner_id ≠ user_id`. | Yes |
| `PaymentMarkingModal` | Updates `retailers.pending_amount` on the retailer. Doesn't write `user_id`/`owner_id` on a payment row — there's no payment-history row created. | Gap |
| Revenue/target metrics | Group by `orders.user_id` (= whoever placed the order). | Works, but fragile |

## What this means in practice

**Good news:** for orders placed *after* transfer, `orders.user_id` is already the new user, so new revenue automatically credits the new user. For historical orders, `orders.user_id` was Manvith, so historical revenue automatically stays with Manvith. Your three layers (Historical / Operational / Future) are mostly already working through `orders.user_id` alone.

**The fragile parts:**

1. **No snapshot on orders/invoices.** Today revenue is attributed via `orders.user_id`. If an admin ever bulk-fixes that column (e.g., a future cleanup script, or a misuse of the transfer RPC), historical revenue silently moves. The enterprise pattern you described (immutable `owner_id_snapshot`) is missing.
2. **Pending-amount has no audit trail.** `PaymentMarkingModal` just decrements `retailers.pending_amount`. There's no `payments` row recording *who collected*, *when*, *for which historical owner*. So we can't answer "show me ₹ collected by New User on Manvith's old dues this month" — the data isn't recorded anywhere.
3. **Pending-payment list filters by `user_id` only.** A retailer that Manvith still owns but is now assigned to New User shows up correctly for New User. But if you ever transfer **only ownership** (not assignee), the new owner won't see the old dues — because the list is keyed on `user_id`, not `owner_id`. Edge case, but worth covering.

## Plan — three small, additive changes

### 1. Snapshot owner on orders & invoices (DB migration)

Add columns + auto-fill via trigger so we never have to remember in app code:

```sql
ALTER TABLE orders    ADD COLUMN owner_id_snapshot uuid;
ALTER TABLE invoices  ADD COLUMN owner_id_snapshot uuid;

-- Trigger: on insert, copy retailer.owner_id (fallback: NEW.user_id)
CREATE FUNCTION set_order_owner_snapshot() ...
  -- if NEW.owner_id_snapshot IS NULL:
  --   SELECT owner_id INTO NEW.owner_id_snapshot FROM retailers WHERE id = NEW.retailer_id;
  --   IF NULL THEN NEW.owner_id_snapshot := NEW.user_id;
```

One-time backfill: `UPDATE orders SET owner_id_snapshot = user_id WHERE owner_id_snapshot IS NULL;` (same for invoices). This locks historical revenue to the original creator forever, regardless of any future retailer/order edits.

### 2. Record collections in a payment-history row

Update `PaymentMarkingModal.handleFullPayment` / `handleCustomPayment` to also `INSERT` into a payments table (already exists per earlier RPC inspection — `retailer_credit_ledger` / `distributor_payments`). Each row carries:

- `collected_by_user_id` = current user (operational credit — "who did the collection work")
- `revenue_owner_id` = `retailers.owner_id` at collection time (revenue credit — "whose dues these were")
- `amount`, `method`, `proof_url`, `retailer_id`, `collected_at`

Now reports can answer both "who collected" and "whose revenue".

### 3. Pending-payment visibility — union of assignee + owner

In `PendingPayments.tsx` and `PendingPaymentsAll.tsx`, change the query from:
```ts
.eq('user_id', me)
```
to:
```ts
.or(`user_id.eq.${me},owner_id.eq.${me}`)
```

So: I see every retailer where I'm either the current assignee **or** the historical owner with open dues. Badge logic stays: "Credited to <name>" whenever `owner_id ≠ me`.

### 4. Revenue metrics use the snapshot (one-line switch)

In `useBusinessMetrics` / `usePerformanceSummary`, group by `orders.owner_id_snapshot` instead of `orders.user_id` for revenue/target/KG cards. Visit/collection-activity counts continue grouping by `user_id` (operational credit). This makes the historical/future split bulletproof even if `user_id` ever gets rewritten.

### What stays unchanged

- `partial_ownership_transfer` RPC and the "Also transfer ownership" toggle — current behaviour is correct.
- Beat-cascade transfer logic.
- Existing audit logs.
- The "credited to <owner>" badge.

## Files touched

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Add `owner_id_snapshot` to `orders` + `invoices`, add trigger, backfill. |
| `src/components/PaymentMarkingModal.tsx` | Insert a payment-history row (with both collector + revenue-owner ids) alongside the `retailers.pending_amount` update. |
| `src/components/home/PendingPayments.tsx` | `.or(user_id.eq, owner_id.eq)` query; existing badge stays. |
| `src/pages/PendingPaymentsAll.tsx` | Same query change + badge. |
| `src/hooks/useBusinessMetrics.ts` (and `usePerformanceSummary` if needed) | Group revenue by `owner_id_snapshot`; visits/calls remain on `user_id`. |
| `.lovable/plan.md` | Document the new snapshot + collection-record contract. |

## Result after these changes

| Activity | Visible to | Operational credit (`user_id`) | Revenue credit (`owner_id_snapshot`) |
|---|---|---|---|
| Old ₹10,000 due on Manvith retailer, collected by New User | Both | New User | Manvith |
| New order placed by New User after transfer | New User | New User | New User |
| Manvith's historical invoices | Manvith | Manvith (frozen) | Manvith (frozen) |
| Future retailer transfer to a third user | New owner | New owner | unchanged on past orders |

This exactly matches the enterprise "Historical / Operational / Future" three-layer model you described, and makes it immutable at the DB level rather than relying on app code to behave.
