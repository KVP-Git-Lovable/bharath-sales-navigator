import { useAuth } from '@/hooks/useAuth';

export const useAdminAccess = () => {
  const { user, userRole, securityProfileName, loading } = useAuth();
  
  const hasAdminAccess = userRole === 'admin' || securityProfileName === 'System Administrator';
  
  return { hasAdminAccess, loading, user, userRole };
};
