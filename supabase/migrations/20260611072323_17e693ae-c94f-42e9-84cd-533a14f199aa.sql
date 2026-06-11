ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'piece';

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS variant_name text;

UPDATE public.product_variants
SET variant_name = COALESCE(NULLIF(variant_name, ''), NULLIF(sku, ''), 'Variant')
WHERE variant_name IS NULL OR btrim(variant_name) = '';

COMMENT ON COLUMN public.products.rate IS 'Base product rate used by product management and order entry';
COMMENT ON COLUMN public.products.unit IS 'Display unit for the base product rate';
COMMENT ON COLUMN public.product_variants.variant_name IS 'Human-readable display name for product variants';