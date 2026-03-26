

# Fix Expense Approval System — Missing DB Functions & Triggers

## Problem

The expense approval system has all the right tables, functions, and RLS policies, but is **non-functional** because:

1. **`get_reporting_chain()` function is missing** — Despite the migration file existing, the function doesn't exist in the database. Every approval function depends on it.
2. **No triggers exist on any table** — Zero triggers in the entire public schema. Specifically missing:
   - `tr_expense_approval_request` on `additional_expenses` (creates approval request when expense is submitted)
   - `trg_sync_entity_status` on `approval_requests` (syncs approval/rejection back to the entity table)

Without these, submitting an expense does nothing (no approval request created), and approving a request doesn't update the expense status.

## What's Already Working

- All tables exist: `approval_requests`, `approval_steps`, `approval_audit_log`, `approval_config`, `expense_categories`, `approval_workflows`, `workflow_steps`, `expense_approval_rules`
- `employees` table has `user_id` and `manager_id` columns
- `additional_expenses` has `status`, `approved_by`, `approved_at`, `rejection_reason` columns
- `approval_config` has an `expense` entry
- Functions exist: `create_approval_request()`, `process_approval_step()`, `trigger_create_expense_approval_request()`, `trigger_sync_entity_status()`
- RLS policies are in place on all approval tables
- All frontend files and routes exist

## Fix — Single Migration

One migration to create the missing function and attach the two critical triggers:

### 1. Recreate `get_reporting_chain()`
```sql
CREATE OR REPLACE FUNCTION public.get_reporting_chain(p_user_id uuid)
RETURNS TABLE(manager_id uuid, level int)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH RECURSIVE chain AS (
    SELECT e.manager_id, 1 AS level
    FROM employees e
    WHERE e.user_id = p_user_id AND e.manager_id IS NOT NULL
    UNION ALL
    SELECT e.manager_id, c.level + 1
    FROM chain c JOIN employees e ON e.user_id = c.manager_id
    WHERE e.manager_id IS NOT NULL AND c.level < 10
  )
  SELECT chain.manager_id, chain.level FROM chain ORDER BY chain.level;
$$;
GRANT EXECUTE ON FUNCTION public.get_reporting_chain(uuid) TO authenticated;
```

### 2. Attach trigger on `additional_expenses` for creating approval requests
```sql
CREATE TRIGGER tr_expense_approval_request
  BEFORE INSERT OR UPDATE ON public.additional_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_expense_approval_request();
```

### 3. Attach trigger on `approval_requests` for syncing status back
```sql
CREATE TRIGGER trg_sync_entity_status
  AFTER UPDATE ON public.approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_entity_status();
```

## Impact

After this migration:
- Submitting an expense → automatically creates `approval_request` + `approval_steps` via the reporting chain
- Manager approving/rejecting → updates `additional_expenses.status` to `manager_approved` or `rejected`
- The `ExpenseApprovals` page will show pending items
- No frontend changes needed

