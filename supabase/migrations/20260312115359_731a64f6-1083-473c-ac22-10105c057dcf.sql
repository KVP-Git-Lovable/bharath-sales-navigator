
-- 1. Target Types table
CREATE TABLE public.target_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  metric text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.target_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read target_types"
  ON public.target_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert target_types"
  ON public.target_types FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update target_types"
  ON public.target_types FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete target_types"
  ON public.target_types FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Target Policies table
CREATE TABLE public.target_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_type_id uuid REFERENCES public.target_types(id) ON DELETE CASCADE NOT NULL,
  period_type text DEFAULT 'annual',
  quantity_unit text,
  enabled_parameters jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.target_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read target_policies"
  ON public.target_policies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert target_policies"
  ON public.target_policies FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update target_policies"
  ON public.target_policies FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete target_policies"
  ON public.target_policies FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Target Plans table
CREATE TABLE public.target_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  policy_id uuid REFERENCES public.target_policies(id) ON DELETE CASCADE NOT NULL,
  fy_year integer NOT NULL,
  total_target_value numeric DEFAULT 0,
  total_secondary_value numeric DEFAULT 0,
  total_visits_target numeric DEFAULT 0,
  target_start_month integer DEFAULT 1,
  target_end_month integer DEFAULT 12,
  status text DEFAULT 'draft',
  is_locked boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(policy_id, fy_year)
);

ALTER TABLE public.target_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read target_plans"
  ON public.target_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert target_plans"
  ON public.target_plans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update target_plans"
  ON public.target_plans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete target_plans"
  ON public.target_plans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Add target_plan_id to hierarchy_targets
ALTER TABLE public.hierarchy_targets 
  ADD COLUMN IF NOT EXISTS target_plan_id uuid REFERENCES public.target_plans(id);

-- 5. Grant permissions
GRANT ALL ON public.target_types TO authenticated;
GRANT ALL ON public.target_types TO anon;
GRANT ALL ON public.target_policies TO authenticated;
GRANT ALL ON public.target_policies TO anon;
GRANT ALL ON public.target_plans TO authenticated;
GRANT ALL ON public.target_plans TO anon;
