# Send invoice on WhatsApp to the retailer from /visits/retailers

## Current behaviour (verified)

On the visit card, the green WhatsApp icon calls `sendViaWhatsAppForOrder`, which generates the invoice PDF, uploads it to the public `invoices` bucket, and calls the `send-invoice-whatsapp` backend function. That function today:

- sends to **two hard-coded numbers** (`+919741435887`, `+919845671333`) — never to the retailer;
- uses the old template `HX2b27e4c3a2353117297ef3d48c04e292` with a bag of guessed variable names;
- calls Twilio directly with a hard-coded Account SID plus a manually stored auth token, instead of the Twilio connector.

The retailer's number is already available in the UI (`visit.phone` is passed into the share component), it is simply not sent to the backend.

## What will change

1. **Link the Twilio connector** to this project so the send runs through the managed Twilio connection instead of a hand-stored auth token. A connect card will be shown for approval.
2. **Rewrite `send-invoice-whatsapp`** to:
   - accept `invoiceNumber` and `customerPhone` (plus the optional PDF URL) and validate both;
   - normalise the retailer number to E.164 with the `+91` default for 10-digit Indian numbers, and reject anything that still looks invalid;
   - send **only** to that retailer number — no hard-coded recipients;
   - use `From: whatsapp:+917411679191`;
   - use `ContentSid: HXb413b5dd909cc84c449262ec9cc85559` with `ContentVariables: {"1": "<invoice number>"}`;
   - send through the Twilio connector gateway, surfacing Twilio's real status and error body on failure instead of a generic error.
3. **Pass the retailer phone through** from the share button: `autoSendInvoiceWhatsApp` gains a `customerPhone` argument and the visit invoice component passes the number it already holds. The offline queue path keeps working — the queued payload already carries `customerPhone`.
4. **Guardrail in the UI:** if the retailer has no phone number, the toast says so instead of silently sending nowhere (this check exists and stays).

## Assumption to confirm

The template is treated as having a single variable, `{{1}}` = invoice number. If `HXb413b5dd909cc84c449262ec9cc85559` also expects the PDF link as `{{2}}`, the same call adds it — tell me and it goes in.

## Technical notes

- Backend function: `supabase/functions/send-invoice-whatsapp/index.ts` (Twilio POST is form-encoded via `URLSearchParams`).
- Gateway route: `https://connector-gateway.lovable.dev/twilio/Messages.json` with `Authorization: Bearer ${LOVABLE_API_KEY}` and `X-Connection-Api-Key: ${TWILIO_API_KEY}`; the gateway injects the Account SID.
- Callers touched: `src/utils/autoSendInvoice.ts`, `src/components/VisitInvoicePDFGenerator.tsx`. Other callers of the function (e.g. the SMS config test panel) get the new required phone field passed explicitly.
- Nothing about invoice generation, storage upload, or order data changes.