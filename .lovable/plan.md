## What I found

The current live failure is not about products.

The issue is that the app’s edit-order flow writes directly to `public.orders` and `public.order_items`, but the live RLS on those two tables is missing the write policies that this UI path needs.

Current app behavior in `EditOrderDialog`:
1. Read order
2. Read order items
3. Update `orders`
4. Delete existing `order_items`
5. Insert new `order_items`

Current live RLS state:
- `orders` has only SELECT policies plus one DELETE blocker policy: `No client deletes on orders` with `USING (false)`
- `order_items` currently has:
  - `Admins can delete order items`
  - `Admins can read all order items`
  - `Order owners can delete order items`
- Missing from live DB for this flow:
  - `orders`: UPDATE policy for legitimate users/admins
  - `order_items`: INSERT policy for legitimate users/admins
  - likely `order_items`: UPDATE policy if any direct item edits exist elsewhere

Because of that, the UI can load the order, but Save fails when it reaches the write steps.

## Minimal fix

Create one targeted migration that only restores the missing write access needed for the current live order flow.

### `public.orders`
Add:
- **Order owners can update orders** — `FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
- **System admins can update all orders** — `FOR UPDATE TO authenticated USING (public.is_system_admin(auth.uid())) WITH CHECK (public.is_system_admin(auth.uid()))`

### `public.order_items`
Add:
- **Order owners can insert order items** — `FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()))`
- **System admins can insert order items** — `FOR INSERT TO authenticated WITH CHECK (public.is_system_admin(auth.uid()))`
- **Order owners can update order items** — `FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()))`
- **System admins can update order items** — `FOR UPDATE TO authenticated USING (public.is_system_admin(auth.uid())) WITH CHECK (public.is_system_admin(auth.uid()))`

### Leave unchanged
- `products`
- `product_variants`
- all other tables
- all existing read policies
- all existing delete policies
- all RPCs like `sync_order` / `cancel_order_atomic`
- no data changes

## Why this is the safest fix

- It addresses only the broken live path.
- It does not widen product access or change unrelated modules.
- It does not create products or modify product logic.
- It preserves the current order flow design exactly as it works now, only restoring the missing permissions required for Save.
- It is idempotent, so re-running it will not duplicate or break policies.

## Important note on future migrations

I cannot globally disable future migrations from inside your app code or database.
What I can do is keep this fix as a single standalone migration, and from my side I will only propose DB migrations when you manually approve them.

## After approval, I will verify

1. The new policies exist in `pg_policies`
2. `/operations` Edit Order → Save Changes succeeds
3. Product-related screens still behave exactly as they do now
4. No extra tables or flows are touched