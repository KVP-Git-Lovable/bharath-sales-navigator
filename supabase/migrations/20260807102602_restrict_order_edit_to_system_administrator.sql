-- Order editing: enable the feature, restrict it to System Administrator only.
--
-- Before: edit_enabled=false blocked everyone, but order_edit.can_edit was true
-- for all four security profiles, so switching the feature on would have handed
-- editing to 21 non-admin users as well.
--
-- Changes:
--   1. operations_config.edit_enabled  false -> true
--   2. operations_config.edit_who      'own' -> 'view_all'
--      ('own' would let an admin edit only orders they placed themselves,
--       which defeats editing a rep's order from the Operations panel.
--       'view_all' additionally requires order_edit/can_view_all, which
--       System Administrator already has.)
--   3. order_edit.can_edit -> false for Field Sales Executive (19 users),
--      Product Manager (1) and Sales Manager (1). System Administrator (9)
--      keeps can_edit = true.
--
-- can_read is left untouched so the other profiles can still see order data;
-- only the ability to edit is withdrawn. No order, item or invoice row is
-- modified by this migration.

UPDATE public.operations_config
SET edit_enabled = true,
    edit_who     = 'view_all'
WHERE id = 1;

UPDATE public.profile_object_permissions pop
SET can_edit = false,
    can_modify_all = false
FROM public.security_profiles sp
WHERE sp.id = pop.profile_id
  AND pop.object_name = 'order_edit'
  AND sp.name <> 'System Administrator';