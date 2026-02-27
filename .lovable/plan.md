## Twilio WhatsApp Business Integration for Auto-Sending Invoices

### Current State

Your project **already has most of the infrastructure in place**:

1. **Edge function `send-invoice-whatsapp**` exists and already sends messages via Twilio SMS + WhatChimp WhatsApp. It accepts `invoiceId`, `customerPhone`, `pdfUrl`, `invoiceNumber`.
2. **Twilio secrets are configured**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_WHATSAPP_NUMBER` all exist.
3. **Frontend already has manual "Send via WhatsApp" buttons** in `VisitInvoicePDFGenerator.tsx` and `RetailerDetailModal.tsx`.

### What's Missing

The request is for **automatic** sending when an invoice is generated — currently it's manual (user clicks a WhatsApp button). Also, Twilio WhatsApp (using `TWILIO_WHATSAPP_NUMBER`) is available as a secret but **not used in the edge function** — it only uses WhatChimp for WhatsApp and Twilio for SMS.

### Can Twilio Be Used for WhatsApp?

**Yes.** Twilio supports WhatsApp Business via the same Messages API. You send to `whatsapp:+91XXXXXXXXXX` instead of `+91XXXXXXXXXX`, and send from `whatsapp:+1XXXXXXXXXX` (your Twilio WhatsApp sender). You already have `TWILIO_WHATSAPP_NUMBER` configured. No additional secrets needed.

### Plan

#### 1. Update `send-invoice-whatsapp` edge function

- Add a **Twilio WhatsApp** sending path using `TWILIO_WHATSAPP_NUMBER`
- Send to `whatsapp:+91{7338319619}` from `whatsapp:{TWILIO_WHATSAPP_NUMBER}`
- Message body: `"Thank you for placing the order. Please find your Invoice link below\n\n{pdfUrl}"`
- Keep existing SMS as fallback
- Remove WhatChimp dependency (or keep as secondary fallback)

#### 2. Auto-trigger after invoice generation

- In `src/utils/invoiceGenerator.ts` (the `fetchAndGenerateInvoice` function) or in the calling components (`VisitInvoicePDFGenerator`, `RetailerDetailModal`, `InvoicePDFGenerator`):
  - After successfully generating and uploading the PDF to storage, automatically invoke `send-invoice-whatsapp` with the retailer's phone number
  - Fetch retailer phone from the order's `retailer_id`
- Alternatively, create a **database trigger** on the `invoices` table that calls an edge function on insert — but this adds complexity. The simpler approach is frontend-triggered auto-send after PDF generation.

#### 3. Frontend changes

- In the invoice generation flow (when user clicks "Download Invoice" or generates an invoice), after PDF upload, auto-call the edge function
- Show a toast: "Invoice sent to retailer via WhatsApp"
- No separate button needed — it happens automatically

### Technical Details

**Edge function update** — Replace WhatChimp with Twilio WhatsApp:

```text
const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
// Send to: whatsapp:+91XXXXXXXXXX
// From: whatsapp:+1XXXXXXXXXX (or whatever the Twilio number is)
// Same Twilio Messages API, just prefix numbers with "whatsapp:"
```

**Auto-send integration point**: After `fetchAndGenerateInvoice()` succeeds and PDF is uploaded to storage, call `supabase.functions.invoke('send-invoice-whatsapp', { body: { ... } })` automatically.  
  
The 'To' number to which Whatsapp invoice will be received, is constant for now i.e.`+91{7338319619}`

**Files to modify**:

1. `supabase/functions/send-invoice-whatsapp/index.ts` — Use Twilio WhatsApp instead of WhatChimp
2. `src/components/VisitInvoicePDFGenerator.tsx` — Auto-send after download
3. `src/components/invoice/InvoicePDFGenerator.tsx` — Auto-send after generation
4. `src/components/RetailerDetailModal.tsx` — Auto-send after invoice generation