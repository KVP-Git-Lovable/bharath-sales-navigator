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

    const formBody = new URLSearchParams({
      To: 'whatsapp:+919741435887',
      From: 'whatsapp:+14155238886',
      Body: `Thank you for placing your order. Your invoice link is ${invoiceUrl}`,
    });

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const base64Auth = btoa(`${accountSid}:${authToken}`);

    console.log(`Sending WhatsApp for invoice ${invoiceNumber}, URL: ${invoiceUrl}`);

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
      console.error('Twilio error:', result);
      throw new Error(result.message || 'Failed to send WhatsApp message');
    }

    console.log('✅ WhatsApp sent:', result.sid);

    return new Response(
      JSON.stringify({ success: true, messageId: result.sid, twilioResponse: result }),
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
