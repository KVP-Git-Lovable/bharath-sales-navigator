

# Scalable Expense Approval Policy — Integrated with Existing Approval Engine

## Problem

Currently, additional expense approvals use a bespoke flow: any manager in the hierarchy (all levels) can directly flip `additional_expenses.status` from `submitted` to `manager_approved`. This bypasses the existing multi-level `approval_requests` / `approval_steps` engine used for leaves and regularizations.

## Solution

Plug expenses into the **same approval engine** already powering leave and regularization approvals, and add an **Expense Approval Policy** config card to the Expense Master admin page.

## Architecture

```text
┌─────────────────────────────────────┐
│   approval_config (existing table)  │
│   + row: entity_type = 'expense'    │
│   + approval_mode (auto/manager/    │
│     multi_level)                    │
│   + max_levels                      │
└──────────────┬──────────────────────┘
               │ on submit
               ▼
┌──────────────────────────────────────┐
│  create_approval_request('expense') │
│  → approval_requests + steps built  │
│    from reporting chain             │
└──────────────┬───────────────────────┘
               │ on approve/reject
               ▼
┌──────────────────────────────────────┐
│  trigger_sync_entity_status()       │
│  + new ELSIF for 'expense'          │
│  → updates additional_expenses      │
│    status accordingly               │
└──────────────────────────────────────┘
```

## Changes

### 1. Database — Add expense to approval_config + sync trigger

- **Insert** a new row in `approval_config`: `entity_type = 'expense'`, `use_full_hierarchy = false`, `max_levels = 1` (default: direct manager only).
- **Add columns** to `approval_config`: `approval_mode` (`auto` | `manager` | `multi_level`) — reusable for all entity types.
- **Update `trigger_sync_entity_status()`** to handle `entity_type = 'expense'`:
  - On approved → update `additional_expenses` set `status = 'manager_approved'`, `approved_by`, `approved_at`.
  - On rejected → update `additional_expenses` set `status = 'rejected'`, `rejection_reason`.
- **Add trigger** on `additional_expenses` INSERT (when status = 'submitted') to call `create_approval_request('expense', ...)` — similar to the leave/regularization triggers.

### 2. Admin UI — Expense Approval Policy Card in ExpensePolicyConfig

Add a new card in `ExpensePolicyConfig.tsx` (alongside TA, DA, Additional Expenses cards):

- **Approval Mode** dropdown: Auto-Approve / Manager Approval / Multi-Level Approval
- **Max Approval Levels** (visible when multi_level): number input (1-5)
- **Description text** explaining each mode
- Reads/writes to `approval_config` where `entity_type = 'expense'`

### 3. Expense Submission Flow — Wire to Approval Engine

Update `AdditionalExpenses.tsx` submission logic:
- When saving with `status = 'submitted'`, the DB trigger will auto-create the approval request (no client-side change needed beyond ensuring status is set correctly).
- If approval_mode is `auto`, the trigger skips creating approval_request and directly sets `manager_approved`.

### 4. Expense Approvals Page — Use Approval Engine

Refactor `ExpenseApprovals.tsx` and `TeamExpenseSummary.tsx`:
- Replace direct `.in('user_id', subordinateIds)` query with `useMyPendingSteps()` filtered to `entityType = 'expense'`.
- Use `processStep()` from `useProcessApprovalStep` instead of direct status updates.
- This automatically scopes approvals to only direct reports (level-appropriate approvers), fixing the Abhishek-sees-Vikyath bug.
- Show approval timeline using `useApprovalTimeline()` in the detail view.

### 5. Keep Backward Compatibility

- Existing draft/submitted expenses without approval_requests continue to show normally.
- The trigger only fires on new inserts, not retroactively.

## Files to Modify

| File | Change |
|------|--------|
| Migration (new) | Add `approval_mode` column to `approval_config`, insert expense row, update `trigger_sync_entity_status`, add expense submission trigger |
| `ExpensePolicyConfig.tsx` | Add "Approval Policy" card reading/writing `approval_config` |
| `ExpenseApprovals.tsx` | Use `useMyPendingSteps` + `useProcessApprovalStep` instead of direct queries |
| `TeamExpenseSummary.tsx` | Same refactor for team summary approvals tab |
| `AdditionalExpenses.tsx` | Minor — ensure submitted expenses rely on trigger, remove any direct approval logic |

