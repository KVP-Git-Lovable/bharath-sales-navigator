
-- IDEAS
CREATE TABLE IF NOT EXISTS public.support_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text,
  status text NOT NULL DEFAULT 'submitted',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ideas TO authenticated;
GRANT ALL ON public.support_ideas TO service_role;
ALTER TABLE public.support_ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ideas_select_auth" ON public.support_ideas;
CREATE POLICY "ideas_select_auth" ON public.support_ideas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ideas_insert_own" ON public.support_ideas;
CREATE POLICY "ideas_insert_own" ON public.support_ideas FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "ideas_update_own_or_admin" ON public.support_ideas;
CREATE POLICY "ideas_update_own_or_admin" ON public.support_ideas FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_system_admin(auth.uid()));
DROP POLICY IF EXISTS "ideas_delete_own_or_admin" ON public.support_ideas;
CREATE POLICY "ideas_delete_own_or_admin" ON public.support_ideas FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_system_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.support_idea_votes (
  idea_id uuid NOT NULL REFERENCES public.support_ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_idea_votes TO authenticated;
GRANT ALL ON public.support_idea_votes TO service_role;
ALTER TABLE public.support_idea_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "idea_votes_select" ON public.support_idea_votes;
CREATE POLICY "idea_votes_select" ON public.support_idea_votes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "idea_votes_manage_own" ON public.support_idea_votes;
CREATE POLICY "idea_votes_manage_own" ON public.support_idea_votes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.support_idea_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.support_ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_idea_comments TO authenticated;
GRANT ALL ON public.support_idea_comments TO service_role;
ALTER TABLE public.support_idea_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "idea_comments_select" ON public.support_idea_comments;
CREATE POLICY "idea_comments_select" ON public.support_idea_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "idea_comments_insert_own" ON public.support_idea_comments;
CREATE POLICY "idea_comments_insert_own" ON public.support_idea_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "idea_comments_delete_own_or_admin" ON public.support_idea_comments;
CREATE POLICY "idea_comments_delete_own_or_admin" ON public.support_idea_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_system_admin(auth.uid()));

-- TICKETS
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1000;
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE,
  subject text NOT NULL,
  description text NOT NULL,
  company_name text,
  category text NOT NULL DEFAULT 'question',
  impact text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_select_own_or_admin" ON public.support_tickets;
CREATE POLICY "tickets_select_own_or_admin" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = created_by OR auth.uid() = assigned_to OR public.is_system_admin(auth.uid()));
DROP POLICY IF EXISTS "tickets_insert_own" ON public.support_tickets;
CREATE POLICY "tickets_insert_own" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "tickets_update_own_or_admin" ON public.support_tickets;
CREATE POLICY "tickets_update_own_or_admin" ON public.support_tickets FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_system_admin(auth.uid()));
DROP POLICY IF EXISTS "tickets_delete_admin" ON public.support_tickets;
CREATE POLICY "tickets_delete_admin" ON public.support_tickets FOR DELETE TO authenticated USING (public.is_system_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_support_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || lpad(nextval('public.support_ticket_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
DROP TRIGGER IF EXISTS trg_support_ticket_number ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_number BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_support_ticket_number();

CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_attachments TO authenticated;
GRANT ALL ON public.support_ticket_attachments TO service_role;
ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_att_select" ON public.support_ticket_attachments;
CREATE POLICY "ticket_att_select" ON public.support_ticket_attachments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.is_system_admin(auth.uid())))
);
DROP POLICY IF EXISTS "ticket_att_insert" ON public.support_ticket_attachments;
CREATE POLICY "ticket_att_insert" ON public.support_ticket_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
DROP POLICY IF EXISTS "ticket_att_delete" ON public.support_ticket_attachments;
CREATE POLICY "ticket_att_delete" ON public.support_ticket_attachments FOR DELETE TO authenticated USING (auth.uid() = uploaded_by OR public.is_system_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.support_ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_comments TO authenticated;
GRANT ALL ON public.support_ticket_comments TO service_role;
ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_com_select" ON public.support_ticket_comments;
CREATE POLICY "ticket_com_select" ON public.support_ticket_comments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.is_system_admin(auth.uid())))
  AND (NOT is_internal OR public.is_system_admin(auth.uid()))
);
DROP POLICY IF EXISTS "ticket_com_insert" ON public.support_ticket_comments;
CREATE POLICY "ticket_com_insert" ON public.support_ticket_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ticket_com_delete" ON public.support_ticket_comments;
CREATE POLICY "ticket_com_delete" ON public.support_ticket_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_system_admin(auth.uid()));

-- RELEASES
CREATE TABLE IF NOT EXISTS public.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  version text NOT NULL,
  title text NOT NULL,
  release_date date NOT NULL,
  summary text,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  body_md text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.releases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.releases TO authenticated;
GRANT ALL ON public.releases TO service_role;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "releases_select_published" ON public.releases;
CREATE POLICY "releases_select_published" ON public.releases FOR SELECT USING (status = 'published' OR public.is_system_admin(auth.uid()));
DROP POLICY IF EXISTS "releases_admin_write" ON public.releases;
CREATE POLICY "releases_admin_write" ON public.releases FOR ALL TO authenticated USING (public.is_system_admin(auth.uid())) WITH CHECK (public.is_system_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.release_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  title text NOT NULL,
  position int NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.release_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_sections TO authenticated;
GRANT ALL ON public.release_sections TO service_role;
ALTER TABLE public.release_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "release_sections_select" ON public.release_sections;
CREATE POLICY "release_sections_select" ON public.release_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.releases r WHERE r.id = release_id AND (r.status = 'published' OR public.is_system_admin(auth.uid())))
);
DROP POLICY IF EXISTS "release_sections_admin_write" ON public.release_sections;
CREATE POLICY "release_sections_admin_write" ON public.release_sections FOR ALL TO authenticated USING (public.is_system_admin(auth.uid())) WITH CHECK (public.is_system_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.release_likes (
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (release_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.release_likes TO authenticated;
GRANT ALL ON public.release_likes TO service_role;
ALTER TABLE public.release_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "release_likes_select" ON public.release_likes;
CREATE POLICY "release_likes_select" ON public.release_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "release_likes_manage_own" ON public.release_likes;
CREATE POLICY "release_likes_manage_own" ON public.release_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.release_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_comments TO authenticated;
GRANT ALL ON public.release_comments TO service_role;
ALTER TABLE public.release_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "release_comments_select" ON public.release_comments;
CREATE POLICY "release_comments_select" ON public.release_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "release_comments_insert_own" ON public.release_comments;
CREATE POLICY "release_comments_insert_own" ON public.release_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "release_comments_delete_own" ON public.release_comments;
CREATE POLICY "release_comments_delete_own" ON public.release_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_system_admin(auth.uid()));
