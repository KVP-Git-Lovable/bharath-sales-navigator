
## Problem Analysis

After creating a user successfully via the Create User wizard, the new user does not appear in the "Users & Roles Management" tab. This is a **data synchronization issue** between the user creation flow and the user list display.

### Root Cause

The `CreateUserWizard` component is a standalone component that:
- Successfully creates users via the `admin-create-user` edge function
- Shows a success toast and resets its form
- **Does NOT notify the parent `AdminDashboard` to refresh the user list**

While there IS a real-time subscription on `profiles`, `user_roles`, and `employees` tables, it may not be triggering reliably due to:
- Closure staleness (the `fetchUsers` function reference in the effect)
- Supabase Realtime connection issues
- Timing between database writes and subscription events

---

## Solution Overview

Implement an `onSuccess` callback mechanism so that when a user is created, the parent dashboard is notified and immediately refreshes the user list.

---

## Technical Changes

### 1. Update CreateUserWizard to Accept `onSuccess` Prop

**File:** `src/components/admin/create-user/CreateUserWizard.tsx`

- Add an optional `onSuccess?: () => void` prop to the component
- Call `onSuccess()` after successful user creation (after the success toast)

```text
Changes:
- Line 22: Add props interface with optional onSuccess callback
- Line 228 (after toast): Call onSuccess?.() to notify parent
```

### 2. Update AdminDashboard to Pass the Callback

**File:** `src/pages/AdminDashboard.tsx`

- Pass `fetchUsers` as the `onSuccess` callback to `CreateUserWizard`
- This ensures the user list is refreshed immediately after creation

```text
Changes:
- Line 806: Change from <CreateUserWizard /> 
            to <CreateUserWizard onSuccess={fetchUsers} />
```

### 3. Add Tab Change Handler (Optional Enhancement)

As a safety net, also refresh data when switching to the "users" tab:

- Convert from uncontrolled `Tabs` to controlled with state
- Call `fetchUsers()` when the active tab changes to "users"

---

## Code Flow After Fix

```text
1. Admin fills Create User form
2. Clicks "Create User" button
3. Edge function creates user → returns success
4. CreateUserWizard:
   a. Shows success toast
   b. Calls onSuccess() callback
   c. Resets form
5. AdminDashboard.fetchUsers() is called
6. User list is refreshed with new user visible
7. Admin switches to "Users & Roles" tab → sees new user
```

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/admin/create-user/CreateUserWizard.tsx` | Add `onSuccess` prop and call it after success |
| `src/pages/AdminDashboard.tsx` | Pass `fetchUsers` to `CreateUserWizard` |

---

## Definition of Done

- After successfully creating a user, the user list in "Users & Roles Management" tab shows the new user without requiring a manual page refresh or clicking the "Refresh" button
- The success toast still appears
- Form still resets properly after creation
