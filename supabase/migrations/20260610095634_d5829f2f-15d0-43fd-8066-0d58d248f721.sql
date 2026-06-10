-- Restore product_variants.price and product_variants.product_id
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

-- Reattach variants to parent products by name match
WITH map(variant_name, product_name) AS (VALUES
  ('ADUKU 100G','ADUKU 20G'),('ADUKU 250G','ADUKU 20G'),('ADUKU 500G','ADUKU 20G'),('SAMPLE ADUKU (FS)','ADUKU 20G'),
  ('BLUE 100G','BLUE 20G'),('BLUE 250G','BLUE 20G'),('BLUE 500G','BLUE 20G'),('SAMPLE BLUE (FS)','BLUE 20G'),
  ('Gold 250G','GOLD 40G'),('GOLD 500G','GOLD 40G'),('GOLD 1KG','GOLD 40G'),('KADAK GOLD BLEND','GOLD 40G'),('SAMPLE GOLD (FS)','GOLD 40G'),
  ('YELLOW 100G','YELLOW 20G'),('YELLOW 250G','YELLOW 20G'),('YELLOW 500G','YELLOW 20G'),('Yellow 40G','YELLOW 20G'),('Yellow 1Kg','YELLOW 20G'),
  ('RL JAR 500G','RL JAR 250'),('RL JAR 1KG','RL JAR 250'),
  ('ELACHI 250G','ELAICHI 40G'),('SAMPLE ELAICHI (FS)','ELAICHI 40G'),
  ('ADARAK 250G','ADRAK 40G'),('SAMPLE ADRAK (FS)','ADRAK 40G'),
  ('VAYU 250','VAYU 30G'),('Vayu SPL 250g','VAYU 30G'),('VAYU BLEND','VAYU 30G'),('SAMPLE VAYU (FS)','VAYU 30G'),
  ('DAKSHIN 250G','DAKSHIN 30G'),('DAKSHIN SPL 250','DAKSHIN 30G'),('DAKSHIN BLEND','DAKSHIN 30G'),('SAMPLE DAKSHIN (FS)','DAKSHIN 30G')
)
UPDATE public.product_variants pv
SET product_id = p.id
FROM map m JOIN public.products p ON p.name = m.product_name
WHERE pv.variant_name = m.variant_name;

-- Apply prices from Book 1.xlsx (rounded to 2 dp)
WITH prices(variant_name, price) AS (VALUES
  ('ADUKU 100G',400.00),('ADUKU 250G',342.86),('ADUKU 500G',342.86),
  ('BLUE 100G',333.33),('BLUE 250G',323.81),('BLUE 500G',323.81),
  ('Gold 250G',342.86),('GOLD 500G',342.86),
  ('YELLOW 100G',333.33),('YELLOW 250G',323.81),('YELLOW 500G',323.81),
  ('RL JAR 1KG',320.00),('RL JAR 500G',323.81),
  ('ELACHI 250G',314.29),
  ('ADARAK 250G',304.76),
  ('VAYU 250',209.52),
  ('DAKSHIN 250G',209.52)
)
UPDATE public.product_variants pv
SET price = pr.price
FROM prices pr
WHERE pv.variant_name = pr.variant_name;