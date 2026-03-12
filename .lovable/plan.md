

# Scalable Expense Policy Management with Groups

## Problem
Currently, assigning custom TA/DA overrides requires adding users or teams one at a time. With 500+ users, this is unmanageable. You need:
1. **Multi-user selection** — select multiple users at once to assign the same override
2. **Expense Groups** — create named groups (e.g., "North Region Sales", "Senior Reps") and assign policies to them
3. A resolution hierarchy that remains: **User Override > Group Override > Team (Manager) Override > Global Default**

## Design

### New DB Table: `expense_groups`
Stores named groups with their TA/DA policy values.

```
expense_groups:
  id (uuid PK)
  name (text, unique)
  description (text, nullable)
  ta_type (text: 'fixed' | 'from_beat')
  fixed_ta_amount (numeric, default 0)
  da_amount (numeric, default 0)
  ta_per_km_rate (numeric, default 0)
  created_at, updated_at
```

### New DB Table: `expense_group_members`
Maps users to groups (many-to-many).

```
expense_group_members:
  id (uuid PK)
  group_id (uuid FK -> expense_groups)
  user_id (uuid, references auth.users)
  created_at
  UNIQUE(group_id, user_id)
```

### Updated Resolution Priority
**User Override > Group Override > Team (Manager) Override > Global Default**

Update `useResolvedExpenseConfig.ts` to also fetch `expense_groups` + `expense_group_members` and check group membership during resolution.

### UI Changes in `ExpensePolicyConfig.tsx`

#### 1. Multi-User Selection for Direct Overrides
Replace the single-user `ProfileSelector` with the existing `CompactMultiUserSelector` (or a full multi-select variant). When the admin selects multiple users and sets an amount, create `user_expense_config` rows for all selected users in one batch.

#### 2. New "Expense Groups" Management Section
Add a new card/section in the Configuration tab:
- **Create Group**: Name + description + TA/DA values
- **Manage Members**: Use multi-user selector to add/remove users from a group
- **List Groups**: Show all groups with member count, edit/delete
- **Assign Policy**: Set TA type, fixed TA amount, DA amount per group

#### 3. Override Table Enhancement
Show which group a user belongs to (if any) in the override table, so admins can see the full picture.

### Files to Edit
1. **Migration SQL** — create `expense_groups` and `expense_group_members` tables with RLS
2. **`src/hooks/useResolvedExpenseConfig.ts`** — add group-level resolution between user and team levels
3. **`src/components/expenses/ExpensePolicyConfig.tsx`** — add multi-user bulk assignment + expense groups CRUD UI
4. **`src/components/EditBeatModal.tsx`** and **`src/pages/MyBeats.tsx`** — no changes needed (they already call `resolveExpenseConfig` which will pick up group overrides automatically)

### How It Scales
- **1-10 custom users**: Use multi-select to bulk-assign direct overrides
- **10-100 users with same policy**: Create a group, assign policy once, add users to group
- **500+ users**: Most users fall under Global Default or a few groups; only exceptions get individual overrides
- Groups can mirror regions, roles, seniority levels, or any custom segmentation

