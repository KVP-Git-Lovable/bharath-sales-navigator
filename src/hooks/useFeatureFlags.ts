import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfilePermissions } from '@/hooks/useProfilePermissions';

/**
 * Maps navigation item IDs to their corresponding feature_key in the feature_flags table.
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

/**
 * Maps navigation item IDs to their permission object name prefixes.
 * If a user's profile has can_read on ANY object matching this prefix, the module is visible.
 */
export const NAV_ITEM_PERMISSION_PREFIX: Record<string, string> = {
  'attendance': 'attendance_',
  'my-visit': 'visit_',
  'all-retailers': 'retailer_',
  'my-target': 'target_',
  'performance': 'performance_',
  'analytics': 'analytics_',
  'institutional-sales': 'institutional_',
  'distributor-master': 'distributor_',
  'primary-orders': 'primary_order_',
  'territories': 'territory_',
  'gps-track': 'gps_',
  'my-beats': 'beat_',
  'competition-master': 'competition_',
  'schemes': 'scheme_',
  'expenses': 'expense_',
  'leaderboard': 'gamification_',
  'packing-list': 'packing_list_',
  'my-deliveries': 'delivery_',
  'my-competency': 'competency_',
  'recycle-bin': 'recycle_',
};

interface FeatureFlag {
  feature_key: string;
  is_enabled: boolean;
}

export const useFeatureFlags = () => {
  const { userRole, securityProfileName } = useAuth();
  const { permissions, isLoading: permissionsLoading } = useProfilePermissions();

  const { data: featureFlags = [], isLoading: flagsLoading } = useQuery({
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

  const isLoading = flagsLoading || permissionsLoading;
  const flagMap = new Map(featureFlags.map(f => [f.feature_key, f.is_enabled]));
  const isFullAdmin = securityProfileName === 'System Administrator';

  // Build a set of permission prefixes the user has can_read on
  const userPermissionPrefixes = useMemo(() => {
    const prefixes = new Set<string>();
    permissions.forEach(p => {
      if (p.can_read) {
        // Extract prefix: e.g. "visit_activity_log" -> check against all known prefixes
        prefixes.add(p.object_name);
      }
    });
    return prefixes;
  }, [permissions]);

  /**
   * Check if a feature is globally enabled.
   */
  const isFeatureEnabled = useCallback((featureKey: string): boolean => {
    if (!flagMap.has(featureKey)) return true;
    return flagMap.get(featureKey) === true;
  }, [flagMap]);

  /**
   * Check if user has can_read permission on any object matching the given prefix.
   */
  const hasPermissionForPrefix = useCallback((prefix: string): boolean => {
    for (const objName of userPermissionPrefixes) {
      if (objName.startsWith(prefix)) return true;
    }
    return false;
  }, [userPermissionPrefixes]);

  /**
   * Check if a nav item should be visible based on:
   * 1. Global feature flag (must be enabled)
   * 2. User's profile permissions (must have can_read on at least one matching object)
   * Admin/System Administrator bypasses permission check.
   */
  const isNavItemEnabled = useCallback((navItemId: string): boolean => {
    // Step 1: Check global feature flag
    const featureKey = NAV_ITEM_FEATURE_MAP[navItemId];
    if (featureKey && !isFeatureEnabled(featureKey)) return false;

    // Step 2: Admin bypass - show all globally enabled modules
    if (isFullAdmin) return true;

    // Step 3: Distinguish between "no profile assigned" and "profile with 0 permissions"
    if (!securityProfileName) return true;  // No profile assigned = show all (backward compat)
    if (permissions.length === 0) return false; // Profile assigned but no permissions = hide all

    // Step 4: Check permission prefix
    const prefix = NAV_ITEM_PERMISSION_PREFIX[navItemId];
    if (!prefix) return true; // No mapping = always visible

    return hasPermissionForPrefix(prefix);
  }, [isFeatureEnabled, isFullAdmin, permissions.length, hasPermissionForPrefix]);

  return {
    featureFlags,
    isLoading,
    isFeatureEnabled,
    isNavItemEnabled,
    hasPermissionForPrefix,
    permissions,
  };
};
