## Goal
Fully restore the user **Harirama Bantwal** (`43ac16dc-24cb-489f-b77a-08e3fb0af57d`) so he can log in again, while keeping every existing FK reference intact (attendance, visits, orders, expenses, targets, etc. — ~40 tables still reference this UUID).

## What we have
The recycle_bin row `4e63e517-1de2-4eb0-8e9f-bfda219ab11f` contains the full archive:
- `profile` — username "Harirama Bantwal", phone `9606267768`, photo URL, role_id=null, active
- `user_role` — role: `user`
- `user_profile` — security profile `f857aa13-adc1-4163-93dd-f82ff1eabf7b`
- `employee` — manager `427ce7c2-b26e-43c8-9470-fc57a73e8606`, hire/salary fields as-was

The **only** thing missing is the `auth.users` row itself (deleted by the cascade). This app uses **phone-based login**, not email, so the auth account will be recreated with phone `9606267768`.

## Approach: preserve original UUID via one-shot admin edge function

Recreating the auth user with the same UUID is the only way to avoid touching ~40 FK tables. Supabase's `auth.admin.createUser` accepts a specific `id`. If it doesn't in this version, the function falls back to a direct service-role SQL insert into `auth.users` + `auth.identities`, which is the documented recovery path for exactly this scenario.

### Step 1 — Create a one-off admin edge function `restore-deleted-user`
- Guarded by `is_system_admin(caller)` (Prajwal / any System Administrator).
- Input: `recycle_bin_id`, `temp_password` (admin supplies it in the request), optional `phone_confirm: true`.
- Actions in order:
  1. Read the recycle_bin row; abort if `original_table != 'profiles'` or `_meta.delete_option != 'delete'`.
  2. Try `supabaseAdmin.auth.admin.createUser({ id, phone, password, phone_confirm: true, user_metadata: { full_name } })`. If the SDK rejects the custom id, fall back to a service-role SQL insert into `auth.users` (id, phone, phone_confirmed_at, encrypted_password via `crypt(password, gen_salt('bf'))`, `aud='authenticated'`, `role='authenticated'`, timestamps) + one row in `auth.identities`.
  3. `INSERT` the archived `profile` row back into `public.profiles` (skip if already present).
  4. `INSERT` the archived `user_role` row into `public.user_roles`.
  5. `INSERT` the archived `user_profile` row into `public.user_profiles` (this restores his security profile so permissions load on login).
  6. `INSERT` the archived `employee` row into `public.employees`.
  7. `DELETE` the recycle_bin row (or mark it restored) so it doesn't get re-restored.
  8. Return `{ success, user_id, phone, temp_password_note }`.
- Every step wrapped in try/catch with `console.warn`; partial success returns a detailed report so we know what to fix manually.

### Step 2 — Invoke it
Call the function from the assistant with:
```
recycle_bin_id: 4e63e517-1de2-4eb0-8e9f-bfda219ab11f
temp_password: <one you provide in chat>
```
The temp password will be shared back to Harirama out-of-band; he can change it after first login.

### Step 3 — Verify
- Query `auth.users` for id `43ac16dc-…` → row exists, phone set, `phone_confirmed_at` set.
- Query `public.profiles`, `public.user_roles`, `public.user_profiles`, `public.employees` for the same id → all four rows back.
- Confirm `user_profiles.profile_id = f857aa13-…` (security profile) → permissions will load.
- Recycle_bin entry `4e63e517-…` is gone.

## What the plan does NOT change
- No schema changes.
- No modification of any other user's data.
- No touching of the ~40 tables that reference Harirama's UUID — they already point to the restored row.
- The edge function is one-off; it can be deleted after use, or kept as a general "restore from recycle_bin" utility if you want it reusable later.

## Risks & mitigations
- **Direct auth.users insert**: mildly discouraged by Supabase guidelines, but this is exactly the "restore after wrongful delete" case. We try the SDK path first and only fall back to SQL if needed.
- **Password**: temp password must be shared securely; recommend Harirama changes it on first login (the app already supports `must_change_password`).
- **If any of the four public inserts collide** (unlikely — rows were purged): the function logs and continues; you'll get a per-table status back.

## Deliverables in build mode
1. `supabase/functions/restore-deleted-user/index.ts` (with corsHeaders, admin guard, both auth-restore paths).
2. Deploy the function.
3. Invoke it with the recycle_bin id and a temp password you provide.
4. Post-restore verification query results shown in chat.
