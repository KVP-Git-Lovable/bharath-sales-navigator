

## Root Cause: Infinite RLS Recursion

The network requests reveal the exact error:
```
500: "infinite recursion detected in policy for relation "approval_requests""
```

The RLS policies we added create a circular dependency:
- `approval_requests` SELECT policy subqueries into `approval_steps`
- `approval_steps` SELECT policy subqueries back into `approval_requests`
- PostgreSQL detects this cycle and returns a 500 error

There is also a **bug** in the policy condition: `s.approval_request_id = s.id` references `s` twice instead of the outer table. It should be `s.approval_request_id = approval_requests.id`.

The frontend fallback (separate queries) also fails because the `approval_steps` query alone triggers the recursion through its own "Requesters can view their steps" policy.

## Fix

Create a single migration that:

1. **Drop the 2 recursive policies**:
   - `"Approvers can view requests at their step"` on `approval_requests`
   - `"Requesters can view their steps"` on `approval_steps`

2. **Create 2 SECURITY DEFINER helper functions** (bypass RLS, breaking the cycle):
   - `is_approver_for_request(request_id uuid)` — checks if `auth.uid()` has a step on the given request
   - `is_requester_for_step(step_approval_request_id uuid)` — checks if `auth.uid()` is the requester on the given approval request

3. **Recreate the 2 policies using the helper functions** instead of inline subqueries, which avoids the recursion

4. Similarly fix the `approval_audit_log` policies that reference these tables (they may also recurse)

5. `NOTIFY pgrst, 'reload schema'`

### Technical Detail

```sql
-- Helper: check if current user is an approver for a given request
CREATE OR REPLACE FUNCTION public.is_approver_for_request(p_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM approval_steps
    WHERE approval_request_id = p_request_id
      AND approver_id = auth.uid()
  );
$$;

-- Helper: check if current user is the requester for a step's request
CREATE OR REPLACE FUNCTION public.is_requester_for_step(p_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM approval_requests
    WHERE id = p_request_id
      AND requester_id = auth.uid()
  );
$$;
```

Then replace the policies:
```sql
-- approval_requests: approvers can view
CREATE POLICY "Approvers can view requests at their step"
  ON approval_requests FOR SELECT
  USING (is_approver_for_request(id));

-- approval_steps: requesters can view
CREATE POLICY "Requesters can view their steps"
  ON approval_steps FOR SELECT
  USING (is_requester_for_step(approval_request_id));
```

No frontend changes needed. The existing fallback logic will also start working once the recursion is resolved.

