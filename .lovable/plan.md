

## Fix: Order Cancellation Failing on Dev Database

### Problem
The "Confirm Cancellation" button IS correctly connected to the `cancelOrder()` function which calls the `cancel_order_atomic` RPC. The failure occurs because this RPC function **does not exist** in the Dev Supabase database — it was only created on the previous production database.

The RPC also depends on tables that may be missing: `credit_ledger`, `order_cancellation_log`, `invoices`, `gamification_points`, `retailer_loyalty_points`, `gamification_retailer_sequences`, `gamification_daily_tracking`.

### Fix
Run a single database migration that:

1. **Creates the `cancel_order_atomic` RPC function** — the full 200-line PL/pgSQL function that atomically cancels orders, reverses credit, gamification, loyalty, and visit status
2. **Creates missing dependency tables** (with `IF NOT EXISTS`):
   - `credit_ledger` — tracks credit reversals
   - `order_cancellation_log` — audit log for cancellations
   - `invoices` — referenced by the RPC for invoice cancellation
   - `gamification_retailer_sequences` — consecutive order tracking
   - `gamification_daily_tracking` — daily action counts

All tables will have RLS enabled with authenticated user policies. The RPC uses `SECURITY DEFINER` so it can operate across tables atomically.

### Technical Details
- **File**: New SQL migration
- **No code changes** — the frontend logic in `CancelOrderDialog.tsx` → `cancelOrder()` → `supabase.rpc('cancel_order_atomic')` is already correct
- The migration uses `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION` to be safe if some objects already exist

