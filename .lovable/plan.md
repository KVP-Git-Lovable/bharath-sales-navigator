# Send order invoice SMS via MSG91

When the SMS icon in the Share row on `/visits/retailers` is clicked, send an SMS to the retailer using the MSG91 flow template.

Message: "Dear ##name1## your Invoice ##var1## has been generated. The total order value is Rs ##var2## in QuickApp."
- `name1` = retailer name
- `var1` = order invoice number
- `var2` = order total amount

## What changes

1. **New edge function `send-invoice-sms`**
   - Public (`verify_jwt = false` in `supabase/config.toml`), CORS enabled.
   - Validates body with Zod: `retailer_name`, `invoice_number`, `total_amount`, `mobile`.
   - Normalises the mobile to `91XXXXXXXXXX` (same helper as `send-retailer-otp`).
   - Calls `https://control.msg91.com/api/v5/flow` with `template_id: 6a856d1e05532d205b0c4b93`, auth header `authkey: MSG91_AUTHKEY`, recipient variables `name1`, `var1`, `var2`.
   - Relays MSG91's status/body on failure instead of a generic 500.

2. **Wire the SMS icon** in `src/components/VisitInvoicePDFGenerator.tsx`
   - Replace the "SMS sharing coming soon!" placeholder with a real send per selected order.
   - Single order sends directly; multiple orders open the existing invoice selection modal (already supports `sms`) and send for the chosen order.
   - Uses the order's `invoice_number` and `total_amount` already in `OrderForInvoice`, plus `customerPhone`.
   - Toast success/failure; disable the button while sending.

3. **Pass the retailer name**
   - Add an optional `customerName` prop to `VisitInvoicePDFGenerator` and pass the retailer/visit name from `src/components/VisitCard.tsx` (where `customerPhone={visit.phone}` is already passed).

No changes to WhatsApp, email, invoice PDF generation, or order logic.

## Needed from you

The `MSG91_AUTHKEY` secret is not configured in this project's Supabase (it exists in Staging). After you approve, I'll request it via the secure secret form before deploying the function.
