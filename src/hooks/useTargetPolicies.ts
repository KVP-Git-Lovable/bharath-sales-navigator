import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnabledParameters {
  product?: boolean;
  retailer?: boolean;
  beat?: boolean;
  distributor?: boolean;
  territory?: boolean;
  monthly?: boolean;
}

export interface TargetPolicy {
  id: string;
  name: string;
  target_type_id: string;
  period_type: string;
  quantity_unit: string | null;
  enabled_parameters: EnabledParameters;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  target_type?: { id: string; name: string; metric: string };
}

export const useTargetPolicies = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['target-policies'],
    queryFn: async (): Promise<TargetPolicy[]> => {
      const { data, error } = await (supabase as any)
        .from('target_policies')
        .select('*, target_type:target_types(id, name, metric)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        enabled_parameters: (d.enabled_parameters && typeof d.enabled_parameters === 'object')
          ? d.enabled_parameters
          : {},
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      target_type_id: string;
      period_type?: string;
      quantity_unit?: string;
      enabled_parameters?: EnabledParameters;
    }) => {
      const { data, error } = await (supabase as any)
        .from('target_policies')
        .insert({
          ...input,
          enabled_parameters: input.enabled_parameters || {},
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select('*, target_type:target_types(id, name, metric)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-policies'] });
      toast.success('Target policy created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TargetPolicy> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('target_policies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-policies'] });
      toast.success('Target policy updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('target_policies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-policies'] });
      toast.success('Target policy deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    policies: query.data || [],
    isLoading: query.isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
};
