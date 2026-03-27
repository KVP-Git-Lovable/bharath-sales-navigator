

# Fix: Reporting Manager Not Visible in Admin Dashboard

## Problem
The `employees` table has RLS policies restricting SELECT to `user_id = auth.uid()` only. The Admin Dashboard queries all employees to build the reporting manager column, but only gets the current user's row back.

## Solution
Add an admin SELECT policy to the `employees` table so admins can read all employee records (including `manager_id` mappings).

### Database Migration
```sql
-- Add admin read policy to employees table
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
CREATE POLICY "Admins can view all employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (public.is_system_admin(auth.uid()));
```

This single policy addition will allow admin users to fetch all employee rows, which the Admin Dashboard already uses to build the user→manager mapping. No frontend changes needed — the existing code at `AdminDashboard.tsx:263-295` already fetches from `employees` and joins with `profiles` to display manager names.

## Impact
- Reporting Manager column in Admin Dashboard will show correct names
- Non-admin users still only see their own employee record (existing policy unchanged)
- No frontend code changes required

