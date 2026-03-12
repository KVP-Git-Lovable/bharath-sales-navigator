

# Integrate Expense Groups into TA/DA Cards + Multi-Select for Add User/Team

## Current State
- **Expense Groups** exists as a **separate card** below TA/DA policy cards (line 757)
- **"+ Add User"** and **"+ Add Team (Manager)"** use a single-select `<Select>` dropdown (`ProfileSelector`) — only one user/team can be added at a time
- The TA and DA cards already have "Custom per user/team" mode with an `OverrideTable`

## Changes

### 1. Move Expense Groups inside TA & DA Policy Cards
- Remove the standalone `<ExpenseGroupsConfig />` from line 757
- Inside each policy card (TA and DA), when "Custom per user/team" is selected, add a sub-section below the override table showing:
  - A "Groups" section listing existing expense groups with their relevant policy value (TA amount for TA card, DA amount for DA card)
  - A button to create/edit groups inline (reuse the dialog from `ExpenseGroupsConfig`)
  - Clicking a group opens the member management dialog
- This way admins see user overrides, team overrides, AND group overrides all in context within each policy card

### 2. Replace Single-Select ProfileSelector with Multi-Select
- Replace the `<Select>` component in `ProfileSelector` with a `Popover` + checkbox list (similar pattern to `ExpenseGroupsConfig`'s member management)
- Allow selecting multiple users/teams at once
- On confirm/close, call `addOverride` for each selected user/team in batch
- Show a search input and scrollable checkbox list inside the popover

### Files to Edit
1. **`src/components/expenses/ExpensePolicyConfig.tsx`**:
   - Replace `ProfileSelector` with a new `MultiProfileSelector` component using Popover + checkboxes
   - Update `OverrideTable` to use the new multi-select component
   - Integrate expense groups section inside both TA and DA custom sections
   - Remove standalone `<ExpenseGroupsConfig />` render
   - Add group CRUD dialogs (reuse logic from `ExpenseGroupsConfig`)

2. **`src/components/expenses/ExpenseGroupsConfig.tsx`**: Keep as-is for reusable logic, or inline key parts into the policy config

### UI Layout (inside each policy card, custom mode)

```text
┌─ TA Policy Card ──────────────────────────┐
│  TA Calculation Method: [Fixed / From Beat]│
│  Distribution: ○ Same for all ● Custom    │
│  Default TA: ₹___                         │
│                                           │
│  ── User/Team Overrides ──────────────── │
│  [Override Table rows...]                 │
│  [+ Add Users] [+ Add Teams]  ← multi    │
│                                           │
│  ── Group Overrides ─────────────────── │
│  Group Name | TA(₹) | Members | Actions   │
│  [+ Create Group]                         │
└───────────────────────────────────────────┘
```

### Multi-Select Component Design
- Trigger button: "+ Add Users" / "+ Add Teams (Managers)"
- Popover content: search input + scrollable checkbox list + "Add Selected" button
- On "Add Selected", batch-create override rows for all checked users/teams
- Existing overrides are excluded from the list

