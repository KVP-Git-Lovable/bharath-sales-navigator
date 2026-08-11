CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  direction TEXT NOT NULL DEFAULT 'inbound',
  message_sid TEXT,
  from_number TEXT,
  to_number TEXT,
  body TEXT,
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  twilio_status TEXT,
  error_code TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processing_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_inbound_msg_sid ON public.whatsapp_inbound_messages (message_sid);
CREATE INDEX IF NOT EXISTS idx_wa_inbound_from ON public.whatsapp_inbound_messages (from_number);
CREATE INDEX IF NOT EXISTS idx_wa_inbound_created ON public.whatsapp_inbound_messages (created_at DESC);

GRANT SELECT ON public.whatsapp_inbound_messages TO authenticated;
GRANT ALL ON public.whatsapp_inbound_messages TO service_role;

ALTER TABLE public.whatsapp_inbound_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view whatsapp inbound messages" ON public.whatsapp_inbound_messages;
CREATE POLICY "Authenticated users can view whatsapp inbound messages"
ON public.whatsapp_inbound_messages
FOR SELECT
TO authenticated
USING (true);

DROP TRIGGER IF EXISTS update_whatsapp_inbound_messages_updated_at ON public.whatsapp_inbound_messages;
CREATE TRIGGER update_whatsapp_inbound_messages_updated_at
BEFORE UPDATE ON public.whatsapp_inbound_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();