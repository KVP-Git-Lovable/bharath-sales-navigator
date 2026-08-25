-- ===========================================================================
-- BACKSTOP: upper bounds in public.sync_order_with_items_v2
-- ---------------------------------------------------------------------------
-- NOT APPLIED. Reviewed-and-promoted by hand (staging first), per instruction.
--
-- Why: the function today validates only the lower bounds
--     IF v_qty IS NULL OR v_qty <= 0 ... 'item.quantity must be > 0'
--     IF v_rate < 0                 ... 'item.rate negative'
--     IF v_line_total < 0           ... 'item.total negative'
-- so a mis-scaled line (5000 KG instead of 5000 G → ₹10,97,500) syncs cleanly,
-- including on offline replay where no UI guard can run.
--
-- How to apply: edit the body of public.sync_order_with_items_v2 and insert the
-- block below immediately AFTER the three existing per-item checks inside the
--     FOR v_item IN SELECT jsonb_array_elements(v_items) LOOP
-- loop, then CREATE OR REPLACE the function unchanged otherwise.
--
-- Thresholds are deliberately far above any legitimate field order; tune with
-- Sales before promoting.
-- ===========================================================================

--  >>> insert after:  IF v_line_total < 0 THEN ... END IF;

    -- Upper-bound backstop for unit/quantity scale mismatches (×100 / ×1000).
    IF v_qty > 10000 THEN
      v_errors := v_errors || to_jsonb(format(
        'item.quantity %s exceeds the safety ceiling (10000) — likely a unit/quantity scale error',
        v_qty
      ));
    END IF;

    IF v_line_total > 500000 THEN
      v_errors := v_errors || to_jsonb(format(
        'item.total %s exceeds the per-line safety ceiling (500000) — likely a unit/quantity scale error',
        v_line_total
      ));
    END IF;

--  >>> and, after the loop, next to the existing expected-total check:

  IF v_total > 2000000 THEN
    v_errors := v_errors || to_jsonb(format(
      'total_amount %s exceeds the per-order safety ceiling (2000000)', v_total
    ));
  END IF;

-- Rejections land in public.sync_audit_log with status 'validation_error'
-- through the existing error path, so blocked replays stay auditable.
