## Twilio Sandbox WhatsApp Integration

### Overview

Replace the current edge function with a simplified Twilio Sandbox implementation using a content template (ContentSid) instead of a Body message. The frontend click flow in AllInvoicesList already works — just needs the edge function rewritten.

### Changes

#### 1. Rewrite `supabase/functions/send-invoice-whatsapp/index.ts`

- Use hardcoded Account SID: `AC2bed17b2742df7031ebc7de2d726b62f`
- Use `TWILIO_AUTH_TOKEN` f92499b9a88ab278119b842fa4fc0264
- Hardcoded To: `whatsapp:+919741435887`
- Hardcoded From: `whatsapp:+14155238886` (Twilio Sandbox)
- Use `ContentSid=HXb5b62575e6e4ff6129ad7c8efe1f983e`
- Use `ContentVariables` with date and time from the request (or current timestamp)
- Remove all SMS fallback logic, WhatChimp references, and retry logic
- Simple single POST to Twilio, return success/error

#### 2. Simplify `src/utils/autoSendInvoice.ts`

- Remove PDF upload logic (not needed for template-based message)
- Just invoke the edge function with invoiceId and invoiceNumber
- Pass date/time for ContentVariables

#### 3. Update `src/components/invoice/AllInvoicesList.tsx`

- Simplify `handleSendWhatsApp` — no need to generate PDF blob first
- Just call the edge function directly with invoice details

### Technical Details

- The `TWILIO_AUTH_TOKEN` secret is already configured in this plan
- No database changes needed
- No new secrets needed (Account SID is hardcoded per your request)