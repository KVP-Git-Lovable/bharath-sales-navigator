## Root cause

When you deactivated **Manvith** and transferred his data to **Mokshith** from User Management, the system used the *Partial Ownership Transfer* flow. Looking at the database right now for Manvith's beats:

| Field | Current value | Should be |
|---|---|---|
| `created_by` | Manvith | Manvith (keep — history) |
| `user_id` (operational owner) | Mokshith ✅ | Mokshith |
| `owner_id` | **Manvith ❌** | Mokshith |
| `owner_name` | **"Manvith" ❌** | "Mokshith" |

So the *operational* assignment moved (orders/visits will go to Mokshith), but the **displayed owner** on the beat card still shows Manvith. Two beats (`test`, `Testbeat`) didn't move at all because they were owned only by Manvith with no Mokshith retailers.

Two bugs in `public.partial_ownership_transfer` RPC:
1. Even when "Also transfer ownership" is ticked, the RPC only updates `owner_id` — never `owner_name`. So the name shown on the beat stays as the old user.
2. For beats where retailers were transferred (not the beat row itself), the RPC computes a "consensus owner" but again only updates `owner_id`, never `owner_name`.

## Fix

### 1. Patch the RPC `partial_ownership_transfer`

Resolve the new owner's display name from `profiles.full_name` once at the start, then include `owner_name = <resolved name>` in every `UPDATE public.beats SET owner_id = p_to ...` branch (both the retailer-driven consensus block and the explicit beat-list block) — only when `transfer_ownership` is true.

Pseudo-change inside the function:
```text
v_to_name := SELECT full_name FROM profiles WHERE id = p_to;

UPDATE beats
   SET owner_id   = p_to,
       owner_name = v_to_name,         -- NEW
       user_id    = p_to
 WHERE ...                              -- existing predicates unchanged
```

`created_by` is never touched — Manvith remains the historical creator.

### 2. One-time backfill for the already-broken Manvith beats

Run a data update (via the *insert/update* tool, not a migration) to align the 17 beats that were half-transferred:

```text
UPDATE public.beats
   SET owner_id   = '<Mokshith uuid>',
       owner_name = 'Mokshith',
       user_id    = '<Mokshith uuid>'
 WHERE created_by = '<Manvith uuid>'
   AND (owner_id = '<Manvith uuid>' OR user_id = '<Manvith uuid>');

UPDATE public.retailers
   SET owner_id = '<Mokshith uuid>',
       user_id  = '<Mokshith uuid>'
 WHERE user_id = '<Manvith uuid>' OR owner_id = '<Manvith uuid>';
```

This sweeps the two stragglers (`test`, `Testbeat`) and fixes the displayed name on the other 15. `created_by` stays Manvith on every row.

### 3. Verification

After the changes:
- Re-query a sample of beats — every row originally created by Manvith should show `user_id`, `owner_id`, `owner_name` = Mokshith and `created_by` = Manvith.
- Open the Beats screen as Mokshith — all those beats should appear under his login and the owner chip should read "Mokshith".
- Place a test order on one of those beats from Mokshith's account — it should save against Mokshith with no RLS errors.

## Notes / scope

- Frontend code (`UserDeleteDialog`, `BeatTransferDialog`) does not need changes — they already pass `transfer_ownership: true` when the user ticks the box; the bug is server-side in the RPC.
- No schema changes; only the RPC body is updated and a one-time data correction is applied.
- No edits to `created_by` anywhere — Manvith's authorship stays intact.
