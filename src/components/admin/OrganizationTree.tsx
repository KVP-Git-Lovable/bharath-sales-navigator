import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight, ChevronDown, User, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TreeNode {
  userId: string;
  fullName: string;
  profilePictureUrl: string | null;
  level: number;
  children: TreeNode[];
  isManager: boolean;
}

interface OrganizationTreeProps {
  selectedNodeId: string | null;
  onNodeSelect: (userId: string, fullName: string, level: number) => void;
}

export function OrganizationTree({ selectedNodeId, onNodeSelect }: OrganizationTreeProps) {
  const { user } = useAuth();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Fetch hierarchy
  const { data: hierarchy, isLoading } = useQuery({
    queryKey: ['organization-hierarchy', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc('get_all_subordinates', {
        manager_user_id: user.id,
      });

      if (error) throw error;

      // Also get profile pictures
      const userIds = data?.map((d: { subordinate_user_id: string }) => d.subordinate_user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, profile_picture_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.profile_picture_url]) || []);

      // Build tree structure
      const tree = buildTree(data || [], profileMap);
      return tree;
    },
    enabled: !!user?.id,
  });

  const buildTree = (flatData: Array<{ subordinate_user_id: string; full_name: string; level: number }>, profileMap: Map<string, string | null>): TreeNode[] => {
    if (flatData.length === 0) return [];

    // Group by level
    const levelMap = new Map<number, typeof flatData>();
    flatData.forEach(item => {
      const level = item.level;
      if (!levelMap.has(level)) {
        levelMap.set(level, []);
      }
      levelMap.get(level)!.push(item);
    });

    // Find the root (level 0)
    const root = levelMap.get(0)?.[0];
    if (!root) return [];

    // Simple approach: create tree from flat data
    const nodeMap = new Map<string, TreeNode>();
    
    // First pass: create all nodes
    flatData.forEach(item => {
      nodeMap.set(item.subordinate_user_id, {
        userId: item.subordinate_user_id,
        fullName: item.full_name || 'Unknown',
        profilePictureUrl: profileMap.get(item.subordinate_user_id) || null,
        level: item.level,
        children: [],
        isManager: false,
      });
    });

    // Find direct children for each user
    const rootNode = nodeMap.get(root.subordinate_user_id);
    if (!rootNode) return [];

    // For now, attach level 1 users to root
    const level1Users = levelMap.get(1) || [];
    level1Users.forEach(l1 => {
      const node = nodeMap.get(l1.subordinate_user_id);
      if (node) {
        rootNode.children.push(node);
        rootNode.isManager = true;
        
        // Attach level 2 to level 1
        const level2Users = levelMap.get(2) || [];
        level2Users.forEach(l2 => {
          const l2Node = nodeMap.get(l2.subordinate_user_id);
          if (l2Node) {
            node.children.push(l2Node);
            node.isManager = true;
          }
        });
      }
    });

    return [rootNode];
  };

  const toggleExpand = (userId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.userId);
    const isSelected = selectedNodeId === node.userId;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.userId}>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
            depth > 0 && 'ml-4'
          )}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => {
            onNodeSelect(node.userId, node.fullName, node.level);
            if (hasChildren) {
              toggleExpand(node.userId);
            }
          }}
        >
          {hasChildren ? (
            <button
              className="p-0.5 hover:bg-muted-foreground/10 rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.userId);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <Avatar className="h-6 w-6">
            <AvatarImage src={node.profilePictureUrl || undefined} />
            <AvatarFallback>
              {node.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span className="flex-1 truncate text-sm font-medium">
            {node.fullName}
          </span>

          {node.isManager && (
            <Users className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {isExpanded && hasChildren && (
          <div className="border-l border-border ml-6">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hierarchy || hierarchy.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No team hierarchy found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="p-2">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
          Organization Hierarchy
        </h3>
        {hierarchy.map(node => renderNode(node))}
      </div>
    </ScrollArea>
  );
}
