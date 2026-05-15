# Fix: Order Creation Failing With "record new has no field invoice_number"

## What's broken
A trigger `set_order_invoice_number` was added to `public.orders` that tries to set `NEW.invoice_number`. The `orders` table does not have an `invoice_number` column (only `invoice_generated_at`). Every INSERT into `orders` now fails — including the queued offline orders shown in your Sync Progress screenshot.

This is why orders worked fine in the morning but stopped working: the trigger was added afterward.

## Why dropping it is safe
- Invoice numbers belong to the `invoices` table, not `orders`.
- The `invoices` table already has a working trigger `trigger_set_invoice_number` that calls `generate_invoice_number()` on insert.
- Removing the orders-side trigger restores the original (working) behavior with no other side effects.

## Change

```sql
DROP TRIGGER IF EXISTS set_order_invoice_number ON public.orders;
DROP FUNCTION IF EXISTS public.set_order_invoice_number();
```

No frontend code changes needed. Once the trigger is gone, the two retrying orders in the sync queue will succeed on the next retry automatically.

## Verification
1. Apply the migration.
2. In the Sync Progress sheet, tap "Sync Now" — both pending orders should sync successfully.
3. Create a new order from the order entry page — should save without the "invoice_number" error.
4. Confirm invoice generation (Pay Now flow) still produces an invoice number — handled by the untouched `trigger_set_invoice_number` on `invoices`.
