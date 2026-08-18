import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';
const WHATSAPP_FROM = 'whatsapp:+917411679191';
const CONTENT_SID = 'HXb413b5dd909cc84c449262ec9cc85559';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Normalise an Indian mobile number to E.164 (+91XXXXXXXXXX). */
function toE164(raw: string): string | null {
  const digits = String(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    return /^\+\d{10,15}$/.test(digits) ? digits : null;
  }
  const plain = digits.replace(/^0+/, '');
  if (/^91\d{10}$/.test(plain)) return `+${plain}`;
  if (/^[6-9]\d{9}$/.test(plain)) return `+91${plain}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const invoiceNumber = typeof body?.invoiceNumber === 'string' ? body.invoiceNumber.trim() : '';
    const customerPhoneRaw = typeof body?.customerPhone === 'string' ? body.customerPhone.trim() : '';

    if (!invoiceNumber) {
      return json({ error: 'invoiceNumber is required' }, 400);
    }
    if (!customerPhoneRaw) {
      return json({ error: 'customerPhone is required' }, 400);
    }

    const to = toE164(customerPhoneRaw);
    if (!to) {
      return json({ error: `Invalid phone number: ${customerPhoneRaw}` }, 400);
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
    if (!lovableApiKey || !twilioApiKey) {
      return json({ error: 'Twilio connector is not configured for this project' }, 500);
    }

    const form = new URLSearchParams({
      To: `whatsapp:${to}`,
      From: WHATSAPP_FROM,
      ContentSid: CONTENT_SID,
      ContentVariables: JSON.stringify({ '1': invoiceNumber }),
    });

    console.log(`Sending WhatsApp invoice ${invoiceNumber} to ${to}`);

    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': twilioApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`Twilio request failed [${response.status}]: ${details}`);
      return json(
        { error: 'WhatsApp send failed', status: response.status, details },
        response.status,
      );
    }

    const result = await response.json();
    console.log(`✅ WhatsApp queued to ${to}: ${result?.sid}`);
    return json({ success: true, to, sid: result?.sid, status: result?.status });
  } catch (error) {
    console.error('❌ WhatsApp send failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
