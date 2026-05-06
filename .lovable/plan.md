## Context (verified against DB)

For Manvith (`d6d364d5-…`), of **597** retailers under his beats:


| Bucket                                               | Count   | Pending ₹                     |
| ---------------------------------------------------- | ------- | ----------------------------- |
| `owner_id = Manvith`                                 | 496     | —                             |
| `owner_id IS NULL`, `user_id = Manvith`              | 33      | part of 1,547                 |
| `owner_id IS NULL`, `user_id = other (deleted) user` | 68      | part of 1,547                 |
| **NULL-owner total**                                 | **101** | **₹1,547 across 3 retailers** |


The transfer dialog (`PartialTransferPicker`) only lists retailers where `owner_id = fromUserId`, so the 101 NULL-owner rows are silently skipped and the warning fires.

There are also two distinct concepts that today live on the same row:

- `user_id` = the field rep **assigned** to service the retailer (visits, collects pending payments).
- `owner_id` = the user who **owns** the retailer for revenue/credit attribution.

Today we conflate them in transfers and in `PendingPayments`/`PendingPaymentsAll` (both query by `user_id`, which is fine for the *collector* view but means revenue history walks with the assignee).

---

## Goal

1. Fix the warning by **backfilling NULL `owner_id**` so every retailer under Manvith's beats has a deterministic owner before transfer.
2. Make transfers move **only `user_id**` (collection / day-to-day assignment) and leave `**owner_id**` with Manvith, so historical revenue stays attributed to him while the new user can view + collect pending dues.
3. Make Pending Payments screens explicit about this: the new user *sees and collects* pending dues; the credit/revenue stays with the original owner.

---

## Plan

### Step 1 — Backfill `owner_id` (one-time SQL migration)

Rule: if `owner_id IS NULL`, set it to the **beat's `created_by**` (i.e. Manvith for all 101 rows, since they're under his beats). This is safe because:

- The 33 rows already have `user_id = Manvith` → owner becomes Manvith. ✅
- The 68 rows were created by a now-deleted user under Manvith's beats → ownership has never been assigned, and the beat owner is the only sensible default. ✅

```sql
UPDATE public.retailers r
SET owner_id = b.created_by
FROM public.beats b
WHERE r.beat_id = b.beat_id
  AND r.owner_id IS NULL
  AND b.created_by IS NOT NULL;
```

Audit log row inserted into `beat_audit_log` (action `owner_backfill`) summarising counts per beat for traceability.

After this runs, the transfer warning for Manvith goes to 0 and all 597 retailers are eligible.

### Step 2 — Separate "assignee" from "owner" in the transfer flow

Update `UserDeleteDialog` + `PartialTransferPicker` + the transfer execution path:

- **Picker query stays the same** (`owner_id = fromUserId`) — owner is the source of truth for "what does this user have to hand off".
- **Transfer execution** changes: for each selected retailer, set **only `user_id = toUserId**`. `owner_id` is **not** touched. Same idea for beats: `created_by` (= owner) stays with Manvith; the new user just becomes the working assignee.
- Add a clear toggle in the dialog: **"Transfer ownership too (revenue moves)"**, default **off**. When off → only `user_id` moves; when on → both `user_id` and `owner_id` move (current behaviour). This gives admins an explicit choice instead of a hidden default.
- Audit log entry records both fields so we know exactly what moved.

### Step 3 — Pending Payments visibility for the new (assignee) user

Today both `PendingPayments` (home widget) and `PendingPaymentsAll` filter by `user_id`. That's already correct for the *collector* view — after the transfer the new user will automatically see Manvith's retailers with outstanding dues, because their `user_id` is now the new user.

What we add:

- A small **"Legacy dues — credited to** &nbsp;**"** badge on each pending-payment card when `owner_id !== user_id`. Tells the new rep: "you collect this, but it doesn't count toward your revenue".
- The PaymentMarkingModal already updates `pending_amount` on the retailer row and inserts the payment record under the retailer — no change needed for collection itself. We just make sure that:
  - Any "revenue/collection by user" analytics (e.g. `useBusinessMetrics`, leaderboards) attribute the **payment receipt** based on `retailers.owner_id`, not the collector's `user_id`. I'll grep the existing analytics queries and adjust the single place that uses `user_id` for revenue (everything else already joins via retailer/order).

### Step 4 — Documentation note in admin UI

In the transfer dialog, a one-line helper under the toggle:

> "Off (default): the new user takes over visits and pending-payment collection; revenue history stays with the original owner. On: full ownership transfer, including revenue attribution."

---

## Technical details

**Files to change**

- `supabase/migrations/<new>.sql` — backfill `owner_id` from `beats.created_by` where NULL; insert audit rows.
- `src/components/admin/UserDeleteDialog.tsx` — add `transferOwnership` boolean state; pass to transfer logic; in the retailer update, only set `user_id` (and conditionally `owner_id`). Same pattern for beats / territories / distributors / vans.
- `src/components/admin/PartialTransferPicker.tsx` — render the "Transfer ownership too" switch + helper copy.
- `src/components/home/PendingPayments.tsx` and `src/pages/PendingPaymentsAll.tsx` — also select `owner_id` and the owner's `full_name` (single join via `profiles`); show the "Credited to …" badge when `owner_id !== userId`.
- `src/components/analytics/useBusinessMetrics.ts` — audit the one place revenue is grouped by collector; switch to grouping by `retailers.owner_id` for collection/revenue cards (visits/calls remain on `user_id`). I'll confirm the exact change while reading the file in build mode and keep it minimal.  
  
New user can:
  - visit retailer
  - collect dues
  - manage retailer operationally
  BUT
  Revenue/business ownership/history
  stays with Manvith.

**What stays the same**

- RLS, order/invoice schemas, payment marking, offline sync — untouched.
- `BeatTransferDialog` (single-beat path) — same toggle added so behaviour is consistent.
- `EventSummary` and earlier work — unaffected.

**Rollout**

1. Migration (Step 1) — runs once, fixes Manvith and any other user with NULL owners under owned beats.
2. Code changes (Steps 2–4) — single PR.
3. Re-run the transfer for Manvith → new user; warning is gone, the 101 previously-stranded retailers are now eligible, and Manvith retains revenue ownership.