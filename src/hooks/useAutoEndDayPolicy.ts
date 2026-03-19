import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AutoEndDayPolicy {
  id: string;
  is_enabled: boolean;
  auto_close_time: string; // TIME as string e.g. "22:00:00"
  timezone: string;
  last_activity_source: 'all_activity' | 'last_order_only' | 'last_click';
  pre_warning_enabled: boolean;
  pre_warning_minutes_before: number;
  close_in_progress_visits: boolean;
  cancel_planned_visits: boolean;
  mark_unproductive: boolean;
  created_at: string;
  updated_at: string;
}

export const useAutoEndDayPolicy = () => {
  return useQuery({
    queryKey: ['auto-end-day-policy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_end_day_policy')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as AutoEndDayPolicy;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateAutoEndDayPolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<AutoEndDayPolicy> & { id: string }) => {
      const { id, ...rest } = updates;
      const { data, error } = await supabase
        .from('auto_end_day_policy')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-end-day-policy'] });
      toast.success('Auto End Day policy saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save policy: ' + error.message);
    },
  });
};
