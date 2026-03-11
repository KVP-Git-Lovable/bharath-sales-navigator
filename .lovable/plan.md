

# Expense Approval Workflow for Additional Expenses

## Summary

Add an approval lifecycle to Additional Expenses only. TA and DA remain auto-calculated with no approval. Additional expenses get a draft → submitted → manager_approved → rejected → paid status flow.

---

## Phase 1: Database Changes

### 1a. Alter `additional_expenses` table — add new columns:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `status` | text | `'draft'` | draft / submitted / manager_approved / rejected / paid |
| `submitted_at` | timestamptz | null | When user submitted for approval |
| `approved_by` | uuid | null | Manager who approved/rejected |
| `approved_at` | timestamptz | null | Timestamp of approval action |
| `rejection_reason` | text | null | Reason if rejected |

### 1b. Update RLS policies on `additional_expenses`

- Keep existing user CRUD policies but restrict UPDATE/DELETE to `status = 'draft'` only (users cannot edit submitted expenses).
- Add SELECT policy for managers: allow managers to read subordinates' expenses (using `get_all_subordinates` function).
- Add UPDATE policy for managers: allow managers to update `status`, `approved_by`, `approved_at`, `rejection_reason` on subordinates' expenses where `status = 'submitted'`.

### 1c. Add approval config (optional)

Register `'expense'` entity type in `approval_config` if using the existing approval engine. However, per the user's design, this is a simpler direct-manager approval (not multi-level), so we'll implement a lightweight approval directly on the table rather than using the `approval_requests` engine.

---

## Phase 2: User-Facing Changes (AdditionalExpenses.tsx + BeatAllowanceManagement.tsx)

### 2a. Update `AdditionalExpenses.tsx`

- New expenses save with `status: 'draft'` (already the DB default).
- Show status badge (Draft / Submitted / Approved / Rejected) on each saved expense.
- Only allow edit/delete when `status = 'draft'`.
- Hide delete button for non-draft expenses.

### 2b. Add "Submit Expenses" button in `BeatAllowanceManagement.tsx`

- In the Additional Expenses tab, add a **"Submit Expenses"** button.
- On click: bulk-update all `draft` expenses in the selected date range to `status = 'submitted'`, `submitted_at = now()`.
- Show confirmation dialog before submitting.
- After submission, expenses become read-only.

### 2c. Update Additional Expenses tab display

- Add a **Status** column to the additional expenses table.
- Color-coded badges: Draft (gray), Submitted (blue), Approved (green), Rejected (red), Paid (purple).
- Filter by status (All / Draft / Submitted / Approved / Rejected).

---

## Phase 3: Manager Expense Approval Page

### 3a. New route: `/expenses/approvals`

Create `src/pages/ExpenseApprovals.tsx`:

- Uses `useSubordinates()` to get team member IDs.
- Fetches `additional_expenses` where `user_id IN (subordinate_ids)` and `status = 'submitted'`.
- Joins with `profiles` to show employee name.

### 3b. UI Layout

- **Filters**: Employee selector, date range, status (Submitted / Approved / Rejected / All).
- **Table columns**: Employee, Date, Category, Amount, Description, Bill (view link), Status, Actions.
- **Actions**: Approve button, Reject button (with reason dialog).
- Approve → updates `status = 'manager_approved'`, `approved_by`, `approved_at`.
- Reject → updates `status = 'rejected'`, `approved_by`, `approved_at`, `rejection_reason`.

### 3c. Team Expense Summary Cards

At the top of the approval page, show per-employee summary:
- Employee Name | TA (auto) | DA (auto) | Additional (submitted) | Total

### 3d. Navigation

- Add link to `/expenses/approvals` from the sidebar/navigation for managers.
- Add route in `App.tsx`.

---

## Phase 4: Summary & Reports Integration

### 4a. Update `ExpenseSummaryBoxes.tsx`

- The "Additional Expenses" summary box should show **only approved** expenses (`status = 'manager_approved'` or `'paid'`).
- Add a separate indicator for pending/submitted expenses.

### 4b. Update `ProductivityTracking.tsx`

- Total Expense calculation: `TA + DA + Approved Additional Expenses` only.

### 4c. Admin Monthly Report

- In `AdminExpenseManagement.tsx`, the productivity/expense view should only count `manager_approved` additional expenses in totals.

---

## Phase 5: Notifications (Optional Enhancement)

- When user submits expenses → notify manager (using existing `emit_notification_event` pattern).
- When manager approves/rejects → notify user.
- This can be added as a trigger on `additional_expenses` status changes.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| New migration SQL | ALTER TABLE + RLS policies |
| `src/components/AdditionalExpenses.tsx` | Add status display, restrict edit/delete to draft |
| `src/components/BeatAllowanceManagement.tsx` | Add Submit button, status column in additional tab |
| `src/pages/ExpenseApprovals.tsx` | **New** — Manager approval page |
| `src/App.tsx` | Add route for `/expenses/approvals` |
| `src/components/ExpenseSummaryBoxes.tsx` | Filter by approved status |
| `src/components/ProductivityTracking.tsx` | Use approved expenses only in totals |
| Navigation component | Add link for managers |

---

## What Will NOT Change

- TA calculation logic (auto from beat or fixed) — untouched
- DA calculation logic (auto from attendance) — untouched
- `expense_master_config` admin settings — untouched
- The existing `approval_requests` / `approval_steps` engine — not used for expenses (keeping it simple with direct status updates)

