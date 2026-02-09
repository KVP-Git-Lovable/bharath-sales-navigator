import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HierarchyNode {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  directReports: string[];
}

export interface HierarchyGroup {
  managerId: string | null;
  managerName: string;
  managerAvatar: string | null;
  memberIds: string[];
}

/**
 * Fetches the org hierarchy structure for a given set of user IDs
 * using the employees table (user_id -> manager_id).
 */
export const useHierarchyTeamStructure = (userIds: string[]) => {
  return useQuery({
    queryKey: ['hierarchy-team-structure', userIds.length, userIds.slice(0, 5).join(',')],
    queryFn: async (): Promise<HierarchyGroup[]> => {
      if (!userIds.length) return [];

      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .in('id', userIds);

      // Fetch manager relationships from employees table
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id, manager_id')
        .in('user_id', userIds);

      const userIdSet = new Set(userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build parent->children map (only where manager is also in our user set)
      const childrenMap = new Map<string, string[]>();
      const hasParent = new Set<string>();

      employees?.forEach(emp => {
        if (emp.manager_id && userIdSet.has(emp.manager_id)) {
          if (!childrenMap.has(emp.manager_id)) {
            childrenMap.set(emp.manager_id, []);
          }
          childrenMap.get(emp.manager_id)!.push(emp.user_id);
          hasParent.add(emp.user_id);
        }
      });

      // Find top-level managers (users who have direct reports but no parent in the set)
      const groups: HierarchyGroup[] = [];
      const grouped = new Set<string>();

      // First, add groups for managers who have children in the set
      childrenMap.forEach((children, managerId) => {
        const profile = profileMap.get(managerId);
        groups.push({
          managerId,
          managerName: profile?.full_name || 'Unknown Manager',
          managerAvatar: profile?.profile_picture_url || null,
          memberIds: children,
        });
        children.forEach(id => grouped.add(id));
        // The manager itself is also grouped (as a header)
        grouped.add(managerId);
      });

      // Collect ungrouped users
      const ungrouped = userIds.filter(id => !grouped.has(id));
      if (ungrouped.length > 0) {
        groups.push({
          managerId: null,
          managerName: 'Other Members',
          managerAvatar: null,
          memberIds: ungrouped,
        });
      }

      return groups;
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
