

## Leave Policy Engine — Two-Layer Global + Per-Type Override Model

### What We Are Building

Replace the current per-leave-type policy table approach (`AttendancePolicyConfig.tsx`) with a unified Leave Policy page matching the reference image. The structure:

1. **Global Leave Rules** — a single policy row governing all leave types by default
2. **Leave Type Behaviour** — accordion list of active leave types, each with an "Override Global Rules" toggle that reveals per-type override fields

### Current State

- **`leave_policy` table**: One row per leave type with fields like `carry_forward_allowed`, `max_carry_forward`, `negative_balance_allowed`, `sandwich_rule_enabled`, `backdated_days_allowed`, `min_days_advance_notice`
- **`leave_types` table**: Has `allow_half_day`, `is_active`, `yearly_limit`
- **No `global_leave_policy` table exists** — there is no centralized global configuration
- **UI**: `AttendancePolicyConfig.tsx` renders a table of per-type policies with Add/Edit dialog

### Database Changes

**New table: `global_leave_policy`** (singleton — max 1 row)

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `id` | uuid | gen_random_uuid() | PK |
| `is_enabled` | boolean | true | Master toggle |
| `reset_cycle` | text | 'calendar_year' | calendar_year / financial_year / custom |
| `custom_reset_date` | date | null | Only if reset_cycle = custom |
| `allow_negative_balance` | boolean | false | Global default |
| `max_negative_limit` | integer | 0 | Days |
| `enable_carry_forward` | boolean | false | Global default |
| `max_carry_forward_limit` | integer | 0 | Days |
| `carry_forward_expiry_months` | integer | null | null = no expiry |
| `min_notice_period_days` | integer | 0 | Application rule |
| `max_continuous_leave_days` | integer | null | null = unlimited |
| `allow_backdated_leave` | boolean | false | |
| `max_backdate_days` | integer | 0 | |
| `enable_half_day` | boolean | true | |
| `enable_sandwich_rule` | boolean | false | |
| `created_at` / `updated_at` | timestamptz | now() | Audit |

**New table: `leave_type_policy_override`**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `id` | uuid | gen_random_uuid() | PK |
| `leave_type_id` | uuid | FK → leave_types | Unique per type |
| `override_enabled` | boolean | false | Master toggle per type |
| `allow_negative_balance` | boolean | null | null = use global |
| `max_negative_limit` | integer | null | |
| `enable_carry_forward` | boolean | null | |
| `max_carry_forward_limit` | integer | null | |
| `carry_forward_expiry_months` | integer | null | |
| `custom_reset_cycle` | text | null | null = use global |

RLS: Admin-only read/write on both tables. Enable RLS with `has_role(auth.uid(), 'admin')` policies.

### UI Component Structure

**Replace** the current `AttendancePolicyConfig.tsx` content (Leave Entitlements card + dialog) with a new `LeavePolicyConfig.tsx` component. Keep `RegularizationPolicyConfig` as-is below it.

```text
LeavePolicyConfig
├── Header: "Leave Policy" + Save Policy button (top-right)
├── Card: "Global Leave Rules"
│   ├── Section: General Settings
│   │   ├── Enable Leave Management (Switch)
│   │   └── Reset Cycle (Select: Calendar Year / Financial Year / Custom)
│   ├── Section: Balance Behaviour (2-column grid)
│   │   ├── Left: Allow Negative Balance → Max Negative Limit
│   │   │         Enable Carry Forward → Max Carry Forward → Expiry
│   │   └── Right: Min Notice Period, Max Continuous Leave,
│   │              Allow Backdated → Max Backdate Days,
│   │              Enable Half Day, Enable Sandwich Rule
│   └── Section: Application Rules (display summary)
├── Card: "Leave Type Behaviour"
│   └── Accordion (one item per active leave_type)
│       └── Per item:
│           ├── Override Global Rules (Switch)
│           ├── If OFF: "This leave type follows global leave policy rules."
│           └── If ON: Override fields panel (negative balance, carry forward, expiry)
```

### Component Files to Create/Modify

1. **`src/components/attendance/LeavePolicyConfig.tsx`** — New main component
   - Fetches `global_leave_policy` (single row) and `leave_type_policy_override` (all rows)
   - Fetches active `leave_types` for the accordion
   - Single "Save Policy" button saves both global + all override changes in one transaction
   - Uses `Accordion` from radix for leave type list
   - Sections use `Separator` + icon headers matching RegularizationPolicyConfig style

2. **`src/hooks/useGlobalLeavePolicy.ts`** — New hook
   - React Query hook fetching the singleton global policy
   - Similar pattern to `useRegularizationPolicy`

3. **`src/components/attendance/AttendancePolicyConfig.tsx`** — Modify
   - Replace the Leave Entitlements card + dialog with `<LeavePolicyConfig />`
   - Keep `<RegularizationPolicyConfig />` below it
   - Remove the old per-type table, dialog, and related state

### Validation Logic (for leave request processing)

Create a helper function `getEffectiveLeavePolicy(leaveTypeId)`:
- If `leave_type_policy_override` exists with `override_enabled = true`, use override values (falling back to global for any `null` fields)
- Otherwise use `global_leave_policy` values

This function will be used by existing leave validation triggers/functions.

### Migration Plan

- Seed `global_leave_policy` with sensible defaults from current `leave_policy` data
- Auto-create `leave_type_policy_override` rows (with `override_enabled = false`) for each active leave type
- Existing `leave_policy` table remains for entitlement data (yearly_entitlement, accrual_type, monthly_accrual) — it stores **how much** leave is granted, while the new tables store **how leave behaves**

### UI Styling (matching reference image)

- Card with rounded border, subtle background (`bg-muted/30`) for section headers
- Checkbox-style section headers with icons (CheckSquare icon)
- 2-column grid for Balance Behaviour fields
- Bordered sub-cards for grouped settings (e.g., negative balance + its limit inside a bordered box)
- Accordion items with bordered cards, "..." menu buttons for future actions
- Switch toggles using existing `Switch` component
- Select dropdowns for cycle/limit values

