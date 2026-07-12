
ALTER TABLE public.support_ideas
  ADD COLUMN IF NOT EXISTS idea_type text,
  ADD COLUMN IF NOT EXISTS impact text;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS owner_email text;
