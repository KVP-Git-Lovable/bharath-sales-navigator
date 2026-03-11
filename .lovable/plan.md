

## Plan: Fix Expense Approval & Enhance Approval UI

### Problems Identified

1. **Approval fails (RLS issue)**: The `Managers can approve reject subordinate expenses` policy has `USING(status = 'submitted' ...)` but no explicit `WITH CHECK`. PostgreSQL defaults `WITH CHECK` to the `USING` expression, so when the status changes to `manager_approved` or `rejected`, the updated row no longer satisfies the check and the update is silently rejected.

2. **No detail view for expense**: The approval card shows basic info but lacks the ability to view full details (bill attachment, description, etc.) in an expanded view.

3. **No approver info or "Completed" section**: After approval, there is no display of who approved/rejected, and processed items are not clearly separated as "Completed Approvals."

---

### Changes

#### 1. Fix RLS Policy (SQL Migration)

Drop and recreate the manager UPDATE policy with a proper `WITH CHECK` that allows the new status values:

```sql
DROP POLICY "Managers can approve reject subordinate expenses" ON additional_expenses;

CREATE POLICY "Managers can approve reject subordinate expenses"
ON additional_expenses FOR UPDATE TO authenticated
USING (
  user_id IN (
    SELECT subordinate_user_id FROM get_all_subordinates(auth.uid())
    WHERE level > 0
  )
)
WITH CHECK (
  user_id IN (
    SELECT subordinate_user_id FROM get_all_subordinates(auth.uid())
    WHERE level > 0
  )
);
```

This removes the `status = 'submitted'` restriction from the policy (the application code already enforces `.eq('status', 'submitted')` in the update query).

#### 2. Enhance Expense Approval Card with Detail View (`TeamExpenseSummary.tsx`)

- When a user taps on an expense card, open a **detail dialog** showing:
  - Employee name, date, category, amount
  - Full description
  - Bill attachment (viewable via signed URL with an image preview or "View Bill" button)
  - Approve/Reject buttons within the dialog
- For processed expenses, show **who approved/rejected** (fetch `approved_by` profile name) and the timestamp.

#### 3. Separate "Completed Approvals" Section (`TeamExpenseSummary.tsx`)

- Rename "Processed" section to **"Completed Approvals"**
- Show approver name and action timestamp on each completed card
- Fetch approver names by querying `profiles` for the `approved_by` IDs in the processed expenses

### Files to Modify

- **New migration SQL**: Fix RLS policy for `additional_expenses`
- **`src/components/expenses/TeamExpenseSummary.tsx`**: Add detail dialog, approver info display, rename "Processed" to "Completed Approvals"

