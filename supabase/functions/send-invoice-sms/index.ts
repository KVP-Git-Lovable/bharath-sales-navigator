import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const TEMPLATE_ID = '6a856d1e05532d205b0c4b93';

const BodySchema = z.object({
  retailer_name: z.string().min(1).max(200),
  invoice_number: z.string().min(1).max(100),
  total_amount: z.union([z.string(), z.number()]),
  mobile: z.string().min(1),
});

function normalizeMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        400,
      );
    }

    const { retailer_name, invoice_number, total_amount, mobile } = parsed.data;
    const normalized = normalizeMobile(mobile);
    if (!normalized) {
      return json({ success: false, error: `Invalid Indian mobile number: ${mobile}` }, 400);
    }

    const authkey = Deno.env.get('MSG91_AUTHKEY');
    if (!authkey) {
      return json({ success: false, error: 'MSG91_AUTHKEY is not configured' }, 500);
    }

    const amount = String(
      typeof total_amount === 'number'
        ? Math.round(total_amount * 100) / 100
        : total_amount,
    );

    console.log('[send-invoice-sms] dispatch', {
      mobile: normalized,
      invoice_number,
      amount,
    });

    const res = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authkey,
      },
      body: JSON.stringify({
        template_id: TEMPLATE_ID,
        short_url: '0',
        realTimeResponse: '1',
        recipients: [
          {
            mobiles: normalized,
            name1: retailer_name,
            var1: invoice_number,
            var2: amount,
            NAME1: retailer_name,
            VAR1: invoice_number,
            VAR2: amount,
          },
        ],
      }),
    });

    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { /* ignore */ }
    console.log('[send-invoice-sms] msg91 response', res.status, data ?? text);

    if (!res.ok || (data && data.type && data.type !== 'success')) {
      const errMsg =
        (data && (data.message || data.description)) ||
        text ||
        `MSG91 request failed with status ${res.status}`;
      return json({ success: false, error: errMsg, status: res.status, details: text }, 502);
    }

    return json({ success: true, to: normalized });
  } catch (e: any) {
    console.error('[send-invoice-sms] error', e);
    return json({ success: false, error: e?.message || 'Unexpected error' }, 500);
  }
});
