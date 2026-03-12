
# Scalable Expense Approval Policy — Enterprise Upgrade

## Status: ✅ Implemented

## Summary
Upgraded the expense approval system from a single global policy to an enterprise-grade, configuration-driven model with categories, workflows, and conditional rules — all reusing the existing approval engine.

## What Was Done

### Phase 1: Database Schema ✅
- Created `expense_categories` — admin-configurable categories with receipt requirements and limits
- Created `approval_workflows` — named workflow definitions with sequential/parallel modes
- Created `workflow_steps` — ordered steps per workflow (manager / specific user / hierarchy level)
- Created `expense_approval_rules` — condition-based routing (amount range / category / always) to workflows
- All tables have RLS: read by authenticated, write by admin only
- Seeded default categories and a "Manager Approval" default workflow

### Phase 2: Updated Trigger ✅
- `trigger_create_expense_approval_request()` now performs rule-based workflow resolution:
  1. Checks amount-based rules first
  2. Then category-based rules
  3. Then 'always' rules
  4. Falls back to default workflow
  5. Ultimate fallback to old `approval_config` behavior
- Creates `approval_steps` from `workflow_steps` using reporting chain

### Phase 3: Admin UI ✅
- **Expense Categories Card** — CRUD table in ExpensePolicyConfig (name, receipt required, limit, active toggle)
- **Approval Workflows Card** — Create workflows with steps, set default, choose mode (sequential/parallel)
- **Approval Rules Card** — Priority-based rules mapping conditions to workflows

### Phase 4: Submission UI ✅
- `AdditionalExpenses.tsx` now fetches categories from `expense_categories` table
- Falls back to hardcoded list if DB categories unavailable

## What Stays Unchanged
- `approval_requests`, `approval_steps`, `approval_audit_log` — untouched
- `process_approval_step()` — works as-is
- `trigger_sync_entity_status()` — works as-is
- TA/DA calculation logic — untouched
- ExpenseApprovals page — works as-is (reads from approval engine)
