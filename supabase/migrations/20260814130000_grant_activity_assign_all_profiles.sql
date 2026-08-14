-- action_activity_create was already true for every existing profile here
-- (Field Sales Executive, Product Manager, Sales Manager, System
-- Administrator) — no change needed for event creation itself, which already
-- works for all roles in production.
--
-- action_activity_assign ("Assign activities to team", checked by
-- src/pages/ActivityCoordinator.tsx) only had a row for System Administrator.
-- Extending it to the other three, matching the staging grant.
insert into public.profile_object_permissions
  (profile_id, object_name, permission_type, can_read, can_create, can_edit, can_delete, parent_module)
select sp.id, 'action_activity_assign', 'action', true, true, true, true, 'my_visit'
  from public.security_profiles sp
 where sp.name in ('Field Sales Executive', 'Product Manager', 'Sales Manager')
   and not exists (
     select 1 from public.profile_object_permissions pop
      where pop.profile_id = sp.id and pop.object_name = 'action_activity_assign'
        and pop.permission_type = 'action'
   );
