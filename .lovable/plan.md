

# 3-Level TA/DA Configuration Hierarchy

## Answer to Your Question

**Admin Expense Master > Configuration**: Yes, UI changes needed -- add User-level and Manager-level config sections.

**User Expense Tab**: No UI changes needed. The expense tab displays calculated TA/DA values. Once the calculation engine uses the new hierarchy, the correct amounts will flow through automatically. No UX or linking changes required on the user side.

## What Changes Where

### 1. Database: Two New Tables (Migrations)

**`user_expense_config`** -- per-user overrides:
| Column | Type |
|--------|------|
| id | uuid PK |
| user_id | uuid FK → auth.users (unique) |
| ta_type | text ('fixed' / 'from_beat') |
| fixed_ta_amount | numeric |
| da_amount | numeric |
| created_at / updated_at | timestamptz |

**`team_expense_config`** -- per-manager/team overrides:
| Column | Type |
|--------|------|
| id | uuid PK |
| manager_id | uuid FK → auth.users (unique) |
| ta_type | text ('fixed' / 'from_beat') |
| fixed_ta_amount | numeric |
| da_amount | numeric |
| created_at / updated_at | timestamptz |

RLS: Admin-only write, authenticated read (own config or subordinate configs).

### 2. Admin UI: Expense Master > Configuration

Update `ExpensePolicyConfig.tsx` to add two new config sections after the existing TA/DA cards:

**Manager-Level Config Card** -- Table listing managers with their TA/DA overrides. Admin can add/edit/remove rows. Uses a user selector filtered to users who have subordinates.

**User-Level Config Card** -- Table listing individual users with their TA/DA overrides. Admin can add/edit/remove rows. Uses a profile selector.

Both cards show a badge indicating "Overrides Global Default" and display the current global value for reference.

### 3. Calculation Engine: 6 Files Updated

Every file that currently reads only `expense_master_config` needs to also fetch `user_expense_config` and `team_expense_config`, then apply the priority: **User > Manager > Global**.

Files affected:
| File | Change |
|------|--------|
| `src/hooks/useMonthlyExpenseSummary.ts` | Add user/team config queries, COALESCE logic |
| `src/components/BeatAllowanceManagement.tsx` | Same -- TA and DA calculation sections |
| `src/components/expenses/ExpenseMonthlySummary.tsx` | Same |
| `src/components/expenses/TeamExpenseSummary.tsx` | Per-member lookup (each subordinate may have different config) |
| `src/components/ProductivityTracking.tsx` | Same |

The logic in each:
```
// Fetch all three configs
const [globalConfig, userConfig, teamConfig] = await Promise.all([...]);

// For a given userId, find their manager
const managerId = employees.find(e => e.user_id === userId)?.manager_id;

// Resolve with priority
const daAmount = userConfig?.da_amount ?? teamConfig?.da_amount ?? globalConfig?.da_amount ?? 0;
const taType = userConfig?.ta_type ?? teamConfig?.ta_type ?? globalConfig?.ta_type ?? 'from_beat';
const fixedTa = userConfig?.fixed_ta_amount ?? teamConfig?.fixed_ta_amount ?? globalConfig?.fixed_ta_amount ?? 0;
```

### 4. Shared Helper Hook (New)

Create `src/hooks/useResolvedExpenseConfig.ts` -- a reusable hook that takes a `userId` and returns the resolved TA/DA config after applying the 3-level hierarchy. This avoids duplicating the COALESCE logic across 5 files.

### Summary

| Area | UI Change? | Logic Change? |
|------|-----------|---------------|
| Admin Expense Master > Config | Yes -- 2 new cards | Yes -- CRUD for new tables |
| User Expense Tab (TA/DA/Additional) | No | Yes -- config resolution |
| Team Summary (Manager view) | No | Yes -- per-member config |

Total: 2 new DB tables, 1 new hook, 1 admin component update, 5 calculation files updated.

