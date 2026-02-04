import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Save, AlertCircle, Loader2, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EnabledParameters {
  product: boolean;
  retailer: boolean;
  beat: boolean;
  distributor: boolean;
  territory: boolean;
  monthly: boolean;
}

interface SubordinateAllocation {
  userId: string;
  fullName: string;
  profilePictureUrl: string | null;
  quantityTarget: number;
  revenueTarget: number;
  visitsTarget: number;
  existingPlanId?: string;
  level: number;
  subordinateCount: number;
  children: SubordinateAllocation[];
}

interface AllocationTableProps {
  parentUserId: string;
  totalQuantity: number;
  totalRevenue: number;
  totalVisits: number;
  quantityUnit: string;
  enabledMetrics: {
    quantity: boolean;
    revenue: boolean;
    visits: boolean;
  };
  enabledParameters: EnabledParameters;
  fyYear: number;
}

// Level-based background colors (matching screenshot 2)
const getLevelBackground = (level: number) => {
  switch (level) {
    case 0: return 'bg-background border-border';
    case 1: return 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800';
    case 2: return 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800';
    case 3: return 'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
    default: return 'bg-muted/30 border-border';
  }
};

export function AllocationTable({
  parentUserId,
  totalQuantity,
  totalRevenue,
  totalVisits,
  quantityUnit,
  enabledMetrics,
  enabledParameters,
  fyYear,
}: AllocationTableProps) {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<Map<string, SubordinateAllocation>>(new Map());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Fetch hierarchy recursively
  const { data: hierarchyData, isLoading } = useQuery({
    queryKey: ['hierarchy-allocations', parentUserId, fyYear],
    queryFn: async () => {
      // Get all subordinates using the RPC
      const { data: subordinatesData, error: subError } = await supabase.rpc('get_all_subordinates', {
        manager_user_id: parentUserId,
      });

      if (subError) throw subError;

      // Filter out the parent user (level 0), we want to show subordinates only
      const subordinatesOnly = (subordinatesData || []).filter(
        (s: { subordinate_user_id: string; level: number }) => s.level > 0
      );

      if (!subordinatesOnly.length) return [];

      const userIds = subordinatesOnly.map((s: { subordinate_user_id: string }) => s.subordinate_user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .in('id', userIds);

      // Get existing business plans
      const { data: plans } = await supabase
        .from('user_business_plans')
        .select('*')
        .in('user_id', userIds)
        .eq('year', fyYear);

      // Get subordinate counts
      const { data: employees } = await supabase
        .from('employees')
        .select('manager_id, user_id');

      const subordinateCounts = new Map<string, number>();
      employees?.forEach(emp => {
        if (emp.manager_id) {
          subordinateCounts.set(emp.manager_id, (subordinateCounts.get(emp.manager_id) || 0) + 1);
        }
      });

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const planMap = new Map(plans?.map(p => [p.user_id, p]) || []);
      const managerMap = new Map<string, string>();
      employees?.forEach(emp => {
        if (emp.manager_id) {
          managerMap.set(emp.user_id, emp.manager_id);
        }
      });

      // Build hierarchy tree - levels are relative to parentUserId (which is level 0)
      const nodeMap = new Map<string, SubordinateAllocation>();

      subordinatesOnly.forEach((sub: { subordinate_user_id: string; level: number }) => {
        const profile = profileMap.get(sub.subordinate_user_id);
        const existingPlan = planMap.get(sub.subordinate_user_id);
        
        nodeMap.set(sub.subordinate_user_id, {
          userId: sub.subordinate_user_id,
          fullName: profile?.full_name || 'Unknown',
          profilePictureUrl: profile?.profile_picture_url || null,
          quantityTarget: existingPlan?.quantity_target || 0,
          revenueTarget: existingPlan?.revenue_target || 0,
          visitsTarget: 0,
          existingPlanId: existingPlan?.id,
          level: sub.level, // Level relative to parentUserId
          subordinateCount: subordinateCounts.get(sub.subordinate_user_id) || 0,
          children: [],
        });
      });

      // Build tree structure - direct children of parentUserId are level 1
      const roots: SubordinateAllocation[] = [];
      nodeMap.forEach((node, userId) => {
        const managerId = managerMap.get(userId);
        // If the manager is in our nodeMap, add as child; otherwise check if it's a direct report
        if (managerId && nodeMap.has(managerId)) {
          nodeMap.get(managerId)!.children.push(node);
        } else if (managerId === parentUserId || node.level === 1) {
          // Direct child of the selected user
          roots.push(node);
        }
      });

      return roots;
    },
    enabled: !!parentUserId,
  });

  // Flatten hierarchy for allocations map
  useEffect(() => {
    if (hierarchyData) {
      const newAllocations = new Map<string, SubordinateAllocation>();
      const flatten = (nodes: SubordinateAllocation[]) => {
        nodes.forEach(node => {
          newAllocations.set(node.userId, node);
          if (node.children.length > 0) {
            flatten(node.children);
          }
        });
      };
      flatten(hierarchyData);
      setAllocations(newAllocations);
    }
  }, [hierarchyData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = Array.from(allocations.values()).map(alloc => ({
        id: alloc.existingPlanId || undefined,
        user_id: alloc.userId,
        year: fyYear,
        quantity_target: alloc.quantityTarget,
        revenue_target: alloc.revenueTarget,
        quantity_unit: quantityUnit,
      }));

      const { error } = await supabase
        .from('user_business_plans')
        .upsert(upserts, { onConflict: 'user_id,year' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy-allocations', parentUserId] });
      toast.success('Allocations saved successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const handleAllocationChange = (userId: string, field: string, value: number) => {
    setAllocations(prev => {
      const next = new Map(prev);
      const current = next.get(userId);
      if (current) {
        next.set(userId, { ...current, [field]: value });
      }
      return next;
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatCurrency = (num: number) => {
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
    return `₹${formatNumber(num)}`;
  };

  const parseNumber = (value: string) => {
    const cleaned = value.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Render a single user card
  const renderUserCard = (user: SubordinateAllocation, depth: number = 0) => {
    const isExpanded = expandedUsers.has(user.userId);
    const hasChildren = user.children.length > 0;
    const levelBg = getLevelBackground(user.level);

    return (
      <div key={user.userId} style={{ marginLeft: `${depth * 48}px` }}>
        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border transition-all mb-2',
            levelBg
          )}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(user.userId)}
              className="p-1 hover:bg-muted/50 rounded shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user.profilePictureUrl || undefined} alt={user.fullName} />
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>

          {/* Name and badges */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <span className="font-medium text-sm truncate">{user.fullName}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              L{user.level}
            </Badge>
            {user.subordinateCount > 0 && (
              <Badge variant="secondary" className="text-xs gap-0.5 shrink-0">
                <Users className="h-3 w-3" />
                {user.subordinateCount}
              </Badge>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Input fields */}
          <div className="flex items-center gap-4">
            {enabledMetrics.quantity && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground w-8">Qty</span>
                <Input
                  type="text"
                  value={user.quantityTarget > 0 ? formatNumber(user.quantityTarget) : ''}
                  onChange={(e) => handleAllocationChange(user.userId, 'quantityTarget', parseNumber(e.target.value))}
                  placeholder="0"
                  className="h-8 w-20 text-right text-sm"
                />
                <span className="text-xs text-muted-foreground w-8">{quantityUnit}</span>
              </div>
            )}
            {enabledMetrics.revenue && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">₹</span>
                <Input
                  type="text"
                  value={user.revenueTarget > 0 ? formatNumber(user.revenueTarget) : ''}
                  onChange={(e) => handleAllocationChange(user.userId, 'revenueTarget', parseNumber(e.target.value))}
                  placeholder="Revenue"
                  className="h-8 w-24 text-right text-sm"
                />
              </div>
            )}
            {enabledMetrics.visits && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Visits</span>
                <Input
                  type="text"
                  value={user.visitsTarget > 0 ? formatNumber(user.visitsTarget) : ''}
                  onChange={(e) => handleAllocationChange(user.userId, 'visitsTarget', Math.round(parseNumber(e.target.value)))}
                  placeholder="0"
                  className="h-8 w-16 text-right text-sm"
                />
              </div>
            )}
            {/* Only show revenue summary when revenue is enabled */}
            {enabledMetrics.revenue && (
              <span className="text-sm text-muted-foreground w-20 text-right">
                {formatCurrency(user.revenueTarget)}
              </span>
            )}
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {user.children.map(child => renderUserCard(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Calculate totals
  const allocatedQuantity = Array.from(allocations.values()).reduce((sum, a) => sum + a.quantityTarget, 0);
  const allocatedRevenue = Array.from(allocations.values()).reduce((sum, a) => sum + a.revenueTarget, 0);
  const allocatedVisits = Array.from(allocations.values()).reduce((sum, a) => sum + a.visitsTarget, 0);

  const remainingQuantity = totalQuantity - allocatedQuantity;
  const remainingRevenue = totalRevenue - allocatedRevenue;
  const remainingVisits = totalVisits - allocatedVisits;
  const hasOverAllocation = remainingQuantity < 0 || remainingRevenue < 0 || remainingVisits < 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!hierarchyData?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No direct reports found for this user.</p>
          <p className="text-sm mt-1">Select a different user from the hierarchy.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="border-b-2 border-primary/30 pb-0.5">Allocation Method</span>
          <Badge variant="secondary" className="ml-auto">
            {allocations.size} members
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hierarchy Cards */}
        <div className="space-y-0">
          {hierarchyData.map(user => renderUserCard(user))}
        </div>

        {/* Remaining Summary */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
          <span className="font-medium">Remaining</span>
          <div className="flex items-center gap-4">
            {enabledMetrics.quantity && (
              <Badge 
                variant={remainingQuantity < 0 ? 'destructive' : remainingQuantity === 0 ? 'default' : 'secondary'}
                className="font-mono"
              >
                {formatNumber(remainingQuantity)} {quantityUnit}
              </Badge>
            )}
            {enabledMetrics.revenue && (
              <Badge 
                variant={remainingRevenue < 0 ? 'destructive' : remainingRevenue === 0 ? 'default' : 'secondary'}
                className="font-mono"
              >
                {formatCurrency(remainingRevenue)}
              </Badge>
            )}
            {enabledMetrics.visits && (
              <Badge 
                variant={remainingVisits < 0 ? 'destructive' : remainingVisits === 0 ? 'default' : 'secondary'}
                className="font-mono"
              >
                {formatNumber(remainingVisits)} visits
              </Badge>
            )}
          </div>
        </div>

        {/* Warning for over-allocation */}
        {hasOverAllocation && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Total allocations exceed the target. Please adjust.</span>
          </div>
        )}

        {/* Centered Save Button */}
        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="min-w-[200px]"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Allocation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
