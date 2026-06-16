
-- Table 1: website_leads
CREATE TABLE IF NOT EXISTS public.website_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  lead_type text NOT NULL,
  lead_sub_type text,
  source_page text,
  form_origin text,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  job_title text,
  team_size text,
  industry text,
  location text,
  message text,
  status text NOT NULL DEFAULT 'new',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  CONSTRAINT website_leads_lead_type_check CHECK (lead_type IN ('contact_request','demo_request','roi_callback_request')),
  CONSTRAINT website_leads_status_check CHECK (status IN ('new','contacted','qualified','closed','spam'))
);

GRANT INSERT ON public.website_leads TO anon;
GRANT INSERT, SELECT, UPDATE ON public.website_leads TO authenticated;
GRANT ALL ON public.website_leads TO service_role;

ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit website leads (anon)" ON public.website_leads;
CREATE POLICY "Anyone can submit website leads (anon)"
  ON public.website_leads FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can submit website leads (auth)" ON public.website_leads;
CREATE POLICY "Anyone can submit website leads (auth)"
  ON public.website_leads FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view website leads" ON public.website_leads;
CREATE POLICY "Admins can view website leads"
  ON public.website_leads FOR SELECT TO authenticated
  USING (public.is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update website leads" ON public.website_leads;
CREATE POLICY "Admins can update website leads"
  ON public.website_leads FOR UPDATE TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS website_leads_lead_type_idx ON public.website_leads(lead_type);
CREATE INDEX IF NOT EXISTS website_leads_created_at_idx ON public.website_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS website_leads_email_idx ON public.website_leads(email);

DROP TRIGGER IF EXISTS update_website_leads_updated_at ON public.website_leads;
CREATE TRIGGER update_website_leads_updated_at
  BEFORE UPDATE ON public.website_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Table 2: roi_calculator_entries
CREATE TABLE IF NOT EXISTS public.roi_calculator_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  full_name text,
  company text,
  email text,
  phone text,
  company_size text,
  industry text,
  location text,
  submission_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  roi_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_page text DEFAULT '/roi-calculator',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text
);

GRANT INSERT ON public.roi_calculator_entries TO anon;
GRANT INSERT, SELECT, UPDATE ON public.roi_calculator_entries TO authenticated;
GRANT ALL ON public.roi_calculator_entries TO service_role;

ALTER TABLE public.roi_calculator_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit ROI entries (anon)" ON public.roi_calculator_entries;
CREATE POLICY "Anyone can submit ROI entries (anon)"
  ON public.roi_calculator_entries FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can submit ROI entries (auth)" ON public.roi_calculator_entries;
CREATE POLICY "Anyone can submit ROI entries (auth)"
  ON public.roi_calculator_entries FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view ROI entries" ON public.roi_calculator_entries;
CREATE POLICY "Admins can view ROI entries"
  ON public.roi_calculator_entries FOR SELECT TO authenticated
  USING (public.is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update ROI entries" ON public.roi_calculator_entries;
CREATE POLICY "Admins can update ROI entries"
  ON public.roi_calculator_entries FOR UPDATE TO authenticated
  USING (public.is_system_admin(auth.uid()))
  WITH CHECK (public.is_system_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS roi_entries_created_at_idx ON public.roi_calculator_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS roi_entries_email_idx ON public.roi_calculator_entries(email);

DROP TRIGGER IF EXISTS update_roi_calculator_entries_updated_at ON public.roi_calculator_entries;
CREATE TRIGGER update_roi_calculator_entries_updated_at
  BEFORE UPDATE ON public.roi_calculator_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
