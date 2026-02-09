

# Add "Delete Data" Button to Edit User Dialog

## Overview
Add a "Delete Data" button to the Edit User screen that allows administrators to selectively delete a user's data by module **without deleting the user account itself**. This is separate from the existing "Delete User" button which removes the entire user.

## How It Works

The admin clicks "Delete Data" in the Edit User dialog, which opens a new confirmation dialog with two options:
1. **Delete All Data** -- Removes all records belonging to the user across every module (but keeps the user account active)
2. **Selective Deletion (Module-wise)** -- Lets the admin pick specific modules (Orders, Retailers, Beats, etc.) and only deletes data from the chosen modules

A final confirmation step prevents accidental data loss.

## Technical Details

### 1. New Component: `UserDeleteDataDialog.tsx`

Create `src/components/admin/UserDeleteDataDialog.tsx` with:

- **Two radio options**: "Delete All Data" and "Selective Deletion"
- **Module checklist** (visible when Selective is chosen) grouped by category:
  - **Orders** (orders, order_items, invoices, packing_lists)
  - **Retailers** (retailers, retailer_visit_logs, retailer_feedback)
  - **Beats** (beats, beat_plans, beat_allowances)
  - **Visits** (visits)
  - **Attendance** (attendance, leave_applications, leave_balance, regularization_requests)
  - **Targets** (user_period_targets, user_business_plans, hierarchy_target_allocations)
  - **Gamification** (gamification_points, gamification_daily_tracking, etc.)
  - **GPS Tracking** (gps_tracking, gps_tracking_stops)
  - **Communication** (notifications, chat_conversations, push_content_posts)
  - **Learning** (coach_user_progress, coach_chat_messages, etc.)
  - **Expenses** (additional_expenses)
  - **Performance** (user_monthly_scorecards, competency_coaching_notes)

- **Data summary**: Reuses the existing `getUserDataSummary()` utility to show record counts per module
- **Final confirmation**: A two-step confirm -- first select modules, then a warning alert before execution
- Deleted data is archived to the recycle bin before removal (same pattern as user deletion)

### 2. New Edge Function: `admin-delete-user-data`

Create `supabase/functions/admin-delete-user-data/index.ts` that:

- Accepts `{ userId, deleteMode: 'all' | 'selective', selectedModules?: string[] }`
- Verifies admin access (same auth pattern as `admin-delete-user`)
- Uses the service-role Supabase client to bypass RLS
- Archives selected data to recycle bin before deletion
- Handles cascading deletes (e.g., order_items before orders, chat_messages before chat_conversations)
- Does **NOT** delete the user account, profile, employee record, or auth user -- only the module data
- Returns a summary of what was deleted

### 3. Update `EditUserDialog.tsx`

- Add a "Delete Data" button (orange/warning color) in the footer, next to the existing "Delete User" button
- Add state `showDeleteDataDialog` to control the new dialog
- Import and render the new `UserDeleteDataDialog` component

### 4. Update `supabase/config.toml`

- Add the new `admin-delete-user-data` function entry with `verify_jwt = false` (auth handled in code)

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/UserDeleteDataDialog.tsx` | **CREATE** | New dialog with delete all / selective module options |
| `supabase/functions/admin-delete-user-data/index.ts` | **CREATE** | Edge function for selective data deletion |
| `src/components/admin/EditUserDialog.tsx` | **MODIFY** | Add "Delete Data" button and wire up new dialog |
| `supabase/config.toml` | **MODIFY** | Register new edge function |

### UI Layout (Edit User Footer)

```text
┌──────────────────────────────────────────────────────────┐
│  [Delete Data]  [Delete User]     [Cancel]  [Save]       │
│  (orange)       (red)             (outline)  (primary)   │
└──────────────────────────────────────────────────────────┘
```

### Delete Data Dialog Flow

```text
Step 1: Choose deletion mode
┌─────────────────────────────────────────────────┐
│  Delete User Data                               │
│                                                  │
│  Delete data for "John Smith"                    │
│  (The user account will remain active)           │
│                                                  │
│  Found 245 records across 15 tables              │
│                                                  │
│  ○ Delete All Data                               │
│    Remove all 245 records across all modules     │
│                                                  │
│  ○ Selective Deletion (Module-wise)              │
│    Choose specific modules to delete             │
│                                                  │
│  [When selective is chosen:]                     │
│  ☑ Orders (42 records)                          │
│  ☑ Retailers (15 records)                       │
│  ☐ Beats (5 records)                            │
│  ☑ Visits (80 records)                          │
│  ☐ Attendance (30 records)                      │
│  ...                                             │
│                                                  │
│  [Cancel]  [Continue to Confirm]                 │
└─────────────────────────────────────────────────┘

Step 2: Final confirmation
┌─────────────────────────────────────────────────┐
│  ⚠ Confirm Data Deletion                        │
│                                                  │
│  You are about to permanently delete:            │
│  • Orders: 42 records                            │
│  • Retailers: 15 records                         │
│  • Visits: 80 records                            │
│                                                  │
│  This will archive data to the Recycle Bin.      │
│  This action cannot be easily undone.            │
│                                                  │
│  [Go Back]  [Confirm Delete]                     │
└─────────────────────────────────────────────────┘
```

