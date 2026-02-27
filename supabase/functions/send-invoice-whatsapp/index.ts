import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let invoiceId: string;
  let customerPhone: string;
  let pdfUrl: string;
  let invoiceNumber: string;
  let businessName = 'BHARATH BEVERAGES';

  try {
    const body = await req.json();
    invoiceId = body.invoiceId;
    customerPhone = body.customerPhone;
    pdfUrl = body.pdfUrl;
    invoiceNumber = body.invoiceNumber;

    if (!invoiceId || !customerPhone) {
      throw new Error('Order ID and customer phone number are required');
    }

    console.log('Sending invoice via Twilio WhatsApp:', { invoiceId, customerPhone, pdfUrl, invoiceNumber });

    // Get company name
    const { data: companyConfig } = await supabase
      .from('companies')
      .select('name')
      .limit(1)
      .maybeSingle();
    businessName = companyConfig?.name || 'BHARATH BEVERAGES';

    // --- Twilio WhatsApp ---
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      throw new Error('Twilio WhatsApp credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER in Edge Function secrets.');
    }

    // Format phone numbers with whatsapp: prefix
    const formatPhoneForWhatsApp = (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      const withCountryCode = cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;
      return `whatsapp:${withCountryCode}`;
    };

    const formatFromWhatsApp = (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      return cleaned.startsWith('+') ? `whatsapp:${cleaned}` : `whatsapp:+${cleaned}`;
    };

    const toPhone = formatPhoneForWhatsApp(customerPhone);
    const fromPhone = formatFromWhatsApp(twilioWhatsAppNumber);

    const message = `Thank you for placing the order with ${businessName}. Please find your Invoice link below\n\n${pdfUrl || ''}`;

    console.log(`Sending WhatsApp via Twilio: from=${fromPhone}, to=${toPhone}`);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const formBody = new URLSearchParams({
      To: toPhone,
      From: fromPhone,
      Body: message,
    });

    const encoder = new TextEncoder();
    const credentials = `${twilioAccountSid}:${twilioAuthToken}`;
    const base64Auth = btoa(String.fromCharCode(...encoder.encode(credentials)));

    let lastError: any = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`WhatsApp attempt ${attempt + 1}/${maxRetries + 1}`);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${base64Auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formBody,
        });

        const result = await response.json();
        console.log(`Twilio WhatsApp attempt ${attempt + 1} response:`, result);

        if (!response.ok) {
          throw new Error(result.message || 'Failed to send WhatsApp message via Twilio');
        }

        console.log('✅ WhatsApp message sent successfully via Twilio');

        // Also send SMS as backup
        await sendSmsViaTwilio(supabase, businessName, customerPhone, pdfUrl, invoiceNumber);

        return new Response(
          JSON.stringify({
            success: true,
            channel: 'whatsapp+sms',
            messageId: result.sid,
            message: 'Invoice sent via WhatsApp and SMS successfully',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        lastError = err;
        console.error(`WhatsApp attempt ${attempt + 1} failed:`, err);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error('❌ WhatsApp failed, falling back to SMS only:', error);

    const smsResponse = await sendSmsViaTwilio(supabase, businessName, customerPhone, pdfUrl, invoiceNumber);
    if (smsResponse) return smsResponse;

    return new Response(
      JSON.stringify({
        error: 'Failed to send invoice notification',
        details: {
          whatsapp_error: (error as any).message,
          sms_status: 'failed',
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// SMS fallback using Twilio
async function sendSmsViaTwilio(
  supabase: any,
  businessName: string,
  customerPhone: string,
  pdfUrl: string,
  invoiceNumber: string,
  maxRetries = 2
): Promise<Response | null> {
  // Get SMS/Twilio config from database
  const { data: smsConfig } = await supabase
    .from('sms_config')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const twilioAccountSid = smsConfig?.account_sid || Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = smsConfig?.auth_token || Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioFromNumber = smsConfig?.from_number || Deno.env.get('TWILIO_FROM_NUMBER');

      if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
        console.error('SMS credentials missing');
        return null;
      }

      const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;
      };

      const toPhone = formatPhone(customerPhone);
      const message = `Thank you for your order with ${businessName}!\n\nInvoice Number: ${invoiceNumber || 'N/A'}\n\nView your invoice: ${pdfUrl || ''}`;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const formBody = new URLSearchParams({ To: toPhone, From: twilioFromNumber, Body: message });

      const encoder = new TextEncoder();
      const credentials = `${twilioAccountSid}:${twilioAuthToken}`;
      const base64Auth = btoa(String.fromCharCode(...encoder.encode(credentials)));

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64Auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'SMS failed');

      console.log('✅ SMS sent successfully');
      return new Response(
        JSON.stringify({ success: true, channel: 'sms', messageId: result.sid, message: 'Invoice sent via SMS' }),
        { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error(`SMS attempt ${attempt + 1} failed:`, err);
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000));
    }
  }
  return null;
}
