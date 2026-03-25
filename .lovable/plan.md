

## Staging vs Dev Comparison - Results

### Already aligned (no action needed)
- **Triggers**: All 3 staging triggers are present in Dev (trg_leave_approval_request, trg_regularization_approval_request, trg_sync_entity_status). Additional Dev triggers (validate_leave, update_balance, mark_attendance) are also present.
- **Primary keys**: All 4 tables have PKs.
- **Foreign keys**: approval_steps → approval_requests and approval_audit_log → approval_requests both exist.
- **Indexes**: All performance indexes present.
- **Functions**: create_approval_request, process_approval_step, get_reporting_chain, trigger functions all exist.

### One remaining blocker: Missing RLS Policies

RLS is enabled on all 4 approval tables but **zero policies exist**. Staging has exactly 10 policies. This is why the frontend returns empty results.

### Plan: Replicate staging RLS policies exactly

Single migration file: `supabase/migrations/<timestamp>_add_approval_rls_policies.sql`

Policies to create (copied verbatim from staging):

**approval_requests (4 policies):**
1. `Users can view their own approval requests` - SELECT where `requester_id = auth.uid()`
2. `Approvers can view requests at their step` - SELECT where exists matching step with `approver_id = auth.uid()`
3. `Users can insert approval requests` - INSERT where `auth.uid() IS NOT NULL`
4. `Service can update approval requests` - UPDATE where `auth.uid() IS NOT NULL`

**approval_steps (3 policies):**
1. `Approvers can view their own steps` - SELECT where `approver_id = auth.uid()`
2. `Requesters can view their steps` - SELECT where exists matching request with `requester_id = auth.uid()`
3. `Service can manage steps` - ALL where `auth.uid() IS NOT NULL`

**approval_audit_log (3 policies):**
1. `Users can view own audit logs` - SELECT where `performed_by = auth.uid()` or requester on the request
2. `Approvers can view audit for their steps` - SELECT where exists matching step with `approver_id = auth.uid()`
3. `Service can insert audit logs` - INSERT where `auth.uid() IS NOT NULL`

**approval_config (2 policies):**
1. `Authenticated can read config` - SELECT where `auth.role() = 'authenticated'`
2. `Admins can manage config` - ALL where `has_role(auth.uid(), 'admin'::app_role)`

Note: The `has_role` function reference in the config admin policy — I will verify it exists in Dev before using it, and use a safe fallback if not.

End migration with `NOTIFY pgrst, 'reload schema';`.

No frontend changes needed.

