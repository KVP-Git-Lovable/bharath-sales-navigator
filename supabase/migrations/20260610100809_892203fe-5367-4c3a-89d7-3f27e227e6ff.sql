ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS rate numeric NOT NULL DEFAULT 0;

UPDATE public.order_items
  SET rate = original_rate
  WHERE original_rate IS NOT NULL
    AND rate = 0;