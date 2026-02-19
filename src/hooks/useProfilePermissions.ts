import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallback } from 'react';

interface ProfilePermission {
  object_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_view_all: boolean;
  can_modify_all: boolean;
}

// Maps admin module feature names to their corresponding AdminControls card paths
export const ADMIN_MODULE_PERMISSION_MAP: Record<string, string> = {
  'admin_dashboard': '/admin',
  'admin_price_book': '/admin/price-books',
  'admin_attendance': '/attendance-management',
  'admin_product_mgmt': '/product-management',
  'admin_scheme_master': '/scheme-management',
  'admin_vendor_mgmt': '/vendors',
  'admin_territories_distributors': '/territories-and-distributors',
  'admin_expense_mgmt': '/admin-expense-management',
  'admin_feedback_mgmt': '/feedback-management',
  'admin_operations': '/operations',
  'admin_gps_track_mgmt': '/gps-track-management',
  'admin_retail_mgmt': '/retail-management',
  'admin_van_sales': '/van-sales-management',
  'admin_security_access': '/security-management',
  'admin_feature_mgmt': '/feature-management',
  'admin_gamification': '/gamification-admin',
  'admin_retailer_loyalty': '/retailer-loyalty-admin',
  'admin_company_profile': '/company-profile',
  'admin_invoice_mgmt': '/invoice-management',
  'admin_credit_mgmt': '/credit-management',
  'admin_notification_setup': '/push-content-setup',
  'admin_recycle_bin': '/admin/recycle-bin',
  'admin_distributor_portal': '/admin/distributor-portal',
  'admin_target_vs_actual': '/admin/target-vs-actual',
  'admin_hierarchy_targets': '/admin/target-vs-actual', // same page
};

// Sub-feature prefixes for modules where parent name doesn't match sub-feature naming
export const ADMIN_MODULE_SUB_PREFIXES: Record<string, string[]> = {
  'admin_product_mgmt': ['admin_product_'],
  'admin_scheme_master': ['admin_scheme_'],
  'admin_vendor_mgmt': ['admin_vendor_'],
  'admin_territories_distributors': ['admin_territory_', 'admin_distributor_', 'admin_region_'],
  'admin_expense_mgmt': ['admin_expense_'],
  'admin_feedback_mgmt': ['admin_feedback_', 'admin_competition_', 'admin_branding_'],
};

// Reverse map: path -> feature name(s)
export const PATH_TO_PERMISSION_MAP: Record<string, string> = {};
Object.entries(ADMIN_MODULE_PERMISSION_MAP).forEach(([feature, path]) => {
  if (!PATH_TO_PERMISSION_MAP[path]) {
    PATH_TO_PERMISSION_MAP[path] = feature;
  }
});

export const useProfilePermissions = () => {
  const { user } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['profile-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get profile-level permissions via user_profiles join
      const { data: profilePerms, error: profileError } = await supabase
        .from('user_profiles')
        .select('profile_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profilePerms?.profile_id) return [];

      const { data: perms, error: permsError } = await supabase
        .from('profile_object_permissions')
        .select('object_name, can_read, can_create, can_edit, can_delete, can_view_all, can_modify_all')
        .eq('profile_id', profilePerms.profile_id);

      if (permsError) return [];

      // profile_object_permissions is the ONLY source of truth
      return (perms || []) as ProfilePermission[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const hasAnyAdminPermission = permissions.some(
    p => p.object_name.startsWith('admin_') && p.can_read
  );

  const hasPermission = useCallback((objectName: string, permType: 'can_read' | 'can_create' | 'can_edit' | 'can_delete' | 'can_view_all' | 'can_modify_all' = 'can_read') => {
    const perm = permissions.find(p => p.object_name === objectName);
    return perm ? !!perm[permType] : false;
  }, [permissions]);

  // Check if user has can_read on any sub-feature under a given feature group prefix
  const hasModuleAccess = useCallback((featurePrefix: string) => {
    return permissions.some(
      p => p.object_name.startsWith(featurePrefix) && p.can_read
    );
  }, [permissions]);

  // Get list of admin module feature names user has access to
  const permittedAdminModules = Object.keys(ADMIN_MODULE_PERMISSION_MAP).filter(
    featureName => {
      if (hasModuleAccess(featureName)) return true;
      const subPrefixes = ADMIN_MODULE_SUB_PREFIXES[featureName];
      if (subPrefixes) {
        return subPrefixes.some(prefix =>
          permissions.some(p => p.object_name.startsWith(prefix) && p.can_read)
        );
      }
      return false;
    }
  );

  // Get permitted admin paths
  const permittedAdminPaths = new Set(
    permittedAdminModules.map(f => ADMIN_MODULE_PERMISSION_MAP[f])
  );

  return {
    permissions,
    isLoading,
    hasAnyAdminPermission,
    hasPermission,
    hasModuleAccess,
    permittedAdminModules,
    permittedAdminPaths,
  };
};
