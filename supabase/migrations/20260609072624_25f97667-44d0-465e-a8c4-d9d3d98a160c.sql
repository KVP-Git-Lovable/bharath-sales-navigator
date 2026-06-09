ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS original_rate numeric;
UPDATE public.order_items SET original_rate = rate WHERE original_rate IS NULL;