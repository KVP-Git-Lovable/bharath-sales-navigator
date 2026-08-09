-- Editing an order creates a REPLACEMENT order and links the pair via
-- replaces_order_id / replaced_by_order_id. Staging flips the original to
-- status='replaced' with a trigger; that trigger was never ported here, so both
-- versions stayed 'confirmed' and every report counted the order twice.
--
-- Both halves are required: flipping the status achieves nothing unless the
-- reports also exclude it. This database has only 2 of the 5 report functions
-- staging has, so the predicate patch is written against those 2 specifically.

-- 1) Supersede on link ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_order_supersede_on_replace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_old_inv uuid; v_new_inv uuid;
BEGIN
  IF NEW.replaced_by_order_id IS NOT NULL
     AND (OLD.replaced_by_order_id IS DISTINCT FROM NEW.replaced_by_order_id) THEN

    IF NEW.status IN ('confirmed','pending') THEN
      NEW.status := 'replaced';
    END IF;

    SELECT id INTO v_old_inv FROM invoices WHERE order_id = NEW.id
      ORDER BY created_at DESC LIMIT 1;
    SELECT id INTO v_new_inv FROM invoices WHERE order_id = NEW.replaced_by_order_id
      ORDER BY created_at DESC LIMIT 1;

    IF v_old_inv IS NOT NULL THEN
      UPDATE invoices SET status='superseded',
             superseded_by_invoice_id = v_new_inv, updated_at = now()
      WHERE id = v_old_inv AND status <> 'superseded';
    END IF;

    IF v_new_inv IS NOT NULL AND v_old_inv IS NOT NULL THEN
      UPDATE invoices SET revises_invoice_id = v_old_inv, updated_at = now()
      WHERE id = v_new_inv AND revises_invoice_id IS DISTINCT FROM v_old_inv;
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_order_supersede_on_replace ON public.orders;
CREATE TRIGGER trg_order_supersede_on_replace
  BEFORE UPDATE OF replaced_by_order_id ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_order_supersede_on_replace();


-- 2) Reports must ignore 'replaced' ----------------------------------------
-- Rewrites only the status predicate via pg_get_functiondef, so the rest of
-- each body is preserved byte-for-byte. Aborts if both are not rewritten.
DO $mig$
DECLARE r RECORD; v_new text; v_cnt int := 0; v_done text := '';
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('get_sales_report','get_sales_quantity_report')
  LOOP
    v_new := r.def;
    v_new := replace(v_new, 'NOT IN (''cancelled'', ''rejected'')',
                            'NOT IN (''cancelled'', ''rejected'', ''replaced'')');
    v_new := replace(v_new, 'NOT IN (''cancelled'',''rejected'')',
                            'NOT IN (''cancelled'',''rejected'',''replaced'')');
    v_new := replace(v_new, 'status <> ''cancelled''',
                            'status NOT IN (''cancelled'',''replaced'')');
    IF v_new <> r.def THEN
      EXECUTE v_new; v_cnt := v_cnt + 1; v_done := v_done || r.proname || ' ';
    ELSE
      RAISE WARNING 'no status predicate matched in %', r.proname;
    END IF;
  END LOOP;

  IF v_cnt <> 2 THEN
    RAISE EXCEPTION 'expected 2 report functions rewritten, got % (%)', v_cnt, v_done;
  END IF;
  RAISE NOTICE 'rewritten: %', v_done;
END $mig$;


-- 3) Backfill the orders already linked but never superseded ----------------
-- Only ever moves confirmed/pending -> replaced; cannot touch delivered or
-- cancelled. Currently exactly 1 row.
UPDATE public.orders
   SET status = 'replaced'
 WHERE replaced_by_order_id IS NOT NULL
   AND status IN ('confirmed','pending');

NOTIFY pgrst, 'reload schema';