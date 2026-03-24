

# Fully Data-Driven Leave Policy Engine

## Problem
Policy **values** are configurable via tables, but policy **logic** (merging, validation, accrual math) is hardcoded in JS (`getEffectivePolicy`, `LeaveApplicationModal` validation) and SQL (`process_monthly_leave_accrual` with hardcoded `/ 12`).

## Solution: Move All Logic to DB Functions, Driven by Config Tables

### Phase 1: Server-Side Policy Resolution

**New DB function:** `resolve_effective_leave_policy(p_user_id UUID, p_leave_type_id UUID)`
- Merges global + override internally, returns flat JSON
- Replaces client-side `getEffectivePolicy()` in `useGlobalLeavePolicy.ts`
- Future override layers (team, user) added here without frontend changes

### Phase 2: Server-Side Validation

**New DB function:** `validate_leave_request(p_user_id, p_leave_type_id, p_start_date, p_end_date, p_half_day, ...)`
- Returns `{ is_valid, error_code, error_message, days_requested, balance_after }`
- Moves all checks out of `LeaveApplicationModal`: balance, negative limit, max continuous days, backdating, notice period
- Frontend becomes a thin UI — calls RPC, shows result

**New DB function:** `get_leave_date_constraints(p_user_id, p_leave_type_id)`
- Returns `{ min_start_date, max_backdate_date, min_notice_date, allow_half_day, max_continuous_days }`
- Frontend date picker uses these values directly — no hardcoded date logic

### Phase 3: Configurable Accrual Engine

**New table: `accrual_config`**

| Column | Type | Purpose |
|--------|------|---------|
| leave_type_id | uuid FK | Links to leave type |
| frequency | text | 'monthly', 'quarterly', 'annual' |
| divisor | integer | 12, 4, 1 — how to split yearly entitlement |
| round_mode | text | 'floor', 'ceil', 'round' |
| prorate_joining | boolean | Prorate for mid-year joiners |
| credit_day | integer | Day of period to credit |

**Modify `process_monthly_leave_accrual`:** Read divisor, rounding, frequency from `accrual_config` instead of hardcoding `/ 12`.

### Phase 4: Frontend Simplification

| File | Change |
|------|--------|
| `useGlobalLeavePolicy.ts` | Replace `getEffectivePolicy` + `useEffectiveLeavePolicy` with single RPC call to `resolve_effective_leave_policy` |
| `LeaveApplicationModal.tsx` | Remove all validation logic; call `validate_leave_request` RPC on submit; call `get_leave_date_constraints` for date picker |
| `LeavePolicyConfig.tsx` | Add accrual config UI (frequency, rounding, prorate dropdowns) |
| Migration file | Create 3 DB functions + `accrual_config` table + update accrual function |

### Result

- **Zero policy logic in frontend** — JS only renders and calls RPCs
- **All rules in DB functions reading config tables** — changes are data updates, not code deploys
- **Future changes** (e.g., 12→6 entitlement, new accrual frequency) require zero code changes

### Execution Order
1. Phase 1 (resolution) — lowest risk, immediate cleanup
2. Phase 2 (validation) — security win, removes client-side bypass
3. Phase 3 (accrual config) — enables flexible accrual without code changes
4. Phase 4 (frontend cleanup) — done incrementally with each phase

