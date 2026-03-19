

## Plan: Add Password Setup Option for Distributor Portal Users

### Problem
Currently, the only way to give a distributor portal user login credentials is via the "Send Invite" button, which generates a random password and emails it. There is no option to manually set or view a password from the admin UI.

### Solution
Add a "Set Password" action to each distributor portal user card that lets the admin manually create/reset the auth account with a chosen password — without requiring email delivery.

### Changes

**1. Update `src/components/distributor/DistributorPortalUsers.tsx`**
- Add a "Set Password" dialog with a password input field and confirm field
- Add a "Set Password" button (key icon) next to the existing Send Invite and Login As buttons
- When submitted, call the edge function (or a new one) to create/update the auth user with the specified password

**2. Create new edge function `supabase/functions/set-distributor-portal-password/index.ts`**
- Accepts `distributorUserId` and `password`
- Verifies the caller has admin permission (same check as invite function)
- If no auth account exists: creates one via `supabase.auth.admin.createUser()` with the provided password
- If auth account exists: resets password via `supabase.auth.admin.updateUserById()`
- Updates `distributor_users` record with `auth_user_id`, `user_status: 'initiated'`, `is_active: true`
- Returns success (no email sending required)

**3. Show temporary password after invite**
- When the existing "Send Invite" function returns, if the email fails but `tempPassword` is in the response, display it in a dialog so the admin can copy it manually

### How login works
The distributor portal login (`/distributor-portal/login`) uses standard `supabase.auth.signInWithPassword()`. After authenticating, it checks `distributor_users` for a matching active record. So any user created via either method (invite or manual password) will work — as long as:
- An auth account exists with matching email
- `distributor_users.is_active = true`
- `distributor_users.email` matches the auth email

### No database changes needed
The `distributor_users` table already has all required columns (`auth_user_id`, `user_status`, `is_active`).

