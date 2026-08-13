-- Seed the "Default — Sales by user & beat" report, mirroring staging.
--
-- Seeded PAUSED with no recipients, matching how "Daily Attendance Register" was
-- seeded: the user picks who receives it in the UI, then activates. A subscription
-- that fired before anyone chose recipients would deliver to nobody and still burn
-- the occurrence key for the day.
--
-- Verified before seeding: get_sales_report('grouped','team_member',NULL,
-- ARRAY['orders','quantity','revenue'], {date_from,date_to}, ARRAY['team_member','beat'])
-- returns 85 rows on production for the last 7 days, i.e. the exact call
-- generate-report will make.
--
-- Idempotent: re-running is a no-op once the subscription exists.

DO $$
DECLARE
  v_def_id uuid;
  v_created_by uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.report_subscriptions WHERE name = 'Default — Sales by user & beat') THEN
    RAISE NOTICE 'already seeded, skipping';
    RETURN;
  END IF;

  -- Reuse whoever owns the existing seeded report so ownership is consistent.
  SELECT created_by INTO v_created_by
  FROM public.report_subscriptions
  WHERE name = 'Daily Attendance Register'
  LIMIT 1;

  INSERT INTO public.report_definitions (name, dataset_key, layout, config, created_by)
  VALUES (
    'Default — Sales by user & beat',
    'sales',
    'grouped',
    jsonb_build_object(
      'rows',    jsonb_build_array('team_member','beat'),
      'values',  jsonb_build_array('orders','quantity','revenue'),
      'columns', jsonb_build_array(),
      'filters', jsonb_build_object(
        'date_from',      '2026-07-06',
        'date_to',        '2026-08-05',
        'sort_key',       NULL,
        'sort_dir',       NULL,
        'scope_user_id',  NULL,
        'distributor_id', NULL
      )
    ),
    v_created_by
  )
  RETURNING id INTO v_def_id;

  -- The date_from/date_to above are inert: generate-report merges the computed
  -- reporting period over the definition's own filters on every run.

  INSERT INTO public.report_subscriptions (
    name, report_definition_id, recipient_mode, recipient_user_ids,
    attachment_format, push_to_phone, scope, cadence, fire_time, timezone,
    status, period_basis, respect_hierarchy, pdf_template, created_by
  )
  VALUES (
    'Default — Sales by user & beat',
    v_def_id,
    'named_users',
    '{}'::uuid[],
    'pdf',
    true,
    'shared',
    'daily',
    '18:00:00',
    'Asia/Kolkata',
    'paused',
    'current',
    true,
    jsonb_build_object(
      'theme',          'light_pink',
      'branding',       'company',
      'orientation',    'landscape',
      'header_style',   'band',
      'include_totals', true
    ),
    v_created_by
  );
END $$;
