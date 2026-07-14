
-- 1. Recreate table
CREATE TABLE IF NOT EXISTS public.profile_object_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.security_profiles(id) ON DELETE CASCADE,
  object_name text NOT NULL,
  permission_type text NOT NULL DEFAULT 'sub_feature',
  parent_module text,
  can_read boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_view_all boolean NOT NULL DEFAULT false,
  can_modify_all boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique key matches ON CONFLICT used by every seed migration
CREATE UNIQUE INDEX IF NOT EXISTS profile_object_permissions_profile_obj_type_key
  ON public.profile_object_permissions (profile_id, object_name, permission_type);

CREATE INDEX IF NOT EXISTS profile_object_permissions_profile_idx
  ON public.profile_object_permissions (profile_id);

-- 2. Grants (Data API access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_object_permissions TO authenticated;
GRANT ALL ON public.profile_object_permissions TO service_role;

-- 3. Enable RLS
ALTER TABLE public.profile_object_permissions ENABLE ROW LEVEL SECURITY;

-- 4. Policies (drop-if-exists → create for idempotency)
DROP POLICY IF EXISTS "Users can view permissions for their profile"
  ON public.profile_object_permissions;
CREATE POLICY "Users can view permissions for their profile"
  ON public.profile_object_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.profile_id = profile_object_permissions.profile_id
    )
    OR public.is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Only system admins can manage permissions"
  ON public.profile_object_permissions;
CREATE POLICY "Only system admins can manage permissions"
  ON public.profile_object_permissions
  FOR ALL
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

-- 5. Auto-backfill trigger for future is_system=true profiles
CREATE OR REPLACE FUNCTION public.backfill_system_profile_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_system IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profile_object_permissions
    (profile_id, object_name, permission_type, parent_module,
     can_read, can_create, can_edit, can_delete, can_view_all, can_modify_all)
  SELECT NEW.id, x.object_name, x.permission_type, MAX(x.parent_module),
         true, true, true, true, true, true
  FROM public.profile_object_permissions x
  GROUP BY x.object_name, x.permission_type
  ON CONFLICT (profile_id, object_name, permission_type) DO UPDATE
    SET can_read = true, can_create = true, can_edit = true,
        can_delete = true, can_view_all = true, can_modify_all = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backfill_system_profile ON public.security_profiles;
CREATE TRIGGER trg_backfill_system_profile
AFTER INSERT ON public.security_profiles
FOR EACH ROW EXECUTE FUNCTION public.backfill_system_profile_permissions();
