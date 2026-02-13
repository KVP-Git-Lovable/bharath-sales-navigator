import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Subordinate {
  subordinate_user_id: string;
  level: number;
  full_name: string;
}

interface UseSubordinatesReturn {
  subordinates: Subordinate[];
  subordinateIds: string[];
  directReportIds: string[];
  isManager: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useSubordinates = (): UseSubordinatesReturn => {
  const { user } = useAuth();

  const {
    data: subordinates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['subordinates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase.rpc('get_all_subordinates', {
        manager_user_id: user.id,
      });

      if (error) {
        console.error('Error fetching subordinates:', error);
        throw error;
      }

      return (data || []) as Subordinate[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Filter out self (level 0) to get actual subordinates
  const actualSubordinates = subordinates.filter((s) => s.level > 0);
  
  // Get all subordinate IDs (excluding self)
  const subordinateIds = actualSubordinates.map((s) => s.subordinate_user_id);
  
  // Get direct report IDs only (level 1) - used for approvals
  const directReportIds = subordinates.filter((s) => s.level === 1).map((s) => s.subordinate_user_id);
  
  // User is a manager if they have at least one subordinate
  const isManager = actualSubordinates.length > 0;

  return {
    subordinates: actualSubordinates,
    subordinateIds,
    directReportIds,
    isManager,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

// Hook to get all user IDs a user can view (self + subordinates)
export const useViewableUserIds = (): {
  viewableUserIds: string[];
  isManager: boolean;
  isLoading: boolean;
} => {
  const { user } = useAuth();
  const { subordinateIds, isManager, isLoading } = useSubordinates();

  const viewableUserIds = user?.id
    ? [user.id, ...subordinateIds]
    : [];

  return {
    viewableUserIds,
    isManager,
    isLoading,
  };
};
