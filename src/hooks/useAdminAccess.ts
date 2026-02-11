import { useAuth } from '@/hooks/useAuth';
import { useProfilePermissions } from '@/hooks/useProfilePermissions';

export const useAdminAccess = () => {
  const { user, userRole, securityProfileName, loading: authLoading } = useAuth();
  const { hasAnyAdminPermission, hasModuleAccess, permittedAdminPaths, isLoading: permLoading } = useProfilePermissions();
  
  const isFullAdmin = userRole === 'admin' || securityProfileName === 'System Administrator';
  const hasAdminAccess = isFullAdmin || hasAnyAdminPermission;
  
  return { 
    hasAdminAccess, 
    isFullAdmin,
    hasModuleAccess,
    permittedAdminPaths,
    loading: authLoading || permLoading, 
    user, 
    userRole,
  };
};
