# Implemented

1. **Backfill migration** — all retailers under Manvith's beats now have `owner_id` populated (101 NULLs → 0). Rule: `owner_id := beats.created_by` where NULL.
2. **`partial_ownership_transfer` RPC** updated with new `transfer_ownership` flag (default `false`).
   - Default (assignee-only): updates `retailers.user_id` only; `owner_id` stays with source. Beat-level transfers cascade `user_id` to retailers under selected beats.
   - When `true`: full handover — both `user_id` and `owner_id` move (also `beats.owner_id`).
3. **`UserDeleteDialog`** now exposes a "Also transfer ownership (revenue moves)" toggle, plumbed through to the RPC. Footer warning copy adapts to the chosen mode.
4. **`PendingPayments` (home widget) and `PendingPaymentsAll`** now render an italic "Credited to <owner>" line when `retailers.owner_id !== current user`. This signals to the new assignee that the dues belong to historical revenue of the original owner.

# Not changed (intentional / future)

- **`useBusinessMetrics` revenue attribution** — left untouched. Today revenue/collection metrics group by `retailers.user_id`. If you want collections by the new user to **not** count toward their revenue when `owner_id ≠ user_id`, that's a single switch in the metrics aggregator. Confirm and I'll make it.
- Edge function `admin-delete-user` did not need changes — it forwards `partialPayload` (now including `transfer_ownership`) straight to the RPC.
