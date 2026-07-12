
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text;

ALTER TABLE public.support_ticket_comments
  ADD COLUMN IF NOT EXISTS status_from text,
  ADD COLUMN IF NOT EXISTS status_to text;
