-- product_schemes had RLS enabled with SELECT, INSERT and DELETE policies but
-- NO UPDATE policy. With RLS on, an UPDATE that matches no policy is denied
-- silently: 0 rows affected, no error raised, PostgREST returns success. The
-- UI reported "saved" while nothing changed — schemes could be created and
-- deleted but never edited.
--
-- Additive only: creates one policy. No table, column, data or existing policy
-- is touched.
--
-- Gating matches the project standard and staging's schemes_update:
--   user_has_permission(auth.uid(), 'action_scheme_edit', 'can_edit')
-- Verified present in production — 4 profile rows, can_edit=true for
-- Field Sales Executive (18 users) and System Administrator (9 users).
-- Product Manager (amin) and Sales Manager (Harshith) have can_edit=false and
-- will remain blocked until those permission rows are changed.

CREATE POLICY schemes_update ON public.product_schemes
  FOR UPDATE TO authenticated
  USING (user_has_permission(auth.uid(), 'action_scheme_edit', 'can_edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'action_scheme_edit', 'can_edit'));