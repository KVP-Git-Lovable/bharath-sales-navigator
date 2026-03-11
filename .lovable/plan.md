
# Expense Approval Workflow — Integrated with Approval Engine

## Status: ✅ Implemented (v2 — Scalable Approval Engine)

## Summary
Migrated additional expense approvals from a bespoke direct-update flow to the existing scalable `approval_requests` / `approval_steps` engine (same as leave and regularization). Added configurable approval policy in the Expense Master admin page.

## What Was Done

### Phase 1: Database Migration ✅
- Added `approval_mode` column to `approval_config` (`auto` | `manager` | `multi_level`)
- Inserted `expense` row in `approval_config` (default: `manager`, `max_levels = 1`)
- Created `trigger_create_expense_approval_request()` — fires on INSERT/UPDATE of `additional_expenses` when status becomes `submitted`; if `approval_mode = 'auto'`, auto-approves immediately
- Updated `trigger_sync_entity_status()` to handle `entity_type = 'expense'` — syncs approved/rejected status back to `additional_expenses`

### Phase 2: Admin UI — Approval Policy Card ✅
- Added "Expense Approval Policy" card in `ExpensePolicyConfig.tsx`
- Configurable: Auto-Approve / Manager Approval / Multi-Level Approval
- Max approval levels (1-5) visible in multi-level mode
- Reads/writes `approval_config` where `entity_type = 'expense'`

### Phase 3: Expense Approvals Page ✅
- Refactored `ExpenseApprovals.tsx` to use `useMyPendingSteps()` + `useProcessApprovalStep()` from the approval engine
- No longer queries all subordinates — only shows expenses assigned to current user's approval step
- Fixes the Abhishek-sees-Vikyath bug (scoped to correct hierarchy level)

### Phase 4: Team Summary Approvals Tab ✅
- Refactored `TeamApprovalsList` in `TeamExpenseSummary.tsx` to use approval engine hooks
- Pending expenses sourced from `useMyPendingSteps()` filtered to `entityType = 'expense'`
- Completed approvals fetched from `approval_audit_log`

### Phase 5: Approval Engine Type Update ✅
- Extended `PendingStep.entityType` to include `'expense'` alongside `'leave'` and `'regularization'`

## What Was NOT Changed
- TA calculation logic (auto from beat or fixed)
- DA calculation logic (auto from attendance)
- `AdditionalExpenses.tsx` submission logic (already sets `status = 'submitted'`; DB trigger handles approval request creation)
- Existing draft/submitted expenses without approval_requests continue working (backward compatible)
