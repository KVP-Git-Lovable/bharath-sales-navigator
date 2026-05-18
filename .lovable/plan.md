## Root Cause — Verified

This is **not** an "auto-trigger" issue. There is **no trigger** on the `orders` table (verified via `information_schema.triggers`). The breakage came from a **schema/code mismatch** that surfaced this morning.

### Timeline

| When (UTC) | What happened |
|---|---|
| **May 14, 10:29** | Migration `20260514102926…` rewrote the `sync_order_with_items` RPC. The INSERT lists `subtotal, discount_amount` in the orders columns. |
| **May 14, 11:10** | Migration `20260514111005…` rewrote it again — **also includes `subtotal`** in the INSERT (line 77 of the migration). |
| **Mon → Sat → today 04:58** | Orders were syncing fine through this same RPC. Today's 4 successful orders (BB Office Canteen, Kalla ji ×2, Basheer) all landed between 04:50 and 04:58 UTC. |
| **~06:57 UTC today** | Postgres starts logging `column "subtotal" of relation "orders" does not exist` — dozens of failures from this point on. |
| **Now** | `information_schema.columns` confirms the `orders` table has **no `subtotal` column** (verified column list: id, user_id, visit_id, retailer_name, discount_amount, total_amount, status, …). |

### What actually happened

The RPC body has **always referenced `subtotal`** since May 14. The only way the morning's 4 orders succeeded is that **the `subtotal` column existed in the `orders` table this morning and was dropped between 04:58 and ~07:00 UTC today**.

There is **no migration file** that creates or drops `orders.subtotal` (grep across `supabase/migrations/` returns zero `ALTER TABLE … subtotal` statements). That means the column was added and later dropped **manually via the Supabase dashboard SQL editor**, outside the migration system — not by us, not by Lovable, not by an automatic process.

So the "auto-change" is actually: someone (or a manual dashboard action) ran `ALTER TABLE public.orders DROP COLUMN subtotal` today around 05:00–07:00 UTC. From that moment, every new order routed through `sync_order_with_items` fails with `42703: column "subtotal" does not exist`, and the offline queue piles up retries (which is exactly what the Sync Progress modal shows for Ajay Prabhu).

The "subtotal calculations" the user mentions were never being **calculated** — `subtotal` was just stored as the post-discount line-items total. The math still runs client-side; only the storage column vanished.

## Fix

Restore the column so the RPC and the May 15 backfill migrations (`20260515101415`, `20260515103734`, `20260515103824` — all reference `o.subtotal`) work again. Safest, minimal-risk path:

### 1. New migration — add `subtotal` back

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0;

-- Backfill historical rows where subtotal is missing:
-- subtotal = total_amount + discount_amount (pre-discount line sum)
UPDATE public.orders
SET subtotal = COALESCE(total_amount, 0) + COALESCE(discount_amount, 0)
WHERE subtotal = 0;
```

This:
- Restores the column the RPC expects.
- Backfills a sensible value for the orders inserted today after the column was dropped (their `subtotal` is null/0 in any cached payload, so we reconstruct from `total_amount + discount_amount`).
- Uses `IF NOT EXISTS` so it's safe to re-run.

### 2. No code change needed

`sync_order_with_items` already writes `subtotal` correctly, and `Cart.tsx` already sends it in `orderData`. Once the column is back, the queued Ajay Prabhu order (and any others stuck on retry) will sync on the next attempt.

### 3. After deploy — verify

```sql
-- Should return 1 row
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='orders' AND column_name='subtotal';

-- Watch the queue drain (counts should drop)
SELECT count(*) FROM orders WHERE order_date='2026-05-18';
```

And in the device's Sync Progress modal, Ajay Prabhu should flip from "Retry #N" to synced within a minute.

## Recommendation — prevent recurrence

The real lesson: **never run `ALTER TABLE` via the Supabase dashboard SQL editor** on this project. Every schema change must go through a Lovable migration so the codebase and DB stay in sync. If you want, I can also add a tiny CI-style check (a dev-only DB function) that asserts `orders.subtotal` exists at startup, so this kind of out-of-band drop is caught immediately instead of after orders start failing.

## Technical Details (for reference)

- Active RPC: `public.sync_order_with_items(jsonb, jsonb)` — single definition, references `subtotal` in both the new-order INSERT (line ~61 of the function body) and not in the existing-order branch.
- Failing path in client: `src/utils/offlineOrderUtils.ts → syncOrder()` calls the RPC; on `42703`, the catch block re-queues to `SYNC_QUEUE` — that's why the modal shows endless retries instead of a user-visible error.
- May 15 backfill migrations (`…101415`, `…103734`, `…103824`) all `SELECT o.subtotal` — they would have errored too if run after the drop, but they ran on May 15 when the column still existed.
