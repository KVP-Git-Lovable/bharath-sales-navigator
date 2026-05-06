## Revised plan — addresses all 8 concerns

Schema verification confirmed (queried `information_schema`):


| Table          | Safe ownership column            | Creator/history column (DO NOT TOUCH) |
| -------------- | -------------------------------- | ------------------------------------- |
| `retailers`    | `owner_id` ✅ exists              | `user_id` (NOT NULL)                  |
| `beats`        | `owner_id` ✅                     | `created_by`                          |
| `territories`  | `owner_id`, `assigned_user_id` ✅ | `created_by`                          |
| `distributors` | `owner_id` ✅                     | —                                     |
| `vans`         | `assigned_user_id` ✅             | `created_by`                          |
| `employees`    | `manager_id` (gated, see below)  | `user_id`                             |
| `invoices`     | ❌ only `created_by` exists       | —                                     |
| `orders`       | ❌ only `user_id` (NOT NULL)      | —                                     |


### Resolution of each issue

**ISSUE 1 — `retailers.user_id` risk** ✅ FIXED
Confirmed `retailers.owner_id` exists. Use **only `owner_id**`. `user_id` is never touched. Same correction applied to `beats` (use `owner_id`, not `created_by`) and `vans` (use `assigned_user_id`).

**ISSUE 2 — `pending_receivables` risk** ✅ DROPPED FROM MVP
`invoices` has no `collector_id` / `assigned_to` / `collection_owner`. Per your guidance, **pending receivables transfer is removed from MVP**. The bucket will appear in the UI as disabled with the note: *"Requires `invoices.collector_id` column. Postponed."*

**ISSUE 3 — `direct_reports` risk** ✅ GATED
`direct_reports` (employees.manager_id) is included but:

- Disabled by default.
- Toggling it on requires a separate confirmation popup: *"This will change reporting hierarchy for N employees. Approval routing, dashboards, and leave escalation will be affected. Continue?"*
- Backend rejects the bucket unless `confirmTransferDirectReports: true` is in the payload.

**ISSUE 4 — Transaction safety** ✅ ADDED
Postgres transactions don't span PostgREST calls, so we add a SECURITY DEFINER RPC `partial_ownership_transfer(p_from uuid, p_to uuid, p_payload jsonb)` that performs all updates inside a single transaction. Edge function calls this RPC; on any error the entire transfer rolls back. Function returns `{ counts, errors }`. **This is the only DB migration** — one new function, no schema changes.

**ISSUE 5 — Self-transfer** ✅ ADDED

- Frontend: disables target dropdown options matching `userId`.
- Edge function: rejects with 400 if `transferToUserId === userId`.
- RPC: `RAISE EXCEPTION 'self-transfer not allowed' WHEN p_from = p_to`.
Three-layer check.

**ISSUE 6 — Consistency validation** ✅ ADDED
Inside the RPC, before any update:

- For each selected retailer: verify its `beat_id` either belongs to a beat being transferred in the same call OR the destination user already owns that beat OR no change required (retailer's beat-owner mismatch is allowed but flagged in returned warnings).
- For each selected beat: verify `territory_id` similarly.
- Returned `warnings[]` is shown to admin post-transfer; hard failures (e.g., retailer not owned by source user) abort with rollback.

**ISSUE 7 — Transfer preview** ✅ ADDED
A two-step UI:

1. Admin picks buckets + records.
2. Clicks **"Preview Transfer"** → calls RPC with `p_dry_run := true` → returns counts + warnings without writing.
3. Admin confirms → second call with `p_dry_run := false`.  
  
- Use SELECT ... FOR UPDATE on selected records before update to prevent concurrent transfer conflicts.
  - Add max transfer limit of 500 records per request for MVP safety.
  - Add mandatory transfer_reason field in audit metadata.

**ISSUE 8 — `recycle_bin` audit** ✅ KEPT TEMPORARILY
Audit row written to `recycle_bin` with `module_name = 'partial_ownership_transfer'` as agreed. Future migration to `ownership_transfer_log` table noted as out-of-scope.

## Final BUCKET_MAP (only safe columns)

```ts
const BUCKET_MAP = {
  retailers:       { table: 'retailers',    idCol: 'id',      ownerCol: 'owner_id' },
  beats:           { table: 'beats',        idCol: 'beat_id', ownerCol: 'owner_id' },
  territories:     { table: 'territories',  idCol: 'id',      ownerCol: 'assigned_user_id' },
  distributors:    { table: 'distributors', idCol: 'id',      ownerCol: 'owner_id' },
  vans:            { table: 'vans',         idCol: 'id',      ownerCol: 'assigned_user_id' },
  direct_reports:  { table: 'employees',    idCol: 'user_id', ownerCol: 'manager_id',
                     requiresConfirmation: true },
  // pending_receivables: REMOVED — no safe column on invoices
  // open_orders:        REMOVED — orders.user_id is NOT NULL creator field
};
```

`created_by`, `user_id` (on retailers/orders/employees), `completed_by`, `approved_by` — **never touched**. Confirms your "MOST IMPORTANT recommendation".

## Files changed

1. **NEW** `supabase/migrations/<ts>_partial_ownership_transfer.sql` — single SECURITY DEFINER RPC `partial_ownership_transfer(p_from uuid, p_to uuid, p_payload jsonb, p_dry_run bool)`. Uses `is_system_admin(auth.uid())` for authz. Wraps all updates in implicit function transaction.
2. **EDIT** `supabase/functions/admin-delete-user/index.ts` — add `partial_transfer` branch that validates input, calls the RPC, writes recycle_bin audit, early-returns. Existing `delete` and `transfer` branches untouched.
3. **EDIT** `src/components/admin/UserDeleteDialog.tsx` — add 3rd radio option, wire payload, two-step preview→confirm flow, target-user filter excludes source user.
4. **NEW** `src/components/admin/PartialTransferPicker.tsx` — bucket cards with per-record selection, search Popover, direct_reports confirmation modal, preview panel.

## Out of scope (acknowledged)

- `pending_receivables` and `open_orders` buckets — require new columns (`invoices.collector_id`, etc.). Will revisit when those are added.
- Dedicated `ownership_transfer_log` table — recycle_bin used as interim audit.
- Global `updated_by` audit columns across all tables — separate larger initiative.