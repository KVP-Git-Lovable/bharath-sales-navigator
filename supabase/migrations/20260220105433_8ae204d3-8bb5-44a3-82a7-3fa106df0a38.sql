
-- Fix 1: Break infinite recursion between approval_requests and approval_steps RLS policies
-- The circular reference: 
--   approval_requests policy queries approval_steps 
--   approval_steps policy queries approval_requests
-- Solution: Create SECURITY DEFINER helper functions that bypass RLS when checking cross-table references

-- Helper: check if a user is an approver for a given approval_request_id (bypasses RLS on approval_steps)
CREATE OR REPLACE FUNCTION public.is_approver_for_request(request_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM approval_steps
    WHERE approval_request_id = request_id
      AND approver_id = user_id
  );
$$;

-- Helper: check if a user is the requester for a given approval_request_id (bypasses RLS on approval_requests)
CREATE OR REPLACE FUNCTION public.is_requester_for_request(request_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM approval_requests
    WHERE id = request_id
      AND requester_id = user_id
  );
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Approvers can view requests at their step" ON public.approval_requests;
DROP POLICY IF EXISTS "Requesters can view their steps" ON public.approval_steps;

-- Recreate without recursion using the SECURITY DEFINER helpers
CREATE POLICY "Approvers can view requests at their step"
ON public.approval_requests FOR SELECT
USING (
  public.is_approver_for_request(id, auth.uid())
);

CREATE POLICY "Requesters can view their steps"
ON public.approval_steps FOR SELECT
USING (
  public.is_requester_for_request(approval_request_id, auth.uid())
);
