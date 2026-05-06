## Problem

Clicking **Preview Transfer** calls the edge function `admin-delete-user` with `deleteOption='partial_transfer'` and `dryRun=true`. The edge function correctly authorizes the caller (checks `admin_user_delete` on their profile), then invokes the Postgres RPC `partial_ownership_transfer` using the **service role** Supabase client.

Inside the RPC:
```sql
v_caller := auth.uid();
IF NOT public.is_system_admin(v_caller) THEN
  RAISE EXCEPTION 'permission denied: requires system admin';
```

When the RPC is called through the service-role client, `auth.uid()` is **NULL**, so `is_system_admin(NULL)` returns false and the RPC aborts with `permission denied: requires system admin` — surfaced to the UI as the 400 error in the screenshot.

The edge function has already verified admin rights before reaching this point, so the RPC's redundant `auth.uid()`-based check is the bug.

## Fix

Update the RPC `public.partial_ownership_transfer` so authorization works correctly when invoked from a trusted edge function (service role) **and** when invoked directly by a logged-in admin (defense in depth).

Approach: accept an explicit `p_caller uuid` (defaulting to `auth.uid()`) and authorize against that. The edge function will pass the verified caller ID; direct callers fall back to `auth.uid()`.

### Migration (single small change)

```sql
CREATE OR REPLACE FUNCTION public.partial_ownership_transfer(
  p_from uuid,
  p_to uuid,
  p_payload jsonb,
  p_dry_run boolean DEFAULT false,
  p_caller uuid DEFAULT NULL          -- NEW
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := COALESCE(p_caller, auth.uid());
  ...
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'permission denied: caller unknown';
  END IF;
  IF NOT public.is_system_admin(v_caller) THEN
    RAISE EXCEPTION 'permission denied: requires system admin';
  END IF;
  ...
$$;
```

The rest of the RPC body stays exactly as today (self-transfer block, FOR UPDATE row locks, 500-record limit, dry-run handling, bucket processing, return shape). Only the signature and the `v_caller` resolution change.

### Edge function update

In `supabase/functions/admin-delete-user/index.ts`, pass the verified caller:

```ts
const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('partial_ownership_transfer', {
  p_from: userId,
  p_to: transferToUserId,
  p_payload: payload,
  p_dry_run: !!dryRun,
  p_caller: callerId,          // NEW
});
```

`callerId` is already validated via `supabaseAuth.auth.getUser()` and gated by the `admin_user_delete` permission check, so this is safe.

### Why this is safe

- RPC remains `SECURITY DEFINER` with `is_system_admin` enforcement — no weakening.
- `p_caller` only takes effect when supplied; without it, behavior is identical to today (uses `auth.uid()`), so any future direct caller still requires a logged-in system admin.
- Service-role access to this RPC is already restricted to the edge function (no PostgREST exposure path bypasses the edge function's own auth check).
- Caller still must satisfy `is_system_admin(p_caller)` — if the admin's profile lacks system-admin role, the RPC still rejects.

## Files changed

1. **NEW** `supabase/migrations/<ts>_partial_transfer_caller_param.sql` — `CREATE OR REPLACE FUNCTION public.partial_ownership_transfer(...)` adding the `p_caller` parameter and `COALESCE(p_caller, auth.uid())` resolution. No schema/data changes.
2. **EDIT** `supabase/functions/admin-delete-user/index.ts` — pass `p_caller: callerId` in the `.rpc('partial_ownership_transfer', {...})` call (single line addition).

No frontend changes. No changes to the existing delete/transfer flows. No changes to RLS or other tables.

## Verification after deploy

1. Open `/admin#users` → click delete on a user → choose **Partial Ownership Transfer** → select target user, pick a few records, enter reason → click **Preview Transfer**. Should return counts/warnings, not 400.
2. Click **Confirm Transfer**. Should succeed and write a `recycle_bin` audit row with `module_name = 'partial_ownership_transfer'`.
3. Confirm the source user remains active and only selected ownership rows moved.