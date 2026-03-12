

# Simplify TA/DA Configuration — Inline Flexible Setup

## Problem
The current UI has 4 separate cards: TA Policy (global), DA Policy (global), Manager-Level Overrides, and User-Level Overrides. This is confusing — admins don't think in "overrides," they think "who gets what."

## New Design

Merge everything into **2 cards** (TA Policy and DA Policy), each with a built-in distribution mode selector. No separate override cards.

### TA Policy Card — Redesigned

```
┌─────────────────────────────────────────────┐
│ 🚗 Travel Allowance (TA) Policy             │
│                                              │
│ TA Calculation: [Fixed ▼] / [From Beat ▼]   │
│                                              │
│ If "From Beat" selected:                     │
│   ℹ️ TA auto-calculated from beat values.    │
│   Per KM Rate (optional): [___]              │
│                                              │
│ If "Fixed" selected:                         │
│   Distribution: ○ Same for all  ○ Custom     │
│                                              │
│   If "Same for all":                         │
│     Fixed TA Amount: [₹ 200]                 │
│                                              │
│   If "Custom":                               │
│     Default TA: [₹ 200] (for users not       │
│                          listed below)       │
│     ┌──────────────────────────────────┐     │
│     │ + Add User / + Add Group         │     │
│     │                                  │     │
│     │ User/Group    │ TA Amount │  ✕   │     │
│     │ Ravi          │ ₹300      │  ✕   │     │
│     │ South Team    │ ₹250      │  ✕   │     │
│     └──────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

### DA Policy Card — Redesigned

```
┌─────────────────────────────────────────────┐
│ 🍽 Daily Allowance (DA) Policy               │
│                                              │
│ Distribution: ○ Same for all  ○ Custom       │
│                                              │
│ If "Same for all":                           │
│   DA Amount: [₹ 150]                         │
│                                              │
│ If "Custom":                                 │
│   Default DA: [₹ 150]                        │
│   ┌──────────────────────────────────┐       │
│   │ + Add User / + Add Group (Mgr)   │       │
│   │                                  │       │
│   │ User/Group    │ DA Amount │  ✕   │       │
│   │ Ravi          │ ₹200      │  ✕   │       │
│   │ South Team    │ ₹180      │  ✕   │       │
│   └──────────────────────────────────┘       │
│                                              │
│ Calculation Basis: [Full Day Only ▼]         │
└─────────────────────────────────────────────┘
```

### Key UX Concepts

1. **Radio toggle "Same for all" vs "Custom"** — simple binary choice
2. **"Custom" reveals inline table** — add individual users or manager-groups (team) in one unified list with a type badge (User/Team)
3. **"From Beat" TA hides amount fields entirely** — shows info text: "TA will be auto-calculated from each beat's travel allowance value"
4. **Default amount always shown in Custom mode** — acts as fallback for unlisted users
5. **Remove the 4 separate cards** — merge into 2

## File Changes

### `src/components/expenses/ExpensePolicyConfig.tsx`
- Remove the "Manager-Level Overrides" card and "User-Level Overrides" card
- Remove the "Save Overrides" button
- Inside TA Policy card: add `distribution` radio (`same_for_all` | `custom`). When `custom`, show inline table combining user and team overrides with an "Add User" / "Add Team" selector and a type badge
- When TA is `from_beat`, hide distribution options and show info text
- Inside DA Policy card: same `distribution` radio + inline table pattern
- Single "Save Expense Policy" button saves global config + all overrides together
- Remove `OverrideRow` component, replace with simpler inline row that only shows the relevant field (TA amount OR DA amount, not both mixed)

### No other files change
The backend tables (`user_expense_config`, `team_expense_config`) and resolution hook (`useResolvedExpenseConfig.ts`) remain identical — only the admin UI simplifies.

