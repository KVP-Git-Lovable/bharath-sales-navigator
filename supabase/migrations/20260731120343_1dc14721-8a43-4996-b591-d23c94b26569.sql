-- 1. Restore the dropped column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_unit text;

-- 2. Backfill from product_uom_mapping base UOM, then products.unit, then 'Piece'
UPDATE public.products p
SET base_unit = COALESCE(
  (
    SELECT um.code
    FROM public.product_uom_mapping pum
    JOIN public.uom_master um ON um.id = pum.uom_id
    WHERE pum.product_id = p.id AND pum.is_base = true AND pum.is_active = true
    LIMIT 1
  ),
  NULLIF(TRIM(p.unit), ''),
  'Piece'
)
WHERE p.base_unit IS NULL;

-- 3. Guard against future accidental column drops on critical tables
CREATE OR REPLACE FUNCTION public.guard_critical_column_drops()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects() LOOP
    IF obj.object_type = 'table column'
       AND obj.schema_name = 'public'
       AND split_part(obj.object_identity, '.', 2) IN (
         'products', 'product_variants', 'orders', 'order_items', 'retailers'
       )
       AND NOT obj.is_temporary
    THEN
      -- Allow drops that happen as part of dropping the whole table
      IF NOT EXISTS (
        SELECT 1 FROM pg_event_trigger_dropped_objects()
        WHERE object_type = 'table'
          AND object_identity = split_part(obj.object_identity, '.', 1) || '.' || split_part(obj.object_identity, '.', 2)
      ) THEN
        RAISE EXCEPTION
          'Blocked: dropping column "%" is not allowed. Critical sales columns must be changed via a reviewed migration, not the dashboard table editor.',
          obj.object_identity;
      END IF;
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS guard_critical_column_drops_trg;
CREATE EVENT TRIGGER guard_critical_column_drops_trg
  ON sql_drop
  EXECUTE FUNCTION public.guard_critical_column_drops();