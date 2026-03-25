
Goal: Fix leave application so policy is actually enforced (backdated allowed = selectable + submittable) and remove the RPC error shown in your screenshots.

What I found
1) `global_leave_policy` is correctly set (`allow_backdated_leave=true`, `max_backdate_days=29`), so config is saved.
2) QuickApp DB is missing these RPCs:
   - `public.validate_leave_request`
   - `public.get_leave_date_constraints`
   - `public.resolve_effective_leave_policy`
   This matches the error in screenshot 3.
3) In UI (`LeaveApplicationModal.tsx`), when constraints RPC is unavailable, it falls back to `date < today`, which blocks all backdates (screenshot 1 behavior).
4) A legacy DB trigger (`validate_leave_application`) is still active and validates against `leave_policy.backdated_days_allowed` (currently `0` for active leave types), which can still block backdated inserts even when global policy allows them.

Implementation plan
1) Add a new forward migration (new timestamp) to sync QuickApp with staging policy-RPC logic
   - Create/replace:
     - `resolve_effective_leave_policy`
     - `validate_leave_request`
     - `get_leave_date_constraints`
   - Keep `validate_leave_request` signature exactly as frontend expects:
     `(p_user_id uuid, p_leave_type_id uuid, p_start_date date, p_end_date date, p_is_half_day boolean)`
   - Add execute grants for `authenticated` and reload PostgREST schema cache.

2) Align trigger-based validation with the same policy source (remove legacy conflict)
   - Update `validate_leave_application` trigger function to validate using effective policy (global + override), not old `leave_policy.backdated_days_allowed/min_days_advance_notice` fields.
   - Ensure update checks exclude the same row to avoid false overlap on edits.
   - Keep server-side safety for overlap/balance/day calculation consistent with RPC.

3) Frontend resilience updates in `src/components/LeaveApplicationModal.tsx`
   - Do not silently treat missing constraints as “no backdate allowed”.
   - If leave type is selected but constraints RPC failed, show clear policy-load error and block submit with actionable message.
   - Fetch only active leave types (`.eq('is_active', true)`) so inactive types don’t appear.

4) Hook consistency cleanup in `src/hooks/useGlobalLeavePolicy.ts`
   - Fix incorrect mapping where `max_backdate_days` is currently derived from `min_notice_period_days`.
   - Return/use explicit backdate-day value from constraints payload for accurate downstream behavior.

Validation checklist after fix
- Open Apply Leave modal: no RPC error banner.
- With backdated policy = true and max = 29:
  - Past dates within 29 days are selectable.
  - Older past dates are disabled/rejected with proper message.
- Submit backdated leave: insert succeeds when within policy.
- Future leave apply/cancel flow still behaves correctly in calendar.
- SQL sanity check confirms the 3 RPCs exist in `public` and are executable.

Technical details (for implementation)
- Files to update:
  - `supabase/migrations/<new_timestamp>_sync_leave_policy_rpcs.sql` (new)
  - `src/components/LeaveApplicationModal.tsx`
  - `src/hooks/useGlobalLeavePolicy.ts`
- Important: do not edit old migration timestamps; create a new forward migration so it always applies in QuickApp.
