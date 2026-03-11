

# Scalable Expense Approval Policy — Enterprise Upgrade

## Current State
- `approval_config` has one row for `expense` with `approval_mode` (auto/manager/multi_level) and `max_levels`
- Categories are hardcoded in `AdditionalExpenses.tsx`
- Single global approval workflow — no category or amount-based routing
- Approval engine (approval_requests/steps) works well and should be reused

## What We'll Build

### Phase 1: Expense Categories (Admin-Configurable)

**New table: `expense_categories`**
- `id`, `name`, `receipt_required` (bool), `limit_amount` (nullable), `is_active`, `sort_order`
- Replaces hardcoded `EXPENSE_CATEGORIES` array in `AdditionalExpenses.tsx`
- Admin UI: CRUD card in ExpensePolicyConfig to add/edit/toggle categories

### Phase 2: Approval Workflow Builder

**New table: `approval_workflows`**
- `id`, `workflow_name`, `entity_type` (default 'expense'), `approval_mode` ('sequential' | 'parallel_any' | 'parallel_all'), `is_active`, `is_default`

**New table: `workflow_steps`**
- `id`, `workflow_id` (FK), `step_number`, `approver_type` ('manager' | 'specific_user' | 'hierarchy_level'), `approver_role` (nullable text), `specific_user_id` (nullable FK), `hierarchy_level` (nullable int)

Admin UI: A card in ExpensePolicyConfig where admin can:
- Create named workflows with ordered steps
- Each step: pick approver type (Manager / Specific User / Hierarchy Level N)
- Choose mode: Sequential or Parallel (any one / all required)

### Phase 3: Conditional Approval Rules

**New table: `expense_approval_rules`**
- `id`, `rule_name`, `condition_type` ('amount_range' | 'category'), `condition_value` (jsonb — e.g. `{"min": 500, "max": 2000}` or `{"category_id": "..."}`)
- `workflow_id` (FK to approval_workflows)
- `priority` (int, lower = checked first)

Logic: When expense is submitted, the trigger checks rules in priority order. First matching rule's workflow is used. If no rule matches, fall back to the default workflow.

### Phase 4: Engine Integration

Update `trigger_create_expense_approval_request()` to:
1. Look up the submitted expense's category and amount
2. Query `expense_approval_rules` in priority order for a match
3. If matched, use the rule's `workflow_id` to get steps from `workflow_steps`
4. If no match, use the default workflow (or fall back to current `approval_config` behavior)
5. Create `approval_request` + `approval_steps` from the workflow steps
6. Handle auto-approve if workflow has zero steps

### Phase 5: Wire Categories to Submission UI

Update `AdditionalExpenses.tsx`:
- Fetch categories from `expense_categories` instead of hardcoded array
- Enforce `receipt_required` and `limit_amount` per category on the client

## Admin UI Layout (Configuration Tab)

```text
Configuration Tab in Expense Master
├── TA Policy Card (existing)
├── DA Policy Card (existing)
├── Additional Expenses Policy Card (existing)
├── Expense Categories Card (NEW)
│   └── Table: Name | Receipt Required | Limit | Active | Actions
├── Approval Workflows Card (NEW)
│   └── List workflows → click to edit steps
│   └── Each step: Step # | Approver Type | Mode
├── Approval Rules Card (NEW)
│   └── Table: Rule | Condition | Workflow | Priority
└── Policy Notes Card (existing)
```

## Database Changes Summary

| Table | Action |
|-------|--------|
| `expense_categories` | CREATE — admin-configurable categories |
| `approval_workflows` | CREATE — named workflow definitions |
| `workflow_steps` | CREATE — ordered steps per workflow |
| `expense_approval_rules` | CREATE — condition → workflow mapping |
| `trigger_create_expense_approval_request()` | UPDATE — rule-based workflow resolution |

## Files to Modify/Create

| File | Change |
|------|--------|
| Migration (new) | 4 new tables + updated trigger |
| `ExpensePolicyConfig.tsx` | Add Categories, Workflows, Rules cards |
| `AdditionalExpenses.tsx` | Fetch categories from DB, enforce limits |
| `useApprovalEngine.ts` | No change needed — engine stays generic |

## What Stays Unchanged
- `approval_requests`, `approval_steps`, `approval_audit_log` — untouched
- `process_approval_step()` — works as-is
- `trigger_sync_entity_status()` — works as-is
- TA/DA calculation logic — untouched
- ExpenseApprovals page — works as-is (reads from approval engine)

