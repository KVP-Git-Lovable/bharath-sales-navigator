
-- 1. Remove anon read policies (sensitive data exposure)
DROP POLICY IF EXISTS "Allow anon read distributors for portal" ON public.distributors;
DROP POLICY IF EXISTS "Allow anon read orders for portal" ON public.orders;
DROP POLICY IF EXISTS "Allow anon phone lookup for customer portal" ON public.retailers;
DROP POLICY IF EXISTS "Allow anon read distributor_price_books" ON public.distributor_price_books;
DROP POLICY IF EXISTS "Allow anon read product_schemes for portal" ON public.product_schemes;

-- 2. password_reset_tokens: remove overly permissive ALL policy targeting public
DROP POLICY IF EXISTS "Service role can manage password reset tokens" ON public.password_reset_tokens;
-- service_role bypasses RLS automatically; edge functions using service key still work.

-- 3. permanent_deletion_log: remove broad authenticated SELECT; admin-only SELECT policy already exists
DROP POLICY IF EXISTS "Auth can read permanent_deletion_log" ON public.permanent_deletion_log;

-- 4. recycle_bin: restrict SELECT to system admins only
DROP POLICY IF EXISTS "Auth read recycle_bin" ON public.recycle_bin;
DROP POLICY IF EXISTS "Admins can view recycle_bin" ON public.recycle_bin;
CREATE POLICY "Admins can view recycle_bin"
ON public.recycle_bin
FOR SELECT
TO authenticated
USING (public.is_system_admin(auth.uid()));

-- 5. daily_gps_distance: enable RLS + add owner/admin policies
ALTER TABLE public.daily_gps_distance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own gps distance" ON public.daily_gps_distance;
CREATE POLICY "Users view own gps distance"
ON public.daily_gps_distance
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_system_admin(auth.uid()));
DROP POLICY IF EXISTS "Users insert own gps distance" ON public.daily_gps_distance;
CREATE POLICY "Users insert own gps distance"
ON public.daily_gps_distance
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_system_admin(auth.uid()));
DROP POLICY IF EXISTS "Users update own gps distance" ON public.daily_gps_distance;
CREATE POLICY "Users update own gps distance"
ON public.daily_gps_distance
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_system_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_system_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete gps distance" ON public.daily_gps_distance;
CREATE POLICY "Admins delete gps distance"
ON public.daily_gps_distance
FOR DELETE
TO authenticated
USING (public.is_system_admin(auth.uid()));

-- 6. pm_support_requests: enable RLS + scope to owner/admin
ALTER TABLE public.pm_support_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own pm support requests" ON public.pm_support_requests;
CREATE POLICY "Users manage own pm support requests"
ON public.pm_support_requests
FOR ALL
TO authenticated
USING (auth.uid() = requested_by OR public.is_system_admin(auth.uid()))
WITH CHECK (auth.uid() = requested_by OR public.is_system_admin(auth.uid()));

-- 7. user_roles: prevent self-assignment / privilege escalation
DROP POLICY IF EXISTS "Users can insert own data" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own data" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete own data" ON public.user_roles;
-- Admin-only management policy ("Admins can manage roles") already exists.

-- 8. attendance summary tables: remove broad {public} ALL policies
DROP POLICY IF EXISTS "System can manage daily summary" ON public.attendance_daily_admin_summary;
DROP POLICY IF EXISTS "System can manage monthly summary" ON public.attendance_user_monthly_summary;
-- service_role still bypasses RLS for cron/system jobs.

-- 9. packing list tables: remove broad {public} ALL policies
DROP POLICY IF EXISTS "Users can manage packing lists" ON public.packing_lists;
DROP POLICY IF EXISTS "Users can manage packing list items" ON public.packing_list_items;
DROP POLICY IF EXISTS "Users can manage packing list assignments" ON public.packing_list_assignments;
DROP POLICY IF EXISTS "Users can view packing list assignments" ON public.packing_list_assignments;
-- Tighter authenticated SELECT/INSERT/UPDATE policies already exist on these tables.
