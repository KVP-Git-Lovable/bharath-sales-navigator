import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TargetType {
  id: string;
  name: string;
  metric: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useTargetTypes = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['target-types'],
    queryFn: async (): Promise<TargetType[]> => {
      const { data, error } = await (supabase as any)
        .from('target_types')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: { name: string; metric: string; description?: string }) => {
      const { data, error } = await (supabase as any)
        .from('target_types')
        .insert({ ...input, created_by: (await supabase.auth.getUser()).data.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-types'] });
      toast.success('Target type created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TargetType> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('target_types')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-types'] });
      toast.success('Target type updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('target_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-types'] });
      toast.success('Target type deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    targetTypes: query.data || [],
    isLoading: query.isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
};
