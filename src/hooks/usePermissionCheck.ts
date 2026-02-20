import { useCallback } from 'react';
import { useProfilePermissions } from '@/hooks/useProfilePermissions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

/**
 * Thin convenience hook for imperative permission checks.
 * Use in event handlers where you can't wrap with <PermissionGate>.
 */
export const usePermissionCheck = () => {
  const { securityProfileName } = useAuth();
  const { hasPermission } = useProfilePermissions();

  /**
   * Returns true if user has a security profile but LACKS the given permission.
   */
  const isRestricted = useCallback(
    (name: string, permType: 'can_read' | 'can_create' | 'can_edit' | 'can_delete' = 'can_read') => {
      if (!securityProfileName) return false;
      return !hasPermission(name, permType);
    },
    [securityProfileName, hasPermission]
  );

  /**
   * Shows a toast and returns true if the action is denied.
   * Usage: if (guardAction('action_attendance_check_in')) return;
   */
  const guardAction = useCallback(
    (name: string, permType: 'can_read' | 'can_create' | 'can_edit' | 'can_delete' = 'can_read', message?: string) => {
      if (!securityProfileName) return false;
      if (hasPermission(name, permType)) return false;
      toast({
        title: 'Permission Denied',
        description: message || 'You do not have permission to perform this action',
        variant: 'destructive',
      });
      return true;
    },
    [securityProfileName, hasPermission]
  );

  return { isRestricted, guardAction };
};
