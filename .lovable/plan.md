

# Update WhatsApp Invoice Sender — Use Business Number + Approved Template

## What Changes

Update the `send-invoice-whatsapp` edge function to:

1. **From number**: Change from Twilio Sandbox (`+14155238886`) to your WhatsApp Business number `+917411681616`
2. **To number**: Send only to `+919741435887` (remove the second recipient `+917338319619`)
3. **Use approved template**: Instead of a free-form `Body`, use the Twilio Content SID `HX2b27e4c3a2353117297ef3d48c04e292` via the `ContentSid` parameter — this is required for business-initiated WhatsApp messages outside the 24-hour session window
4. **Remove `Body` and `MediaUrl`**: When using a Content Template, Twilio uses the template's pre-approved structure. The invoice PDF URL will be passed as a template variable if the template supports media, or kept as `MediaUrl` if the template allows it.

## Key Technical Detail

For Twilio WhatsApp Business API with approved templates, the message parameters change:
- Remove `Body` → use `ContentSid: 'HX2b27e4c3a2353117297ef3d48c04e292'`
- Keep `MediaUrl` for the invoice PDF attachment (Twilio templates can include media)
- `From: 'whatsapp:+917411681616'`
- `To: 'whatsapp:+919741435887'`

## File to Edit

| File | Change |
|------|--------|
| `supabase/functions/send-invoice-whatsapp/index.ts` | Update From, To, replace Body with ContentSid, keep MediaUrl |

No database changes needed. The existing `TWILIO_AUTH_TOKEN` secret and Account SID remain the same.

