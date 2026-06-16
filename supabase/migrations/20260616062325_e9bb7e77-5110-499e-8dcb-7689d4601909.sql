GRANT INSERT ON TABLE public.website_leads TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.website_leads TO authenticated;
GRANT ALL ON TABLE public.website_leads TO service_role;

GRANT INSERT ON TABLE public.roi_calculator_entries TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.roi_calculator_entries TO authenticated;
GRANT ALL ON TABLE public.roi_calculator_entries TO service_role;