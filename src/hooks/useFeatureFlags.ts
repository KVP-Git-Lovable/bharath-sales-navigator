import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

/**
 * Maps navigation item IDs to their corresponding feature_key in the feature_flags table.
 * If a nav item isn't listed here, it will always be shown (no feature flag control).
 */
export const NAV_ITEM_FEATURE_MAP: Record<string, string> = {
  'attendance': 'attendance',
  'my-visit': 'my_visit',
  'all-retailers': 'all_retailers',
  'my-target': 'my_target',
  'performance': 'target_vs_actual',
  'analytics': 'analytics',
  'institutional-sales': 'institutional_sales',
  'distributor-master': 'distributor_master',
  'primary-orders': 'primary_orders',
  'territories': 'territories',
  'gps-track': 'gps_track',
  'my-beats': 'my_beats',
  'competition-master': 'competition_master',
  'schemes': 'schemes',
  'expenses': 'expenses',
  'leaderboard': 'gamification',
  'packing-list': 'packing_list_module',
  'my-deliveries': 'delivery_agent_app',
  'my-competency': 'competency',
  'recycle-bin': 'recycle_bin',
};

interface FeatureFlag {
  feature_key: string;
  is_enabled: boolean;
}

export const useFeatureFlags = () => {
  const { data: featureFlags = [], isLoading } = useQuery({
    queryKey: ['all-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('feature_key, is_enabled');
      
      if (error) {
        console.error('Error loading feature flags:', error);
        return [];
      }
      return (data || []) as FeatureFlag[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const flagMap = new Map(featureFlags.map(f => [f.feature_key, f.is_enabled]));

  /**
   * Check if a feature is enabled. 
   * Returns true if the feature_key doesn't exist in the table (no restriction).
   */
  const isFeatureEnabled = useCallback((featureKey: string): boolean => {
    if (!flagMap.has(featureKey)) return true; // No flag = always visible
    return flagMap.get(featureKey) === true;
  }, [flagMap]);

  /**
   * Check if a nav item should be visible based on its feature flag.
   */
  const isNavItemEnabled = useCallback((navItemId: string): boolean => {
    const featureKey = NAV_ITEM_FEATURE_MAP[navItemId];
    if (!featureKey) return true; // No mapping = always visible
    return isFeatureEnabled(featureKey);
  }, [isFeatureEnabled]);

  return {
    featureFlags,
    isLoading,
    isFeatureEnabled,
    isNavItemEnabled,
  };
};
