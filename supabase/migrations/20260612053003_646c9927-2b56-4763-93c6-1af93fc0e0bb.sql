-- Anchor guard: ensure order_items.variant_id always exists with FK to product_variants
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'order_items_variant_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;
  END IF;
END $$;