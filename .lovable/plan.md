

## Plan: Add Accrual Settings to Leave Type Behaviour UI

### Problem
The Leave Type Behaviour UI only manages behavioral overrides (`leave_type_policy_override`), but accrual configuration (`accrual_type`, `yearly_entitlement`) lives in the legacy `leave_policy` table. Admins must manually insert `leave_policy` records for accrual to work -- there is no UI for it.

### Approach
Extend each leave type's accordion section in `LeavePolicyConfig.tsx` to include **Accrual Settings** (accrual type + yearly entitlement). These fields will persist to `leave_policy` while behavioral overrides continue going to `leave_type_policy_override`. No schema changes needed -- the `leave_policy` table already has the required columns.

### Changes

**1. `src/components/attendance/LeavePolicyConfig.tsx`**

- **Add accrual state**: Create a new state `accrualForms` (`Record<string, { accrual_type: string, yearly_entitlement: number }>`) to track per-leave-type accrual config.
- **Load existing `leave_policy` data**: On mount, fetch from `leave_policy` table and populate `accrualForms` for each leave type. Default to `{ accrual_type: 'yearly', yearly_entitlement: 0 }` if no record exists.
- **Render accrual fields in each accordion item**: Add an "Accrual & Entitlement" section (always visible, not behind the override toggle) with:
  - **Accrual Type** dropdown: `yearly` | `monthly` | `quarterly`
  - **Yearly Entitlement** number input
  - When `monthly` is selected, show computed "Monthly credit: X days/month" helper text
- **Save accrual data in `handleSave`**: For each leave type, upsert into `leave_policy` using `leave_type_id` as the unique key:
  - If a `leave_policy` record exists for that `leave_type_id`, update `accrual_type`, `yearly_entitlement`, `is_active = true`
  - If not, insert a new record with those values plus `is_active = true`
  - This will trigger `trigger_initialize_leave_policy_balances` automatically for new monthly policies, backfilling balances for all active users
- **Invalidate queries**: Add `leave-policies` to the query invalidation list after save.

### UI Layout (per leave type accordion)

```text
┌─────────────────────────────────────────────┐
│ Casual Leave                   [Custom Rules]│
├─────────────────────────────────────────────┤
│ Accrual & Entitlement                        │
│ ┌─────────────────┐ ┌─────────────────────┐ │
│ │ Accrual Type     │ │ Yearly Entitlement  │ │
│ │ [Monthly      ▼] │ │ [12             ]   │ │
│ └─────────────────┘ └─────────────────────┘ │
│ ℹ Monthly credit: 1.00 days/month           │
│                                              │
│ ── Override Global Rules [toggle] ────────── │
│ (existing override fields below)             │
└─────────────────────────────────────────────┘
```

### Key Technical Details
- `leave_policy` has a unique constraint on `leave_type_id` (isOneToOne: true), so upsert via `.upsert()` with `onConflict: 'leave_type_id'` works cleanly.
- The existing DB trigger `trigger_initialize_leave_policy_balances` fires on INSERT to `leave_policy` when `accrual_type = 'monthly'`, auto-backfilling balances from January through current month for all active users.
- No database migration needed -- all required columns (`accrual_type`, `yearly_entitlement`, `is_active`) already exist on `leave_policy`.

