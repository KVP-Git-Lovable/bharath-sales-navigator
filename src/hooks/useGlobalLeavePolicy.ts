import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalLeavePolicy {
  id: string;
  is_enabled: boolean;
  reset_cycle: string;
  custom_reset_date: string | null;
  allow_negative_balance: boolean;
  max_negative_limit: number;
  enable_carry_forward: boolean;
  max_carry_forward_limit: number;
  carry_forward_expiry_months: number | null;
  min_notice_period_days: number;
  max_continuous_leave_days: number | null;
  allow_backdated_leave: boolean;
  max_backdate_days: number;
  enable_half_day: boolean;
  enable_sandwich_rule: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveTypeOverride {
  id: string;
  leave_type_id: string;
  override_enabled: boolean;
  allow_negative_balance: boolean | null;
  max_negative_limit: number | null;
  enable_carry_forward: boolean | null;
  max_carry_forward_limit: number | null;
  carry_forward_expiry_months: number | null;
  custom_reset_cycle: string | null;
  created_at: string;
  updated_at: string;
}

export const useGlobalLeavePolicy = () => {
  return useQuery({
    queryKey: ['global-leave-policy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_leave_policy')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as GlobalLeavePolicy;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useLeaveTypeOverrides = () => {
  return useQuery({
    queryKey: ['leave-type-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_type_policy_override')
        .select('*');
      if (error) throw error;
      return (data || []) as LeaveTypeOverride[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export interface EffectiveLeavePolicy {
  is_enabled: boolean;
  enable_half_day: boolean;
  allow_backdated_leave: boolean;
  max_backdate_days: number;
  min_notice_period_days: number;
  max_continuous_leave_days: number | null;
  allow_negative_balance: boolean;
  max_negative_limit: number;
  enable_carry_forward: boolean;
  max_carry_forward_limit: number;
  enable_sandwich_rule: boolean;
}

export function getEffectivePolicy(
  global: GlobalLeavePolicy,
  overrides: LeaveTypeOverride[],
  leaveTypeId: string
): EffectiveLeavePolicy {
  const override = overrides.find(
    (o) => o.leave_type_id === leaveTypeId && o.override_enabled
  );

  return {
    is_enabled: global.is_enabled,
    enable_half_day: global.enable_half_day,
    enable_sandwich_rule: global.enable_sandwich_rule,
    allow_backdated_leave: global.allow_backdated_leave,
    max_backdate_days: global.max_backdate_days,
    min_notice_period_days: global.min_notice_period_days,
    max_continuous_leave_days: global.max_continuous_leave_days,
    allow_negative_balance: override?.allow_negative_balance ?? global.allow_negative_balance,
    max_negative_limit: override?.max_negative_limit ?? global.max_negative_limit,
    enable_carry_forward: override?.enable_carry_forward ?? global.enable_carry_forward,
    max_carry_forward_limit: override?.max_carry_forward_limit ?? global.max_carry_forward_limit,
  };
}

export const useEffectiveLeavePolicy = (leaveTypeId: string) => {
  const { data: globalPolicy, isLoading: globalLoading } = useGlobalLeavePolicy();
  const { data: overrides, isLoading: overridesLoading } = useLeaveTypeOverrides();

  const effectivePolicy = globalPolicy && overrides && leaveTypeId
    ? getEffectivePolicy(globalPolicy, overrides, leaveTypeId)
    : null;

  return {
    policy: effectivePolicy,
    isLoading: globalLoading || overridesLoading,
    globalPolicy,
  };
};
