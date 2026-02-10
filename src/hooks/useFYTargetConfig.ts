 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 
 export interface EnabledParameters {
   product?: boolean;
   retailer?: boolean;
   beat?: boolean;
   distributor?: boolean;
   territory?: boolean;
   monthly?: boolean;
 }
 
export interface FYTargetConfig {
  id: string;
  fy_year: number;
  enable_quantity: boolean;
  enable_revenue: boolean;
  enable_visits: boolean;
  quantity_unit: string | null;
  enabled_parameters: EnabledParameters | null;
  total_quantity_target: number | null;
  total_revenue_target: number | null;
  total_visits_target: number | null;
  setup_completed: boolean;
  target_plan_name: string | null;
  is_locked: boolean;
  target_start_month: number;
  target_end_month: number;
}
 
 export const useFYTargetConfig = (fyYear: number) => {
   return useQuery({
     queryKey: ['fy-target-config', fyYear],
     queryFn: async (): Promise<FYTargetConfig | null> => {
       const { data, error } = await supabase
         .from('fy_target_config')
         .select('*')
         .eq('fy_year', fyYear)
         .maybeSingle();
 
       if (error) {
         console.error('Error fetching FY target config:', error);
         return null;
       }
 
       return data ? {
         ...data,
         enabled_parameters: data.enabled_parameters as EnabledParameters | null,
       } : null;
     },
     staleTime: 5 * 60 * 1000, // 5 minutes
   });
 };