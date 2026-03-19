

## Plan: Add Password Field to "Add Portal User" Dialog

### Problem
The "Add Portal User" form only creates a `distributor_users` record in the database — it does not create an auth account or set a password. The "Set Password" button exists separately on each user card, requiring a two-step process. You want to set the password directly during user creation.

### Solution
Add an optional "Set Password" section to the Add Portal User dialog. When a password is provided during creation, automatically call the `set-distributor-portal-password` edge function after the user record is created — combining both steps into one.

### Changes

**File: `src/components/distributor/DistributorPortalUsers.tsx`**

1. Add `password` and `confirmPassword` fields to `formData` state
2. Add a password input section in the Add Portal User form (only shown when creating, not editing) with:
   - Password field with show/hide toggle
   - Confirm password field
   - Helper text: "Optional — if set, the user can log in immediately"
3. In `handleSubmit`, after the `distributor_users` insert succeeds:
   - If password was provided, invoke `set-distributor-portal-password` with the new user's ID and password
   - Show a success toast confirming both user creation and password setup
4. Reset password fields in `resetForm`

### No new edge functions or database changes needed
The existing `set-distributor-portal-password` edge function handles everything — creating the auth account and linking it to the distributor user record.

