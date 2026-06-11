ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS rate numeric NOT NULL DEFAULT 0;

UPDATE public.order_items
SET rate = COALESCE(
  original_rate,
  CASE
    WHEN quantity IS NOT NULL AND quantity <> 0 AND total IS NOT NULL THEN ROUND(total / quantity, 2)
    ELSE 0
  END
)
WHERE rate = 0;