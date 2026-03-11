
# Expense Approval Workflow for Additional Expenses

## Status: ✅ Implemented

## Summary
Added an approval lifecycle to Additional Expenses only. TA and DA remain auto-calculated with no approval. Additional expenses get a draft → submitted → manager_approved → rejected → paid status flow.

## What Was Done

### Phase 1: Database ✅
- Added `status`, `submitted_at`, `approved_by`, `approved_at`, `rejection_reason` columns to `additional_expenses`
- RLS policies: users can only edit/delete draft expenses; managers can approve/reject subordinates' submitted expenses; admins have full access

### Phase 2: User-Facing ✅
- `AdditionalExpenses.tsx`: Status badges on saved expenses, delete restricted to draft only
- `BeatAllowanceManagement.tsx`: Submit Expenses button (bulk submits all draft in date range), Status column in additional expenses tab

### Phase 3: Manager Approval Page ✅
- `ExpenseApprovals.tsx` at `/expenses/approvals`: Filters by status/date/employee, approve/reject with reason dialog, employee summary cards

### Phase 4: Summary Updates ✅
- `ExpenseSummaryBoxes.tsx`: Only counts `manager_approved` or `paid` additional expenses in totals

### Phase 5: Navigation ✅
- Route added in `App.tsx`
- "Expense Approvals" link added in Navbar

## What Was NOT Changed
- TA calculation logic (auto from beat or fixed)
- DA calculation logic (auto from attendance)
- `expense_master_config` admin settings
- Existing `approval_requests` / `approval_steps` engine
