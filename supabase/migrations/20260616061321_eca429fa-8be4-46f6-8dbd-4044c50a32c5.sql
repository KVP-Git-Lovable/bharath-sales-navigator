GRANT INSERT ON public.website_leads TO anon, authenticated;
GRANT SELECT, UPDATE ON public.website_leads TO authenticated;
GRANT ALL ON public.website_leads TO service_role;

GRANT INSERT ON public.roi_calculator_entries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.roi_calculator_entries TO authenticated;
GRANT ALL ON public.roi_calculator_entries TO service_role;