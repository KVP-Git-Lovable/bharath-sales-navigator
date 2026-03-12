import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TargetPlan {
  id: string;
  name: string;
  policy_id: string;
  fy_year: number;
  total_target_value: number;
  total_secondary_value: number;
  total_visits_target: number;
  target_start_month: number;
  target_end_month: number;
  status: string;
  is_locked: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  policy?: {
    id: string;
    name: string;
    target_type_id: string;
    period_type: string;
    quantity_unit: string | null;
    enabled_parameters: any;
    target_type?: { id: string; name: string; metric: string };
  };
}

export const useTargetPlans = (fyYear?: number) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['target-plans', fyYear],
    queryFn: async (): Promise<TargetPlan[]> => {
      let q = (supabase as any)
        .from('target_plans')
        .select('*, policy:target_policies(id, name, target_type_id, period_type, quantity_unit, enabled_parameters, target_type:target_types(id, name, metric))')
        .order('created_at', { ascending: true });
      if (fyYear) q = q.eq('fy_year', fyYear);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      policy_id: string;
      fy_year: number;
      total_target_value?: number;
      total_secondary_value?: number;
      total_visits_target?: number;
      target_start_month?: number;
      target_end_month?: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from('target_plans')
        .insert({
          ...input,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select('*, policy:target_policies(id, name, target_type_id, period_type, quantity_unit, enabled_parameters, target_type:target_types(id, name, metric))')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-plans'] });
      toast.success('Target plan created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TargetPlan> & { id: string }) => {
      const { policy, ...cleanUpdates } = updates as any;
      const { error } = await (supabase as any)
        .from('target_plans')
        .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-plans'] });
      toast.success('Target plan updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('target_plans')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-plans'] });
      toast.success('Target plan deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lockMutation = useMutation({
    mutationFn: async ({ id, lock }: { id: string; lock: boolean }) => {
      const { error } = await (supabase as any)
        .from('target_plans')
        .update({
          is_locked: lock,
          status: lock ? 'locked' : 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['target-plans'] });
      toast.success(vars.lock ? 'Plan locked' : 'Plan unlocked');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    plans: query.data || [],
    isLoading: query.isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    lock: lockMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
};
