

## Fix: Approval Workflow Not Working for Leave & Regularization

### Problem
The approval engine functions and triggers exist in migration files but **were never applied to the production database**. Specifically:

- **Missing functions**: `get_reporting_chain`, `create_approval_request`, `process_approval_step`, `trigger_create_leave_approval_request`, `trigger_create_regularization_approval_request`, `trigger_sync_entity_status`, `auto_approve_regularization`
- **Missing triggers**: `trg_leave_approval_request` on `leave_applications`, `trg_regularization_approval_request` on `regularization_requests`, `trg_sync_entity_status` on `approval_requests`, `trg_auto_approve_regularization` on `regularization_requests`
- **Result**: When amin submits a leave, no `approval_request` or `approval_steps` rows are created, so Ajay Prabhu (the manager) sees nothing in Team Approvals
- **7 pending leaves** and **1 pending regularization** currently have no approval records

### Reporting Hierarchy (confirmed)
- **amin** → manager: **Ajay Prabhu**
- **Ajay** → manager: **Ajay Prabhu**
- **Ajay Prabhu** → no manager

### Plan

**Step 1: New database migration** — install the full approval engine

Create a single migration that:

1. Creates `get_reporting_chain(uuid)` — recursive CTE walking `employees.manager_id` upward
2. Creates `create_approval_request(text, uuid, uuid)` — builds approval_request + steps from reporting chain, respecting `approval_config.max_levels`. For single-level manager mode, creates 1 step per manager in chain (any can approve via parallel mode)
3. Creates/replaces `process_approval_step` — parallel mode: any approver acts, result is final, other steps are skipped
4. Creates trigger `trg_leave_approval_request` (AFTER INSERT on `leave_applications`) — calls `create_approval_request('leave', ...)`
5. Creates trigger `trg_regularization_approval_request` (AFTER INSERT on `regularization_requests`) — checks `regularization_policy.approval_mode`:
   - If `auto`: sets status to `approved`, skips engine
   - If `manager`: calls `create_approval_request('regularization', ...)`
6. Creates trigger `trg_sync_entity_status` (AFTER UPDATE on `approval_requests`) — syncs approved/rejected status back to `leave_applications` and `regularization_requests`
7. Adds `approval_mode` column to `approval_config` if missing
8. Backfills the 7 orphan pending leaves and 1 orphan pending regularization with proper approval records

**Step 2: No frontend changes needed**

The existing UI code already:
- Queries `approval_steps` joined with `approval_requests` for pending approvals
- Calls `process_approval_step` RPC for approve/reject actions
- Shows legacy fallback for regularizations not in the engine
- The `RegularizationPolicyConfig.tsx` already has the Approval Mode dropdown (auto/manager/multi_level)

### After Fix
- All new leave applications will auto-create approval workflow records
- All new regularization requests respect the policy's `approval_mode` setting
- Login as **Ajay Prabhu** to see and approve amin's pending leaves
- The 7+1 existing orphan requests will also appear

### Technical Details

**Files to create/modify:**
- `supabase/migrations/<timestamp>_install_approval_engine.sql` (new)

**No frontend files need changes** — the hooks (`useTeamAttendance`, `useApprovalEngine`) and components (`PendingApprovalsSection`, `TeamApprovalsScreen`) already handle the approval engine flow correctly.

