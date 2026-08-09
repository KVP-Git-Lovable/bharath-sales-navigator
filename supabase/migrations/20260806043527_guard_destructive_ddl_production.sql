-- Production hardening. Additive only: creates one function + one event
-- trigger. Touches no table, no column, no row.
--
-- Complements the existing guard_critical_column_drops_trg, which is narrower:
-- it only covers COLUMN drops on 5 tables, explicitly ALLOWS a column drop when
-- the whole table is being dropped, and does not cover RENAME -- so it would
-- NOT have stopped the 27-Jul products.rate -> price incident.
--
--   BLOCKED : DROP TABLE (any table)
--             ALTER TABLE ... DROP COLUMN (any table)
--             ALTER TABLE ... RENAME COLUMN/TO/CONSTRAINT
--   ALLOWED : CREATE anything, ADD COLUMN, CREATE OR REPLACE,
--             DROP VIEW / FUNCTION / POLICY / TRIGGER / INDEX
--
-- Deliberate override, same transaction only:
--     SET LOCAL app.allow_destructive = 'on';
--
-- Verified safe against the every-10-minutes ensure-user-delete-protection
-- cron job, which only does CREATE OR REPLACE FUNCTION / CREATE TRIGGER.

CREATE OR REPLACE FUNCTION public.guard_destructive_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  q text;
BEGIN
  IF coalesce(current_setting('app.allow_destructive', true), '') = 'on' THEN
    RETURN;
  END IF;

  IF tg_tag = 'DROP TABLE' THEN
    RAISE EXCEPTION 'BLOCKED: DROP TABLE is disabled on production.'
      USING ERRCODE = '42501',
            HINT = 'Intentional? Take a backup, then run  SET LOCAL app.allow_destructive = ''on'';  in the same transaction and retry. Never use the Dashboard Table Editor delete button.';
  END IF;

  IF tg_tag = 'ALTER TABLE' THEN
    q := lower(coalesce(current_query(), ''));

    IF q ~ '\mdrop\s+column\M' THEN
      RAISE EXCEPTION 'BLOCKED: ALTER TABLE ... DROP COLUMN is disabled on production.'
        USING ERRCODE = '42501',
              HINT = 'Intentional? Take a backup, then SET LOCAL app.allow_destructive = ''on''; and retry.';
    END IF;

    IF q ~ '\mrename\s+(column|to|constraint)\M' THEN
      RAISE EXCEPTION 'BLOCKED: ALTER TABLE ... RENAME is disabled on production.'
        USING ERRCODE = '42501',
              HINT = 'Renaming a live column silently breaks every query using the old name -- this is exactly what broke the catalogue on 27 Jul (products.rate -> price). Intentional? SET LOCAL app.allow_destructive = ''on''; and retry.';
    END IF;
  END IF;
END;
$fn$;

DROP EVENT TRIGGER IF EXISTS guard_destructive_ddl_trg;

CREATE EVENT TRIGGER guard_destructive_ddl_trg
  ON ddl_command_start
  WHEN TAG IN ('DROP TABLE', 'ALTER TABLE')
  EXECUTE FUNCTION public.guard_destructive_ddl();

COMMENT ON FUNCTION public.guard_destructive_ddl() IS
  'Blocks DROP TABLE / DROP COLUMN / RENAME unless app.allow_destructive=on. Added 2026-08-05 after the 27-Jul products.rate rename incident.';