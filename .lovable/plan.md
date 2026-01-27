
<context>
User cannot create users via the “Create user” wizard. The UI error is generic: “edge functioning returned a non -2xx status code”.

From the backend side:
- `supabase/functions/admin-create-user/index.ts` currently expects to run and log, but recent attempts show no matching logs around the time the user saw the error.
- `supabase/config.toml` does NOT include an entry for `admin-create-user`. With Supabase’s newer signing-keys system, the old default `verify_jwt = true` approach can reject requests before your code runs (resulting in “non-2xx” with no function logs).
- The earlier “Database error creating new user” is explained by a strict DB CHECK constraint on `profiles.hint_question` / `profiles.hint_answer` combined with `handle_new_user()` using `COALESCE()` (empty string bypasses COALESCE and fails the CHECK). The edge function already partially addresses this for the “new user” flow by omitting empty `hint_*` fields, but the “existing user update” flow still sends empty strings.
- The wizard sends `security_profile_id` and `secondary_manager_id` but the edge function currently ignores them (not destructured / not persisted). This won’t usually block user creation, but it leads to incomplete setup and can cause later permission problems.

Goal: make user creation reliable and make errors actionable in the UI.
</context>

<root-cause-hypotheses (ranked)>
1) Request is being rejected before entering the edge function due to JWT verification mode (missing `verify_jwt = false` + signing-keys behavior). This matches: “non-2xx” + no edge function logs.
2) Even when it runs, user creation can still fail due to `profiles_hint_question_not_empty` / `profiles_hint_answer_not_empty` if empty strings reach `auth.users.raw_user_meta_data`.
3) Follow-up DB writes (employees insert / profile assignment) could fail due to type mismatches (e.g., `band` arriving as a string) or missing required mapping rows (role/profile assignment), causing a 500 in the function.
</root-cause-hypotheses>

<plan>
<step id="1" title="Make admin-create-user reachable (JWT verification config)">
- Update `supabase/config.toml` to add:
  - `[functions.admin-create-user]`
  - `verify_jwt = false`
- Rationale: ensures the request reaches the function code consistently under signing-keys.

Acceptance check:
- After redeploy, when clicking “Create User”, edge function logs should show the initial boot line and our request logs (“User authenticated…”, “Admin verified…”, etc.).
</step>

<step id="2" title="Update edge function auth validation to match verify_jwt=false">
In `supabase/functions/admin-create-user/index.ts`:
- Replace reliance on platform JWT verification with explicit validation:
  - Read `Authorization` header.
  - Create a Supabase client using `SUPABASE_ANON_KEY` and call `supabase.auth.getClaims(token)`.
  - Extract `userId` from `claims.sub`.
- Keep a separate service-role client for admin actions (`auth.admin.createUser`, `auth.admin.updateUserById`, inserting into `employees`, etc.).
- Continue enforcing admin-only access by checking `user_roles` for `userId`.

Acceptance check:
- If not logged in / token invalid -> 401 JSON error returned (and visible in UI after step 5).
- If logged in but not admin -> 403 JSON error.
</step>

<step id="3" title="Sanitize metadata so DB constraints can’t fail">
In `supabase/functions/admin-create-user/index.ts`:
- Ensure `hint_question` / `hint_answer` are only sent to Auth if they are non-empty after trim.
- Apply this sanitation in BOTH flows:
  - New user (`createUser`)
  - Existing user (`updateUserById`)
- This prevents empty strings from being written into `raw_user_meta_data` which would cause `handle_new_user()` to insert empty strings into `profiles` and violate CHECK constraints.

Acceptance check:
- Creating a user with empty hint question/answer succeeds and profiles row is created with defaults (“What is your favorite color?”, “default” hashed by trigger).
</step>

<step id="4" title="Complete the user setup (employee + security profile + role)">
Still in `admin-create-user`:
- Properly destructure and persist fields that the wizard already sends:
  - `secondary_manager_id` → include in `employees.insert()` / `employees.update()`
  - `security_profile_id` → upsert into `user_profiles` as `{ user_id: newUserId, profile_id: security_profile_id }` with `onConflict: 'user_id'`
- Assign base app role:
  - Insert `user_roles` row for the created user with role `'user'` (ignore conflict if it already exists).
- Normalize types:
  - `band` is stored as integer; parse it safely (if blank/invalid -> null; if outside 1–5 -> return 400 with a clear error).

Acceptance check:
- After successful creation:
  - `auth.users` contains the new user
  - `profiles` contains the new profile row
  - `employees` contains the row with manager/secondary_manager set as appropriate
  - `user_profiles` contains the selected security profile (if one was selected)
  - `user_roles` contains `(user_id, 'user')`
</step>

<step id="5" title="Improve frontend error visibility (stop hiding the real failure reason)">
In `src/components/admin/create-user/CreateUserWizard.tsx`:
- When `supabase.functions.invoke()` returns a non-2xx error, attempt to extract the JSON body from `error.context` (FunctionsError supports access to the underlying Response).
- Show the backend error message (and details) in the toast so you see “Unauthorized”, “Failed to create employee record: …”, etc., instead of the generic “non-2xx status code”.

Acceptance check:
- When something fails, the toast shows the actual JSON error (message + details).
</step>

<step id="6" title="Deploy + verify with a controlled test">
- Force deploy the edge function (`admin-create-user`) after changes.
- Call the function with a minimal payload using an authenticated admin session to confirm:
  - Status 200
  - Response contains `user.id`
- Then test again from the UI wizard.

Acceptance check:
- Edge function logs show request flow end-to-end.
- UI shows “User created successfully!” for a brand-new email.
</step>
</plan>

<files-to-change>
- `supabase/config.toml` (add `[functions.admin-create-user] verify_jwt = false`)
- `supabase/functions/admin-create-user/index.ts` (auth via getClaims, sanitize metadata, persist secondary_manager_id + security_profile_id, add user role insert, better typing/validation)
- `src/components/admin/create-user/CreateUserWizard.tsx` (surface error response body in toast)
</files-to-change>

<notes / edge-cases>
- Profiles CHECK constraints require non-empty `hint_question` and `hint_answer`. The `handle_new_user()` trigger provides defaults ONLY when the metadata key is missing/null—not when it’s an empty string. That’s why sanitation is mandatory.
- If other edge functions start failing similarly, they may also need `verify_jwt=false` + `getClaims()` updates, but we will scope this fix to `admin-create-user` first.
</notes>

<definition-of-done>
- Creating a user from the Preview URL with a new email succeeds reliably.
- If it fails, the UI shows a specific actionable error.
- The created user has employee + role + security profile assignment (when provided).
</definition-of-done>
