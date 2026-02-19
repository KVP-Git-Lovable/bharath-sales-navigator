import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfilePermissions } from '@/hooks/useProfilePermissions';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAuth } from '@/hooks/useAuth';

interface RoutePermissionGuardProps {
  children: ReactNode;
  permissionPrefix: string;
}

/**
 * Route-level permission guard. Wraps a page and checks if the user
 * has `can_read` on at least one permission object matching the given prefix.
 * 
 * Bypass conditions (all content visible):
 *  - Admin / System Administrator
 *  - No security profile assigned (permissions array is empty)
 *  - Has can_read on any object starting with permissionPrefix
 */
export const RoutePermissionGuard = ({ children, permissionPrefix }: RoutePermissionGuardProps) => {
  const { permissions, isLoading, hasModuleAccess } = useProfilePermissions();
  const { isFullAdmin, loading: adminLoading } = useAdminAccess();
  const { securityProfileName } = useAuth();

  // Still loading permissions
  if (isLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Bypass: admin
  if (isFullAdmin) return <>{children}</>;

  // Bypass: no security profile assigned (backward compat)
  if (!securityProfileName) return <>{children}</>;

  // Profile assigned but zero permissions → deny all
  if (permissions.length === 0) return <Navigate to="/dashboard" replace />;

  // Check if user has can_read on any object matching the prefix
  if (hasModuleAccess(permissionPrefix)) {
    return <>{children}</>;
  }

  // No access → redirect to dashboard
  return <Navigate to="/dashboard" replace />;
};
