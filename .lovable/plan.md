
Goal: Make pending approvals visible and policy-driven on Attendance → My Team.

What I verified
- You are already logged in as the correct approver user (Ajay Prabhu).
- Pending approval data exists in DB for Ajay (leave requests are present in `approval_steps` + `approval_requests`).
- UI fails because Supabase returns `PGRST200`: no relationship found between `approval_steps` and `approval_requests`.
- Root DB issue: approval tables exist but were created without constraints/indexes (no PK/FK), so PostgREST cannot resolve `approval_requests!inner(...)` joins used by `useTeamAttendance` and `useApprovalEngine`.

Implementation plan
1) Add a new forward migration to repair approval table structure (without data loss)
- Add primary keys to:
  - `approval_requests(id)`
  - `approval_steps(id)`
  - `approval_audit_log(id)`
- Add foreign keys:
  - `approval_steps.approval_request_id -> approval_requests.id ON DELETE CASCADE`
  - `approval_audit_log.approval_request_id -> approval_requests.id`
- Recreate missing performance indexes (request/status/approver/entity).
- Keep existing rows intact (pre-checks already show no duplicate/null/orphan blockers).

2) Refresh PostgREST schema cache
- Include `NOTIFY pgrst, 'reload schema';` in migration so embedded joins start working immediately.

3) Policy alignment hardening (same migration)
- Ensure `approval_config` stays seeded for both `leave` and `regularization` with hierarchy mode enabled (matches your approved “Any manager in hierarchy” behavior).
- Keep regularization `approval_mode` behavior from `regularization_policy` (`auto` vs `manager`) unchanged.

4) Frontend resilience improvement (optional but recommended)
- In `useTeamAttendance` / `useApprovalEngine`, add fallback path:
  - If embedded join fails (`PGRST200`), fetch `approval_steps` and `approval_requests` separately and merge client-side.
- Show a clear toast/error state instead of silently showing zero approvals.

5) Validation after fix
- Login as Ajay Prabhu → Attendance → Team Approvals should show Amin’s pending requests.
- Confirm approve/reject works for both leave and regularization.
- Run SQL sanity checks:
  - FK exists between `approval_steps` and `approval_requests`
  - join query with `approval_requests!inner(...)` returns 200 (not 400)
  - pending rows visible for approver `d7ba12f7-d8a6-4460-8e6e-5c58f9c751d7`.

Technical details
- Files to change:
  - `supabase/migrations/<new_timestamp>_repair_approval_relationships.sql` (new)
  - `src/hooks/useTeamAttendance.ts` (fallback/error handling)
  - `src/hooks/useApprovalEngine.ts` (fallback/error handling)
- No changes to `src/integrations/supabase/types.ts` (generated file).
