import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RegularizationPolicy {
  id: string;
  is_enabled: boolean;
  monthly_limit: number | null;
  daily_limit: number;
  allow_checkin_edit: boolean;
  allow_checkout_edit: boolean;
  allow_status_edit: boolean;
  reason_mandatory: boolean;
  max_backdate_days: number;
  allow_previous_month: boolean;
  restrict_after_payroll_lock: boolean;
  approval_mode: string;
  update_attendance_on_approval: boolean;
  recalculate_hours: boolean;
  adjust_leave_balance: boolean;
  created_at: string;
  updated_at: string;
}

export const useRegularizationPolicy = () => {
  return useQuery({
    queryKey: ['regularization-policy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regularization_policy')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as RegularizationPolicy;
    },
    staleTime: 5 * 60 * 1000,
  });
};
