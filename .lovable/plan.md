

# Fix: Expense Approvals Not Showing for Manager (RLS Recursion)

## Root Cause

The database has the data — Prajwal C's 2 expenses have `approval_requests` (status: pending) assigned to **Ajay Prabhu** as approver. But the manager **cannot read them** due to an RLS recursion deadlock:

- `approval_requests` SELECT policy: "Approvers can view requests" → checks `EXISTS (SELECT 1 FROM approval_steps WHERE approver_id = auth.uid())`
- `approval_steps` SELECT policy: "Requesters can view their steps" → checks `EXISTS (SELECT 1 FROM approval_requests WHERE requester_id = auth.uid())`

These two policies reference each other's tables, causing PostgreSQL to hit an infinite RLS evaluation loop. The query silently returns empty results.

The `useMyPendingSteps` hook's join query fails, the fallback queries `approval_requests` separately but **that also fails** because the same RLS recursion blocks the manager from reading `approval_requests` rows (manager is not the requester, so it needs the cross-table policy).

## Fix — Single Migration

Create two `SECURITY DEFINER` helper functions that bypass RLS internally, then rewrite the policies to use them:

### 1. Helper functions (break the recursion)

```sql
-- Check if user is an approver on any step for a given request
CREATE OR REPLACE FUNCTION public.is_step_approver(p_request_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM approval_steps WHERE approval_request_id = p_request_id AND approver_id = p_user_id
  );
$$;

-- Check if user is the requester of a given approval request
CREATE OR REPLACE FUNCTION public.is_request_participant(p_step_request_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM approval_requests WHERE id = p_step_request_id AND requester_id = p_user_id
  );
$$;
```

### 2. Replace the recursive RLS policies

Drop the two cross-table policies and recreate them using the helper functions:

**On `approval_requests`:**
```sql
DROP POLICY "Approvers can view requests at their step" ON approval_requests;
CREATE POLICY "Approvers can view requests at their step" ON approval_requests
  FOR SELECT USING (public.is_step_approver(id, auth.uid()));
```

**On `approval_steps`:**
```sql
DROP POLICY "Requesters can view their steps" ON approval_steps;
CREATE POLICY "Requesters can view their steps" ON approval_steps
  FOR SELECT USING (public.is_request_participant(approval_request_id, auth.uid()));
```

## Impact

- Manager (Ajay Prabhu) will immediately see Prajwal C's pending expenses in the Approvals tab
- All existing approval flows (leave, regularization, expense) benefit from this fix
- No frontend changes needed

| Change | Type |
|---|---|
| 2 SECURITY DEFINER helper functions + 2 replaced RLS policies | DB Migration |

