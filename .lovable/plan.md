
# Fix Leave Application Approval - RLS Policy Issue

## Problem Identified
The leave application approval fails because the Row Level Security (RLS) policies on the `leave_applications` table only allow users to update **their own** leave applications. There is no policy that allows admins or managers to approve/reject other employees' leave requests.

**Error**: `"new row violates row-level security policy for table 'leave_applications'"`

## Current RLS Policies (Insufficient)
| Policy | Command | Condition |
|--------|---------|-----------|
| Users can create their own leave applications | INSERT | `user_id = auth.uid()` |
| Users can update their own pending leave applications | UPDATE | `user_id = auth.uid() AND status = 'pending'` |
| Users can view their own leave applications | SELECT | `user_id = auth.uid()` |

**Missing**: No policy for admins/managers to view or update employee leave applications.

## Solution
Add two new RLS policies to the `leave_applications` table:

1. **Admin SELECT Policy**: Allow admins to view all leave applications
2. **Admin UPDATE Policy**: Allow admins to update (approve/reject) leave applications

Both policies will use the existing `has_role(auth.uid(), 'admin'::app_role)` function that's already used across other tables for admin access.

## Implementation

**Step 1: Create a new migration file**

Add an SQL migration with these statements:

```sql
-- Allow admins to view all leave applications
CREATE POLICY "Admins can view all leave applications"
  ON public.leave_applications
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any leave application (approve/reject)
CREATE POLICY "Admins can update leave applications"
  ON public.leave_applications
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## Files to Create/Modify
1. **Create**: `supabase/migrations/[timestamp]_add_admin_leave_policies.sql` - New migration with admin RLS policies

## Expected Result After Fix
- Admins will be able to see all employee leave applications in the Leave Management tab
- Clicking the approve (checkmark) or reject (X) buttons will successfully update the leave status
- Regular users will still only see and manage their own leave applications

## Technical Note
The `has_role` function already exists in the database and is used consistently across other tables (holidays, products, user_roles, branding_requests, etc.) for admin permission checks.
