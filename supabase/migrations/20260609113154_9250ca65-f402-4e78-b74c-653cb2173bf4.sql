-- Restore missing write RLS policies needed by the Edit Order flow.
-- Idempotent: safe to re-run.

-- orders: UPDATE policies
DROP POLICY IF EXISTS "Order owners can update orders" ON public.orders;
CREATE POLICY "Order owners can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System admins can update all orders" ON public.orders;
CREATE POLICY "System admins can update all orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

-- order_items: INSERT policies
DROP POLICY IF EXISTS "Order owners can insert order items" ON public.order_items;
CREATE POLICY "Order owners can insert order items"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System admins can insert order items" ON public.order_items;
CREATE POLICY "System admins can insert order items"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_system_admin(auth.uid()));

-- order_items: UPDATE policies
DROP POLICY IF EXISTS "Order owners can update order items" ON public.order_items;
CREATE POLICY "Order owners can update order items"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System admins can update order items" ON public.order_items;
CREATE POLICY "System admins can update order items"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));