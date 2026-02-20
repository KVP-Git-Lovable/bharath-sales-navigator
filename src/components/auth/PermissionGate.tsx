import { ReactNode, useCallback } from 'react';
import { useProfilePermissions } from '@/hooks/useProfilePermissions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface PermissionGateProps {
  children: ReactNode;
  permissionName: string;
  permType?: 'can_read' | 'can_create' | 'can_edit' | 'can_delete';
  hide?: boolean;
  fallbackMessage?: string;
}

/**
 * Wraps any UI element and enforces action/widget permissions.
 * - No security profile → renders normally (backward compat)
 * - Permission granted → renders normally
 * - Permission denied + hide → renders nothing
 * - Permission denied → grayed out + toast on click
 */
export const PermissionGate = ({
  children,
  permissionName,
  permType = 'can_read',
  hide = false,
  fallbackMessage,
}: PermissionGateProps) => {
  const { securityProfileName } = useAuth();
  const { hasPermission } = useProfilePermissions();

  // No security profile assigned → bypass all checks
  if (!securityProfileName) return <>{children}</>;

  const isAllowed = hasPermission(permissionName, permType);

  if (isAllowed) return <>{children}</>;

  // Denied — hide entirely
  if (hide) return null;

  // Denied — render grayed out with click interception
  return (
    <div
      className="relative opacity-50 cursor-not-allowed select-none"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toast({
          title: 'Permission Denied',
          description: fallbackMessage || 'You do not have permission to perform this action',
          variant: 'destructive',
        });
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div className="pointer-events-none">
        {children}
      </div>
    </div>
  );
};
