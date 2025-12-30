-- Create target_setup_master table for Band-wise target configuration
CREATE TABLE public.target_setup_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  band INTEGER NOT NULL CHECK (band >= 1 AND band <= 5),
  territory_id UUID REFERENCES public.territories(id),
  state_territory_id UUID REFERENCES public.territories(id),
  annual_revenue_target NUMERIC NOT NULL DEFAULT 0,
  annual_quantity_target NUMERIC NOT NULL DEFAULT 0,
  unit_of_measure TEXT NOT NULL DEFAULT 'Units',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.target_setup_master ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage target setup master"
ON public.target_setup_master
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view target setup master"
ON public.target_setup_master
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_target_setup_master_updated_at
BEFORE UPDATE ON public.target_setup_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add new columns to employees table for territory lookups
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS district_territory_id UUID REFERENCES public.territories(id),
ADD COLUMN IF NOT EXISTS state_territory_id UUID REFERENCES public.territories(id),
ADD COLUMN IF NOT EXISTS hq_territory_id UUID REFERENCES public.territories(id);