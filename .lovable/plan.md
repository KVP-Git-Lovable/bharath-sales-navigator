# Fix: Users can't register orders (RLS error)

## Root cause
`public.orders` has SELECT, UPDATE, DELETE policies but **no INSERT policy**. The primary insert path uses the `sync_order_with_items` SECURITY DEFINER RPC which bypasses RLS, so most orders go through. But fallback paths — offline sync queue replay, distributor portal direct inserts, any `supabase.from('orders').insert(...)` call — get rejected with `new row violates row-level security policy for table "orders"`.

`public.order_items` likely has the same gap and must be checked in the same migration.

## Migration

Add INSERT policies that mirror the existing SELECT ownership rules:

```sql
-- Owner inserts
CREATE POLICY "Users can insert their own orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Distributor portal inserts (mirror existing UPDATE policy scope)
CREATE POLICY "Distributor users can insert orders for their distributor"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.distributor_portal_users dpu
    WHERE dpu.user_id = auth.uid()
      AND dpu.distributor_id = orders.distributor_id
  )
);

-- order_items: allow inserts when parent order belongs to caller
CREATE POLICY "Users can insert items for their own orders"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
  )
);
```

(I'll inspect actual `distributor_portal_users` / `order_items` schema before finalising the policy bodies — these are the intended shapes.)

## Verification
1. Run migration.
2. Check `pg_policy` shows `polcmd = 'a'` (INSERT) entries for both tables.
3. Confirm a fresh order via the UI inserts successfully (network 201 on POST `/rest/v1/orders`).
4. Confirm offline sync queue drains without RLS errors.

## No code changes needed
The frontend code is already correct — it just needs the missing DB policies. The `sync_order_with_items` RPC continues to work as before; this just unblocks the fallback paths.
