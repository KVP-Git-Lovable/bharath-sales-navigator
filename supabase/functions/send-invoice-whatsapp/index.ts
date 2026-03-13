import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceNumber } = await req.json();

    if (!invoiceNumber) {
      throw new Error('invoiceNumber is required');
    }

    const accountSid = 'AC2bed17b2742df7031ebc7de2d726b62f';
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!authToken) {
      throw new Error('TWILIO_AUTH_TOKEN not configured');
    }

    const invoiceUrl = `https://aoxdosjkwqyuvccuwhzc.supabase.co/storage/v1/object/public/invoices/public/${invoiceNumber}.pdf`;

    const recipient = 'whatsapp:+919741435887';
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const base64Auth = btoa(`${accountSid}:${authToken}`);

    console.log(`Sending WhatsApp for invoice ${invoiceNumber}, URL: ${invoiceUrl}`);

    const formBody = new URLSearchParams({
      To: recipient,
      From: 'whatsapp:+917411681616',
      ContentSid: 'HX2b27e4c3a2353117297ef3d48c04e292',
      MediaUrl: invoiceUrl,
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });

    const result = await response.json();
    if (!response.ok) {
      console.error(`Twilio error for ${recipient}:`, result);
    } else {
      console.log(`✅ WhatsApp sent to ${recipient}:`, result.sid);
    }
    const results = [{ to: recipient, success: response.ok, result }];

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ WhatsApp send failed:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
