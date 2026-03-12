
# Scalable Expense Approval Policy — Enterprise Upgrade

## Status: ✅ Implemented

## Summary
Upgraded the expense approval system from a single global policy to an enterprise-grade, configuration-driven model with categories, workflows, conditional rules, and **Expense Groups** for scalable multi-user policy management.

## What Was Done

### Phase 1: Database Schema ✅
- Created `expense_categories` — admin-configurable categories with receipt requirements and limits
- Created `approval_workflows` — named workflow definitions with sequential/parallel modes
- Created `workflow_steps` — ordered steps per workflow (manager / specific user / hierarchy level)
- Created `expense_approval_rules` — condition-based routing (amount range / category / always) to workflows
- All tables have RLS: read by authenticated, write by admin only
- Seeded default categories and a "Manager Approval" default workflow

### Phase 2: Updated Trigger ✅
- `trigger_create_expense_approval_request()` now performs rule-based workflow resolution

### Phase 3: Admin UI ✅
- **Expense Categories Card** — CRUD table in ExpensePolicyConfig
- **Approval Workflows Card** — Create workflows with steps, set default
- **Approval Rules Card** — Priority-based rules mapping conditions to workflows

### Phase 4: Submission UI ✅
- `AdditionalExpenses.tsx` now fetches categories from `expense_categories` table

### Phase 5: Expense Groups ✅ (NEW)
- **`expense_groups` table** — Named groups with TA/DA policy values (ta_type, fixed_ta_amount, da_amount, ta_per_km_rate)
- **`expense_group_members` table** — Many-to-many junction mapping users to groups
- **Resolution hierarchy updated**: User Override > **Group Override** > Team (Manager) Override > Global Default
- **ExpenseGroupsConfig UI** — Full CRUD for groups + multi-user member management dialog
- **All callers updated** — EditBeatModal, MyBeats, ProductivityTracking, TeamExpenseSummary, BeatAllowanceManagement, ExpenseMonthlySummary, useMonthlyExpenseSummary

## What Stays Unchanged
- `approval_requests`, `approval_steps`, `approval_audit_log` — untouched
- `process_approval_step()` — works as-is
- `trigger_sync_entity_status()` — works as-is
- TA/DA calculation logic — untouched
- ExpenseApprovals page — works as-is
