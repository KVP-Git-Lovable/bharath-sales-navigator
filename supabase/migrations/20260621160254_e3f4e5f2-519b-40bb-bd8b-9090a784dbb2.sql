
-- 1) Recreate views without SECURITY DEFINER semantics
ALTER VIEW IF EXISTS public.analytics_productivity_summary SET (security_invoker = true);

-- 2) Replace "always-true" RLS policies with "must be signed in"
DO $$
DECLARE
  r RECORD;
  roles_text TEXT;
  new_qual TEXT;
  new_check TEXT;
  cmd_text TEXT;
  stmt TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND ((qual = 'true' AND cmd <> 'SELECT') OR with_check = 'true')
  LOOP
    -- Build roles list
    SELECT string_agg(quote_ident(rn), ', ')
      INTO roles_text
      FROM unnest(r.roles) AS rn;
    IF roles_text IS NULL OR roles_text = '' THEN
      roles_text := 'public';
    END IF;

    -- Replace bare true with auth-required check; keep non-true expressions
    new_qual := CASE WHEN r.qual = 'true' THEN '(auth.uid() IS NOT NULL)' ELSE r.qual END;
    new_check := CASE WHEN r.with_check = 'true' THEN '(auth.uid() IS NOT NULL)' ELSE r.with_check END;

    cmd_text := CASE r.cmd
      WHEN 'ALL' THEN 'ALL'
      WHEN 'SELECT' THEN 'SELECT'
      WHEN 'INSERT' THEN 'INSERT'
      WHEN 'UPDATE' THEN 'UPDATE'
      WHEN 'DELETE' THEN 'DELETE'
    END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    stmt := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename,
      CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      cmd_text, roles_text
    );

    IF new_qual IS NOT NULL AND r.cmd <> 'INSERT' THEN
      stmt := stmt || format(' USING (%s)', new_qual);
    END IF;
    IF new_check IS NOT NULL AND r.cmd IN ('INSERT','UPDATE','ALL') THEN
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE stmt;
  END LOOP;
END $$;
