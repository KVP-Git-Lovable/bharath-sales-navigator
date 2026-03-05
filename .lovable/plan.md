

## Plan: Enforce Global Leave Policy in Leave Application Flow

### Problem
The `global_leave_policy` and `leave_type_policy_override` tables are populated via the admin UI, but `LeaveApplicationModal` ignores all configured rules. Users can submit leaves that violate policy settings.

### What We Will Build

**1. New hook: `useEffectiveLeavePolicy`** (in `src/hooks/useGlobalLeavePolicy.ts`)

A utility function that merges global policy with per-type overrides. Given a `leaveTypeId`, returns the effective policy:
- If an override exists with `override_enabled = true`, use override values for `allow_negative_balance`, `max_negative_limit`, `enable_carry_forward`, `max_carry_forward_limit`
- Fall back to global defaults for all other fields (`enable_half_day`, `min_notice_period_days`, `max_continuous_leave_days`, `allow_backdated_leave`, `max_backdate_days`, `is_enabled`)

**2. Update `LeaveApplicationModal.tsx`** to consume the effective policy and enforce rules:

| Rule | Enforcement |
|---|---|
| `is_enabled = false` | Show banner "Leave applications are currently disabled", disable submit button |
| `enable_half_day = false` | Hide the half-day radio option entirely, force `leaveDay = 'full'` |
| `allow_backdated_leave = false` | Calendar disables all past dates (current behavior, but now policy-driven) |
| `allow_backdated_leave = true` | Allow past dates up to `max_backdate_days` ago |
| `min_notice_period_days > 0` | Calendar disables dates within the notice period from today |
| `max_continuous_leave_days` | Validate on submit that `(endDate - startDate + 1) <= max_continuous_leave_days`; show inline error |
| `allow_negative_balance = false` | Fetch user's `leave_balance` for the selected type; block submit if `remaining_balance < days_requested` |
| `allow_negative_balance = true` | Allow negative up to `max_negative_limit`; block if exceeded |

**3. Balance check** -- On submit, query `leave_balance` for the user + selected leave type + current year. Compare `remaining_balance` against `days_requested` and the effective negative balance policy.

### Files to Modify

1. **`src/hooks/useGlobalLeavePolicy.ts`** -- Add `useEffectiveLeavePolicy(leaveTypeId)` hook and a `getEffectivePolicy()` helper
2. **`src/components/LeaveApplicationModal.tsx`** -- Import hooks, add policy-driven UI logic and validation

### No Database Changes Required
All policy tables already exist with the correct schema.

