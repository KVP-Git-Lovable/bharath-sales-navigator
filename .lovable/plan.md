## Goal
Restore order sync to the earlier working behavior by removing the last invalid `invoice_number` write from the backend RPC that creates orders.

## What’s actually broken
- The UI screenshot and console logs are showing the same backend failure:
  `column "invoice_number" of relation "orders" does not exist`
- I verified the live database function `public.sync_order_with_items(jsonb, jsonb)` still contains this insert:
  - `previous_pending_cleared, invoice_number, idempotency_key, ...`
  - with value `p_order->>'invoice_number'`
- I also verified the `orders` table does not have an `invoice_number` column anymore.
- So the trigger was removed earlier, but the RPC function was not fully cleaned up. That is why sync is still failing.

## Plan
1. Create a Supabase migration to update `public.sync_order_with_items(jsonb, jsonb)`.
   - Remove `invoice_number` from the `INSERT INTO public.orders (...)` column list.
   - Remove `p_order->>'invoice_number'` from the matching values list.
   - Keep the rest of the order insert behavior unchanged.

2. Re-check the frontend order-sync path for anything else that depends on `orders.invoice_number`.
   - Keep `Operations` using `invoices.invoice_number` only.
   - Confirm offline sync still calls the same RPC with safe payload sanitization.

3. Validate the fix after the migration.
   - Re-read the live function definition to confirm the invalid column is gone.
   - Confirm the pending sync error path matches the fix.

## Technical details
- Database object to update: `public.sync_order_with_items(jsonb, jsonb)`
- No new tables or policies are needed.
- No auth or RLS change is required for this fix.
- Expected result: queued `CREATE_ORDER` items stop failing with the `invoice_number` column error and retry successfully.

## User impact
- Orders should sync again exactly like before.
- Invoice generation remains separate and should continue to use the `invoices` table.