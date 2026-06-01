CREATE POLICY "Auth can read products"
  ON public.products FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Auth can read product_variants"
  ON public.product_variants FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin can insert products"
  ON public.products FOR INSERT
  TO authenticated WITH CHECK (is_system_admin(auth.uid()));

CREATE POLICY "Admin can update products"
  ON public.products FOR UPDATE
  TO authenticated USING (is_system_admin(auth.uid()));

CREATE POLICY "Admin can update product_variants"
  ON public.product_variants FOR UPDATE
  TO authenticated USING (is_system_admin(auth.uid()));