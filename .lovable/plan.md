

# Retroactive vs Prospective Leave Accrual Update

## Problem
When an admin changes the `yearly_entitlement` on an existing monthly accrual policy (e.g., 12 to 6), the system does not recalculate balances. There is no `AFTER UPDATE` trigger on `leave_policy`, and the save uses `upsert` which won't fire an `INSERT` trigger for existing rows.

## Solution
Add an **"Effective Mode"** selector to the UI when saving accrual changes, and a database function that recalculates balances accordingly.

---

### 1. Database Migration

**New function: `recalculate_leave_accrual_on_update`**
- Accepts parameters: `leave_type_id`, `new_yearly_entitlement`, `old_yearly_entitlement`, `update_mode` (`retroactive`, `current_month`, `next_month`)
- Logic by mode:
  - **Retroactive**: Recalculate from January to current month at new rate. Set `opening_balance = new_rate * months_elapsed - used_balance_adjustments`. Update all `leave_accrual_log` entries for this year to reflect new `days_credited`.
  - **Current month forward**: Keep past accrual logs as-is. Only adjust the current month's credit if already applied (diff = new_rate - old_rate, apply delta to `opening_balance`). Future months use new rate automatically via cron.
  - **Next month forward**: No balance changes now. Future cron runs pick up the new `yearly_entitlement` naturally.

**New trigger: `AFTER UPDATE` on `leave_policy`**
- Fires when `yearly_entitlement` or `accrual_type` changes
- Reads the `update_mode` from a new column `last_update_mode` on `leave_policy` (set by frontend before save)
- Calls `recalculate_leave_accrual_on_update`

**Schema change on `leave_policy`**:
- Add column `last_update_mode TEXT DEFAULT 'next_month'` (values: `retroactive`, `current_month`, `next_month`)
- Add column `last_update_effective_date DATE` (optional, for custom effective dates)

### 2. Frontend Changes (LeavePolicyConfig.tsx)

When the admin modifies `yearly_entitlement` or `accrual_type` for a leave type that already has an existing policy:

- Show a modal/inline panel with three radio options:
  1. **Retroactive** -- Recalculate all balances from Jan to now at the new rate
  2. **From current month** -- Apply new rate starting this month; past months unchanged
  3. **From next month** -- New rate applies from next month onward only

- Before the `upsert` call, set `last_update_mode` to the selected option
- The trigger handles the rest server-side

### 3. Flow Summary

```text
Admin changes entitlement (12 → 6)
        │
        ▼
  UI shows mode selector
  ┌─────────────────────────┐
  │ ○ Retroactive           │
  │ ○ From current month    │
  │ ○ From next month       │
  └─────────────────────────┘
        │
        ▼
  Frontend upserts leave_policy
  with last_update_mode = chosen
        │
        ▼
  AFTER UPDATE trigger fires
        │
  ┌─────┴──────────┐
  │ retroactive    │ → Recalc all months, update logs + balances
  │ current_month  │ → Adjust current month delta only
  │ next_month     │ → No balance change, cron uses new rate
  └────────────────┘
```

### 4. Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/migrations/...` | Add columns to `leave_policy`, create `recalculate_leave_accrual_on_update` function, create `AFTER UPDATE` trigger |
| `src/components/attendance/LeavePolicyConfig.tsx` | Detect entitlement changes, show update mode selector before save, include `last_update_mode` in upsert payload |

