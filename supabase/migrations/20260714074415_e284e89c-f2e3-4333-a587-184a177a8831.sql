
-- Restore deleted "System Administrator" security profile (id 98c1259e-...)
-- 8 users, including Prajwal C, are orphaned on this profile_id.
-- No FK from user_profiles.profile_id → security_profiles allowed a hard delete
-- without cascade or audit trail. Re-inserting with the same id re-links all
-- orphaned users automatically.

INSERT INTO public.security_profiles (id, name, description, is_system)
VALUES (
  '98c1259e-0368-4e1a-a4e8-01e173cbfb10',
  'System Administrator',
  'Full access to all modules and administrative features',
  true
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_system = true;

-- Seed every known permission (from other profiles' catalogs) with all flags true
INSERT INTO public.profile_object_permissions (
  profile_id, object_name, permission_type, parent_module,
  can_read, can_create, can_edit, can_delete, can_view_all, can_modify_all
)
SELECT DISTINCT
  '98c1259e-0368-4e1a-a4e8-01e173cbfb10'::uuid,
  object_name, permission_type, parent_module,
  true, true, true, true, true, true
FROM public.profile_object_permissions
WHERE profile_id <> '98c1259e-0368-4e1a-a4e8-01e173cbfb10'
ON CONFLICT DO NOTHING;

-- Prevent recurrence: block deleting a system profile
CREATE OR REPLACE FUNCTION public.prevent_system_profile_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'Cannot delete system security profile "%" (id=%). System profiles are protected.', OLD.name, OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_system_profile_delete ON public.security_profiles;
CREATE TRIGGER trg_prevent_system_profile_delete
  BEFORE DELETE ON public.security_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_system_profile_delete();

-- Log any future deletion of security_profiles into destructive_audit_log
CREATE OR REPLACE FUNCTION public.audit_security_profile_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.destructive_audit_log
    (table_name, row_pk, row_data, db_user, app_user, application_name, txid, occurred_at)
  VALUES
    ('security_profiles',
     OLD.id::text,
     to_jsonb(OLD),
     current_user,
     COALESCE(auth.uid()::text, current_user),
     current_setting('application_name', true),
     txid_current(),
     now());
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_security_profile_delete ON public.security_profiles;
CREATE TRIGGER trg_audit_security_profile_delete
  AFTER DELETE ON public.security_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_security_profile_delete();
