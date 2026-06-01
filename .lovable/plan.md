## Problem

Products are not visible in Product Master (and consequently in Scheme dropdowns) because the `products` and `product_variants` tables have RLS enabled but **no SELECT policy**. PostgREST therefore returns zero rows even though 11 active products and 31 variants exist in the database.

Confirmed via `pg_policy`:
- `public.products` → only an `is_system_admin` DELETE policy, no SELECT
- `public.product_variants` → only INSERT/DELETE admin policies, no SELECT
- `public.product_categories` → already has authenticated SELECT (this is why categories work but products don't)

## Fix

Add SELECT policies so any authenticated user can read products and variants (matching the existing pattern on `product_categories`).

```sql
CREATE POLICY "Auth can read products"
  ON public.products FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Auth can read product_variants"
  ON public.product_variants FOR SELECT
  TO authenticated USING (true);
```

Also add UPDATE policy for products (admin only) since the audit showed only INSERT/DELETE on variants and DELETE on products — verifying ProductManagement edits still work. I'll add:

```sql
CREATE POLICY "Admin can insert products"
  ON public.products FOR INSERT
  TO authenticated WITH CHECK (is_system_admin(auth.uid()));

CREATE POLICY "Admin can update products"
  ON public.products FOR UPDATE
  TO authenticated USING (is_system_admin(auth.uid()));

CREATE POLICY "Admin can update product_variants"
  ON public.product_variants FOR UPDATE
  TO authenticated USING (is_system_admin(auth.uid()));
```

No frontend code changes needed — once the SELECT policies exist, both Product Master and Scheme product dropdowns will populate.
