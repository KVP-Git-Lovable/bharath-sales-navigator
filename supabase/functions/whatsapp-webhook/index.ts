// Twilio WhatsApp webhook for the sender +91 7411679191.
//
// Twilio posts form-encoded payloads here for:
//   * inbound messages   ("When a message comes in")
//   * delivery callbacks ("Status callback URL")
//
// Every payload is logged to public.whatsapp_inbound_messages on this
// project's Supabase (etabpbfokzhhfuybeieu). Business logic for invoices is
// stubbed in handleInboundMessage() below.
//
// Public endpoint (verify_jwt = false) because Twilio cannot send a JWT.
// URL: https://etabpbfokzhhfuybeieu.supabase.co/functions/v1/whatsapp-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

// The WhatsApp business number this webhook serves.
const WHATSAPP_NUMBER = "+917411679191";

function twiml(message?: string) {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, {
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });
}

function normalize(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/^whatsapp:/i, "").replace(/\s/g, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, webhook: "whatsapp-webhook", number: WHATSAPP_NUMBER }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // Twilio sends application/x-www-form-urlencoded; be tolerant of JSON too.
    const payload: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("json")) {
      Object.assign(payload, await req.json());
    } else {
      const form = await req.formData();
      for (const [k, v] of form.entries()) payload[k] = String(v);
    }

    const from = normalize(payload.From ?? null);
    const to = normalize(payload.To ?? null);
    const body = (payload.Body || "").trim();
    const messageSid = payload.MessageSid || payload.SmsSid || payload.SmsMessageSid || null;
    const status = payload.MessageStatus || payload.SmsStatus || null;
    const errorCode = payload.ErrorCode || null;

    // Status callbacks describe an outbound message; inbound messages have a Body/From.
    const isStatusCallback = !!status && !payload.Body && !payload.NumMedia;
    const direction = isStatusCallback ? "status" : "inbound";

    // Collect any media the sender attached.
    const mediaUrls: string[] = [];
    const numMedia = parseInt(payload.NumMedia || "0", 10);
    for (let i = 0; i < (isNaN(numMedia) ? 0 : numMedia); i++) {
      const url = payload[`MediaUrl${i}`];
      if (url) mediaUrls.push(url);
    }

    console.log("Twilio WhatsApp webhook:", { direction, from, to, messageSid, status, body });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: logError } = await supabase.from("whatsapp_inbound_messages").insert({
      direction,
      message_sid: messageSid,
      from_number: from,
      to_number: to,
      body: body || null,
      media_urls: mediaUrls,
      twilio_status: status,
      error_code: errorCode,
      raw_payload: payload,
      processed: false,
    });
    if (logError) console.error("Failed to log WhatsApp payload:", logError);

    // Status callbacks need no reply.
    if (isStatusCallback) return twiml();

    // Only serve traffic addressed to our WhatsApp business number.
    const servesThisNumber = !to || to === WHATSAPP_NUMBER;
    if (!servesThisNumber) {
      console.log(`Ignoring message addressed to ${to} (expected ${WHATSAPP_NUMBER})`);
      return twiml();
    }

    const reply = await handleInboundMessage({ supabase, from, body, mediaUrls, messageSid });
    return twiml(reply || undefined);
  } catch (err) {
    console.error("whatsapp-webhook failed:", err);
    // Always return valid TwiML so Twilio does not mark the webhook as failing.
    return twiml();
  }
});

/**
 * ---------------------------------------------------------------------------
 * INVOICE HANDLER — fill this in with the invoice behaviour.
 * ---------------------------------------------------------------------------
 * Return a string to reply on WhatsApp, or null to stay silent.
 * `supabase` is a service-role client for this project's database.
 */
async function handleInboundMessage(_args: {
  supabase: ReturnType<typeof createClient>;
  from: string | null;
  body: string;
  mediaUrls: string[];
  messageSid: string | null;
}): Promise<string | null> {
  // TODO: invoice logic goes here.
  return null;
}
