import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Save, AlertCircle, Loader2, ChevronDown, ChevronRight, Users, 
  GitBranch, Table2, Equal, Percent, Edit3, ArrowUpCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TargetStrategySelector, InlineStrategySelector, TargetStrategy } from './TargetStrategySelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  percentage: number;
  existingPlanId?: string;
  level: number;
  subordinateCount: number;
  children: SubordinateAllocation[];
  targetStrategy: TargetStrategy;
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

type AllocationMethod = 'equal' | 'percentage' | 'manual';
type ViewMode = 'tree' | 'table';

const getLevelBackground = (level: number) => {
  switch (level) {
    case 0: return 'bg-background border-border';
    case 1: return 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800';
    case 2: return 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800';
    case 3: return 'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
    default: return 'bg-muted/30 border-border';
  }
};

const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num);

const formatCurrency = (num: number) => {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${formatNumber(num)}`;
};

const parseNumber = (value: string) => {
  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

/**
 * Recursively compute effective targets based on each node's strategy.
 * For `roll_up` managers: target = sum of children's effective targets.
 * For others: use the stored/manually-entered target.
 * Returns a Map of userId -> { quantity, revenue, visits }
 */
function computeEffectiveTargets(
  nodes: SubordinateAllocation[],
  allocations: Map<string, SubordinateAllocation>,
  perUserStrategies: Map<string, TargetStrategy>,
): Map<string, { quantity: number; revenue: number; visits: number }> {
  const results = new Map<string, { quantity: number; revenue: number; visits: number }>();

  function compute(node: SubordinateAllocation): { quantity: number; revenue: number; visits: number } {
    const strategy = perUserStrategies.get(node.userId) || node.targetStrategy || 'roll_down';
    const alloc = allocations.get(node.userId);
    const storedTarget = {
      quantity: alloc?.quantityTarget || 0,
      revenue: alloc?.revenueTarget || 0,
      visits: alloc?.visitsTarget || 0,
    };

    if (node.children.length === 0 || strategy !== 'roll_up') {
      results.set(node.userId, storedTarget);
      // Still recurse children so they get their own results
      node.children.forEach(child => compute(child));
      return storedTarget;
    }

    // roll_up: sum children's effective targets
    let totalQty = 0, totalRev = 0, totalVis = 0;
    node.children.forEach(child => {
      const childResult = compute(child);
      totalQty += childResult.quantity;
      totalRev += childResult.revenue;
      totalVis += childResult.visits;
    });

    const computed = { quantity: totalQty, revenue: totalRev, visits: totalVis };
    results.set(node.userId, computed);
    return computed;
  }

  nodes.forEach(node => compute(node));
  return results;
}

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
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>('manual');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [targetStrategy, setTargetStrategy] = useState<TargetStrategy>('roll_down');
  const [managerOwnQuantity, setManagerOwnQuantity] = useState<number>(0);
  const [managerOwnRevenue, setManagerOwnRevenue] = useState<number>(0);
  // Per-user strategy overrides (for sub-managers)
  const [perUserStrategies, setPerUserStrategies] = useState<Map<string, TargetStrategy>>(new Map());

  // Fetch parent user's business plan
  const { data: parentPlan } = useQuery({
    queryKey: ['parent-business-plan', parentUserId, fyYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_business_plans')
        .select('*')
        .eq('user_id', parentUserId)
        .eq('year', fyYear)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!parentUserId,
  });

  useEffect(() => {
    if (parentPlan) {
      setTargetStrategy((parentPlan.target_strategy as TargetStrategy) || 'roll_down');
      setManagerOwnQuantity(parentPlan.manager_own_quantity_target || 0);
      setManagerOwnRevenue(parentPlan.manager_own_revenue_target || 0);
    }
  }, [parentPlan]);

  useEffect(() => {
    if (targetStrategy === 'roll_up') {
      setAllocationMethod('manual');
    }
  }, [targetStrategy]);

  // Fetch hierarchy recursively
  const { data: hierarchyData, isLoading } = useQuery({
    queryKey: ['hierarchy-allocations', parentUserId, fyYear],
    queryFn: async () => {
      const { data: subordinatesData, error: subError } = await supabase.rpc('get_all_subordinates', {
        manager_user_id: parentUserId,
      });

      if (subError) throw subError;

      const subordinatesOnly = (subordinatesData || []).filter(
        (s: { subordinate_user_id: string; level: number }) => s.level > 0
      );

      if (!subordinatesOnly.length) return { roots: [] as SubordinateAllocation[], initialStrategies: new Map<string, TargetStrategy>() };

      const userIds = subordinatesOnly.map((s: { subordinate_user_id: string }) => s.subordinate_user_id);

      const [profilesRes, plansRes, employeesRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, profile_picture_url').in('id', userIds),
        supabase.from('user_business_plans').select('*').in('user_id', userIds).eq('year', fyYear),
        supabase.from('employees').select('manager_id, user_id'),
      ]);

      const subordinateCounts = new Map<string, number>();
      employeesRes.data?.forEach(emp => {
        if (emp.manager_id) {
          subordinateCounts.set(emp.manager_id, (subordinateCounts.get(emp.manager_id) || 0) + 1);
        }
      });

      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const planMap = new Map(plansRes.data?.map(p => [p.user_id, p]) || []);
      const managerMap = new Map<string, string>();
      employeesRes.data?.forEach(emp => {
        if (emp.manager_id) {
          managerMap.set(emp.user_id, emp.manager_id);
        }
      });

      const nodeMap = new Map<string, SubordinateAllocation>();

      // Initialize per-user strategies from DB
      const initialStrategies = new Map<string, TargetStrategy>();

      subordinatesOnly.forEach((sub: { subordinate_user_id: string; level: number }) => {
        const profile = profileMap.get(sub.subordinate_user_id);
        const existingPlan = planMap.get(sub.subordinate_user_id);
        const savedStrategy = (existingPlan?.target_strategy as TargetStrategy) || 'roll_down';
        
        nodeMap.set(sub.subordinate_user_id, {
          userId: sub.subordinate_user_id,
          fullName: profile?.full_name || 'Unknown',
          profilePictureUrl: profile?.profile_picture_url || null,
          quantityTarget: existingPlan?.quantity_target || 0,
          revenueTarget: existingPlan?.revenue_target || 0,
          visitsTarget: 0,
          percentage: 0,
          existingPlanId: existingPlan?.id,
          level: sub.level,
          subordinateCount: subordinateCounts.get(sub.subordinate_user_id) || 0,
          children: [],
          targetStrategy: savedStrategy,
        });

        // Only set strategy for users who are managers (have subordinates)
        if ((subordinateCounts.get(sub.subordinate_user_id) || 0) > 0) {
          initialStrategies.set(sub.subordinate_user_id, savedStrategy);
        }
      });

      const roots: SubordinateAllocation[] = [];
      nodeMap.forEach((node, userId) => {
        const managerId = managerMap.get(userId);
        if (managerId && nodeMap.has(managerId)) {
          nodeMap.get(managerId)!.children.push(node);
        } else if (managerId === parentUserId || node.level === 1) {
          roots.push(node);
        }
      });

      return { roots, initialStrategies };
    },
    enabled: !!parentUserId,
  });

  // Flatten hierarchy for allocations map
  useEffect(() => {
    if (hierarchyData?.roots) {
      const newAllocations = new Map<string, SubordinateAllocation>();
      const flatten = (nodes: SubordinateAllocation[]) => {
        nodes.forEach(node => {
          newAllocations.set(node.userId, node);
          if (node.children.length > 0) {
            flatten(node.children);
          }
        });
      };
      flatten(hierarchyData.roots);
      setAllocations(newAllocations);
      setExpandedUsers(new Set(hierarchyData.roots.map(u => u.userId)));
      // Initialize per-user strategies from DB data
      setPerUserStrategies(hierarchyData.initialStrategies);
    }
  }, [hierarchyData]);

  const directReports = useMemo(() => hierarchyData?.roots || [], [hierarchyData]);

  // Compute effective targets with cascading roll-up
  const effectiveTargets = useMemo(() => {
    if (!directReports.length) return new Map<string, { quantity: number; revenue: number; visits: number }>();
    return computeEffectiveTargets(directReports, allocations, perUserStrategies);
  }, [directReports, allocations, perUserStrategies]);

  // Roll-up totals from direct reports (using effective targets)
  const rollUpTotals = useMemo(() => {
    let qty = 0, rev = 0, vis = 0;
    directReports.forEach(u => {
      const effective = effectiveTargets.get(u.userId);
      if (effective) {
        qty += effective.quantity;
        rev += effective.revenue;
        vis += effective.visits;
      }
    });
    return { quantity: qty, revenue: rev, visits: vis };
  }, [directReports, effectiveTargets]);

  const effectiveManagerTarget = useMemo(() => {
    switch (targetStrategy) {
      case 'roll_up':
        return { quantity: rollUpTotals.quantity, revenue: rollUpTotals.revenue, visits: rollUpTotals.visits };
      case 'independent':
        return { quantity: managerOwnQuantity, revenue: managerOwnRevenue, visits: 0 };
      case 'roll_down':
      default:
        return { quantity: totalQuantity, revenue: totalRevenue, visits: totalVisits };
    }
  }, [targetStrategy, rollUpTotals, managerOwnQuantity, managerOwnRevenue, totalQuantity, totalRevenue, totalVisits]);

  // Distribution methods
  const applyEqualDistribution = () => {
    if (directReports.length === 0) return;
    const equalQty = Math.floor(totalQuantity / directReports.length);
    const equalRev = Math.floor(totalRevenue / directReports.length);
    const equalVisits = Math.floor(totalVisits / directReports.length);
    const equalPercent = Math.round((100 / directReports.length) * 100) / 100;

    setAllocations(prev => {
      const next = new Map(prev);
      directReports.forEach(user => {
        const current = next.get(user.userId);
        if (current) {
          next.set(user.userId, {
            ...current,
            quantityTarget: enabledMetrics.quantity ? equalQty : 0,
            revenueTarget: enabledMetrics.revenue ? equalRev : 0,
            visitsTarget: enabledMetrics.visits ? equalVisits : 0,
            percentage: equalPercent,
          });
        }
      });
      return next;
    });
    toast.success(`Targets distributed equally among ${directReports.length} members`);
  };

  const applyPercentageDistribution = () => {
    setAllocations(prev => {
      const next = new Map(prev);
      directReports.forEach(user => {
        const current = next.get(user.userId);
        if (current && current.percentage > 0) {
          const pct = current.percentage / 100;
          next.set(user.userId, {
            ...current,
            quantityTarget: enabledMetrics.quantity ? Math.round(totalQuantity * pct) : 0,
            revenueTarget: enabledMetrics.revenue ? Math.round(totalRevenue * pct) : 0,
            visitsTarget: enabledMetrics.visits ? Math.round(totalVisits * pct) : 0,
          });
        }
      });
      return next;
    });
  };

  const handleMethodChange = (method: AllocationMethod) => {
    setAllocationMethod(method);
    if (method === 'equal') applyEqualDistribution();
  };

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

  const handlePercentageChange = (userId: string, percentage: number) => {
    setAllocations(prev => {
      const next = new Map(prev);
      const current = next.get(userId);
      if (current) {
        const pct = percentage / 100;
        next.set(userId, {
          ...current,
          percentage,
          quantityTarget: enabledMetrics.quantity ? Math.round(totalQuantity * pct) : 0,
          revenueTarget: enabledMetrics.revenue ? Math.round(totalRevenue * pct) : 0,
          visitsTarget: enabledMetrics.visits ? Math.round(totalVisits * pct) : 0,
        });
      }
      return next;
    });
  };

  const handlePerUserStrategyChange = useCallback((userId: string, strategy: TargetStrategy) => {
    setPerUserStrategies(prev => {
      const next = new Map(prev);
      next.set(userId, strategy);
      return next;
    });
  }, []);

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Save mutation - saves each user's strategy + computed targets
  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = Array.from(allocations.values()).map(alloc => {
        const userStrategy = perUserStrategies.get(alloc.userId) || alloc.targetStrategy || 'roll_down';
        const isRollUpManager = userStrategy === 'roll_up' && alloc.subordinateCount > 0;
        const effective = effectiveTargets.get(alloc.userId);

        return {
          id: alloc.existingPlanId || undefined,
          user_id: alloc.userId,
          year: fyYear,
          quantity_target: isRollUpManager ? (effective?.quantity || 0) : alloc.quantityTarget,
          revenue_target: isRollUpManager ? (effective?.revenue || 0) : alloc.revenueTarget,
          quantity_unit: quantityUnit,
          target_strategy: alloc.subordinateCount > 0 ? userStrategy : 'roll_down',
        };
      });

      const { error } = await supabase
        .from('user_business_plans')
        .upsert(upserts, { onConflict: 'user_id,year' });
      if (error) throw error;

      // Save parent manager's plan
      const managerPlanData: Record<string, unknown> = {
        user_id: parentUserId,
        year: fyYear,
        target_strategy: targetStrategy,
        quantity_unit: quantityUnit,
      };

      if (targetStrategy === 'roll_up') {
        managerPlanData.quantity_target = rollUpTotals.quantity;
        managerPlanData.revenue_target = rollUpTotals.revenue;
      } else if (targetStrategy === 'independent') {
        managerPlanData.quantity_target = managerOwnQuantity;
        managerPlanData.revenue_target = managerOwnRevenue;
        managerPlanData.manager_own_quantity_target = managerOwnQuantity;
        managerPlanData.manager_own_revenue_target = managerOwnRevenue;
      } else {
        managerPlanData.quantity_target = totalQuantity;
        managerPlanData.revenue_target = totalRevenue;
      }

      const { error: managerError } = await supabase
        .from('user_business_plans')
        .upsert(managerPlanData as any, { onConflict: 'user_id,year' });
      if (managerError) throw managerError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy-allocations', parentUserId] });
      queryClient.invalidateQueries({ queryKey: ['parent-business-plan', parentUserId, fyYear] });
      toast.success('Allocations saved successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  // Check if a user is a roll_up manager
  const isRollUpUser = useCallback((userId: string, subordinateCount: number) => {
    if (subordinateCount === 0) return false;
    return (perUserStrategies.get(userId) || 'roll_down') === 'roll_up';
  }, [perUserStrategies]);

  // Render a single user card (Tree View)
  const renderUserCard = (user: SubordinateAllocation, depth: number = 0) => {
    const isExpanded = expandedUsers.has(user.userId);
    const hasChildren = user.children.length > 0;
    const levelBg = getLevelBackground(user.level);
    const isDirectReport = user.level === 1;
    const isManager = user.subordinateCount > 0;
    const userIsRollUp = isRollUpUser(user.userId, user.subordinateCount);
    const effective = effectiveTargets.get(user.userId);

    return (
      <div key={user.userId} style={{ marginLeft: `${depth * 24}px` }}>
        <div
          className={cn(
            'flex flex-col gap-1 p-3 rounded-lg border transition-all mb-2',
            levelBg
          )}
        >
          <div className="flex items-center gap-3">
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
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={user.profilePictureUrl || undefined} alt={user.fullName} />
              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>

            {/* Name and badges */}
            <div className="flex items-center gap-2 min-w-[120px]">
              <span className="font-medium text-sm truncate">{user.fullName}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                L{user.level}
              </Badge>
              {isManager && (
                <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0 h-5 shrink-0">
                  <Users className="h-3 w-3" />
                  {user.subordinateCount}
                </Badge>
              )}
            </div>

            {/* Per-user strategy selector (only for sub-managers) */}
            {isManager && (
              <InlineStrategySelector
                value={perUserStrategies.get(user.userId) || user.targetStrategy || 'roll_down'}
                onChange={(s) => handlePerUserStrategyChange(user.userId, s)}
              />
            )}

            <div className="flex-1" />

            {/* Input fields */}
            {(isDirectReport || allocationMethod === 'manual') && (
              <div className="flex items-center gap-3">
                {allocationMethod === 'percentage' && isDirectReport && !userIsRollUp && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={user.percentage || ''}
                      onChange={(e) => handlePercentageChange(user.userId, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 w-16 text-right text-sm"
                      min={0}
                      max={100}
                      step={0.5}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                )}

                {enabledMetrics.quantity && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Qty</span>
                    {userIsRollUp ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 h-8 px-2 bg-primary/10 border border-primary/20 rounded-md text-sm font-mono text-primary">
                              <ArrowUpCircle className="h-3 w-3" />
                              {formatNumber(effective?.quantity || 0)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Auto-calculated: Sum of {user.subordinateCount} subordinates</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Input
                        type="text"
                        value={(allocations.get(user.userId)?.quantityTarget || 0) > 0 ? formatNumber(allocations.get(user.userId)!.quantityTarget) : ''}
                        onChange={(e) => handleAllocationChange(user.userId, 'quantityTarget', parseNumber(e.target.value))}
                        placeholder="0"
                        className="h-8 w-20 text-right text-sm"
                        disabled={allocationMethod === 'equal'}
                      />
                    )}
                    <span className="text-xs text-muted-foreground">{quantityUnit}</span>
                  </div>
                )}
                {enabledMetrics.revenue && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    {userIsRollUp ? (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 h-8 px-2 bg-primary/10 border border-primary/20 rounded-md text-sm font-mono text-primary">
                              <ArrowUpCircle className="h-3 w-3" />
                              {formatNumber(effective?.revenue || 0)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Auto-calculated: Sum of {user.subordinateCount} subordinates</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Input
                        type="text"
                        value={(allocations.get(user.userId)?.revenueTarget || 0) > 0 ? formatNumber(allocations.get(user.userId)!.revenueTarget) : ''}
                        onChange={(e) => handleAllocationChange(user.userId, 'revenueTarget', parseNumber(e.target.value))}
                        placeholder="0"
                        className="h-8 w-24 text-right text-sm"
                        disabled={allocationMethod === 'equal'}
                      />
                    )}
                  </div>
                )}
                {enabledMetrics.visits && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Visits</span>
                    {userIsRollUp ? (
                      <span className="inline-flex items-center gap-1 h-8 px-2 bg-primary/10 border border-primary/20 rounded-md text-sm font-mono text-primary">
                        <ArrowUpCircle className="h-3 w-3" />
                        {formatNumber(effective?.visits || 0)}
                      </span>
                    ) : (
                      <Input
                        type="text"
                        value={(allocations.get(user.userId)?.visitsTarget || 0) > 0 ? formatNumber(allocations.get(user.userId)!.visitsTarget) : ''}
                        onChange={(e) => handleAllocationChange(user.userId, 'visitsTarget', Math.round(parseNumber(e.target.value)))}
                        placeholder="0"
                        className="h-8 w-16 text-right text-sm"
                        disabled={allocationMethod === 'equal'}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Auto-calculated label for roll-up managers */}
          {userIsRollUp && (
            <p className="text-[11px] text-primary/70 ml-10 flex items-center gap-1">
              <ArrowUpCircle className="h-3 w-3" />
              Auto-calculated from {user.subordinateCount} subordinates
            </p>
          )}
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

  // Render Table View
  const renderTableView = () => {
    const allUsers = Array.from(allocations.values()).sort((a, b) => a.level - b.level || a.fullName.localeCompare(b.fullName));

    return (
      <div className="overflow-x-auto scrollbar-always-visible">
        <table className="w-full">
          <thead className="sticky top-0 bg-muted z-10">
            <tr className="border-b">
              <th className="text-left p-3 text-sm font-medium">Team Member</th>
              <th className="text-center p-3 text-sm font-medium w-16">Level</th>
              <th className="text-center p-3 text-sm font-medium w-28">Strategy</th>
              {allocationMethod === 'percentage' && (
                <th className="text-right p-3 text-sm font-medium w-20">%</th>
              )}
              {enabledMetrics.quantity && (
                <th className="text-right p-3 text-sm font-medium">Qty ({quantityUnit})</th>
              )}
              {enabledMetrics.revenue && (
                <th className="text-right p-3 text-sm font-medium">Revenue</th>
              )}
              {enabledMetrics.visits && (
                <th className="text-right p-3 text-sm font-medium">Visits</th>
              )}
            </tr>
          </thead>
          <tbody>
            {allUsers.map(user => {
              const isManager = user.subordinateCount > 0;
              const userIsRollUp = isRollUpUser(user.userId, user.subordinateCount);
              const effective = effectiveTargets.get(user.userId);

              return (
                <tr key={user.userId} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user.profilePictureUrl || undefined} alt={user.fullName} />
                        <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                          {getInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{user.fullName}</span>
                      {isManager && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5 px-1 py-0 h-4">
                          <Users className="h-2.5 w-2.5" />
                          {user.subordinateCount}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className="text-[10px]">L{user.level}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    {isManager ? (
                      <InlineStrategySelector
                        value={perUserStrategies.get(user.userId) || user.targetStrategy || 'roll_down'}
                        onChange={(s) => handlePerUserStrategyChange(user.userId, s)}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  {allocationMethod === 'percentage' && (
                    <td className="p-3">
                      <Input
                        type="number"
                        value={user.percentage || ''}
                        onChange={(e) => handlePercentageChange(user.userId, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-7 w-16 text-right text-sm ml-auto"
                        min={0}
                        max={100}
                        step={0.5}
                        disabled={user.level !== 1 || userIsRollUp}
                      />
                    </td>
                  )}
                  {enabledMetrics.quantity && (
                    <td className="p-3">
                      {userIsRollUp ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 h-7 px-2 bg-primary/10 border border-primary/20 rounded-md text-sm font-mono text-primary ml-auto">
                                <ArrowUpCircle className="h-3 w-3" />
                                {formatNumber(effective?.quantity || 0)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Sum of {user.subordinateCount} subordinates</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Input
                          type="text"
                          value={user.quantityTarget > 0 ? formatNumber(user.quantityTarget) : ''}
                          onChange={(e) => handleAllocationChange(user.userId, 'quantityTarget', parseNumber(e.target.value))}
                          placeholder="0"
                          className="h-7 w-24 text-right text-sm ml-auto"
                          disabled={allocationMethod === 'equal' || (allocationMethod === 'percentage' && user.level === 1)}
                        />
                      )}
                    </td>
                  )}
                  {enabledMetrics.revenue && (
                    <td className="p-3">
                      {userIsRollUp ? (
                        <span className="inline-flex items-center gap-1 h-7 px-2 bg-primary/10 border border-primary/20 rounded-md text-sm font-mono text-primary ml-auto">
                          <ArrowUpCircle className="h-3 w-3" />
                          {formatCurrency(effective?.revenue || 0)}
                        </span>
                      ) : (
                        <Input
                          type="text"
                          value={user.revenueTarget > 0 ? formatNumber(user.revenueTarget) : ''}
                          onChange={(e) => handleAllocationChange(user.userId, 'revenueTarget', parseNumber(e.target.value))}
                          placeholder="0"
                          className="h-7 w-28 text-right text-sm ml-auto"
                          disabled={allocationMethod === 'equal' || (allocationMethod === 'percentage' && user.level === 1)}
                        />
                      )}
                    </td>
                  )}
                  {enabledMetrics.visits && (
                    <td className="p-3">
                      {userIsRollUp ? (
                        <span className="inline-flex items-center gap-1 h-7 px-2 bg-primary/10 border border-primary/20 rounded-md text-sm font-mono text-primary ml-auto">
                          <ArrowUpCircle className="h-3 w-3" />
                          {formatNumber(effective?.visits || 0)}
                        </span>
                      ) : (
                        <Input
                          type="text"
                          value={user.visitsTarget > 0 ? formatNumber(user.visitsTarget) : ''}
                          onChange={(e) => handleAllocationChange(user.userId, 'visitsTarget', Math.round(parseNumber(e.target.value)))}
                          placeholder="0"
                          className="h-7 w-20 text-right text-sm ml-auto"
                          disabled={allocationMethod === 'equal' || (allocationMethod === 'percentage' && user.level === 1)}
                        />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Calculate totals using effective targets for direct reports
  const allocatedQuantity = directReports.reduce((sum, u) => sum + (effectiveTargets.get(u.userId)?.quantity || 0), 0);
  const allocatedRevenue = directReports.reduce((sum, u) => sum + (effectiveTargets.get(u.userId)?.revenue || 0), 0);
  const allocatedVisits = directReports.reduce((sum, u) => sum + (effectiveTargets.get(u.userId)?.visits || 0), 0);
  const totalPercentage = directReports.reduce((sum, u) => sum + (allocations.get(u.userId)?.percentage || 0), 0);

  const showRemaining = targetStrategy === 'roll_down';
  const remainingQuantity = totalQuantity - allocatedQuantity;
  const remainingRevenue = totalRevenue - allocatedRevenue;
  const remainingVisits = totalVisits - allocatedVisits;
  const hasOverAllocation = showRemaining && (
    (enabledMetrics.quantity && remainingQuantity < 0) || 
    (enabledMetrics.revenue && remainingRevenue < 0) || 
    (enabledMetrics.visits && remainingVisits < 0) ||
    (allocationMethod === 'percentage' && totalPercentage > 100)
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!directReports.length) {
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="border-b-2 border-primary/30 pb-0.5">Allocation</span>
            <Badge variant="secondary">
              {allocations.size} members
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2 sm:ml-auto">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} size="sm">
              <ToggleGroupItem value="tree" aria-label="Tree View" className="gap-1.5 px-2.5">
                <GitBranch className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Tree</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table View" className="gap-1.5 px-2.5">
                <Table2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Table</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Target Strategy Selector (for the parent/selected node) */}
        <div className="mt-3 pt-3 border-t">
          <TargetStrategySelector value={targetStrategy} onChange={setTargetStrategy} />
        </div>

        {/* Manager's Own Target (Independent mode) */}
        {targetStrategy === 'independent' && (
          <div className="mt-3 p-3 bg-muted/30 rounded-lg border space-y-2">
            <span className="text-sm font-medium">Manager's Own Target</span>
            <div className="flex flex-wrap items-center gap-3">
              {enabledMetrics.quantity && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Qty</span>
                  <Input
                    type="text"
                    value={managerOwnQuantity > 0 ? formatNumber(managerOwnQuantity) : ''}
                    onChange={(e) => setManagerOwnQuantity(parseNumber(e.target.value))}
                    placeholder="0"
                    className="h-8 w-24 text-right text-sm"
                  />
                  <span className="text-xs text-muted-foreground">{quantityUnit}</span>
                </div>
              )}
              {enabledMetrics.revenue && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">₹</span>
                  <Input
                    type="text"
                    value={managerOwnRevenue > 0 ? formatNumber(managerOwnRevenue) : ''}
                    onChange={(e) => setManagerOwnRevenue(parseNumber(e.target.value))}
                    placeholder="0"
                    className="h-8 w-28 text-right text-sm"
                  />
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              This is the manager's personal target. Subordinate targets below are set independently.
            </p>
          </div>
        )}

        {/* Roll Up Summary */}
        {targetStrategy === 'roll_up' && (
          <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-1">
            <span className="text-sm font-medium text-primary">Manager's Target (Auto-calculated from subordinates)</span>
            <div className="flex flex-wrap items-center gap-3">
              {enabledMetrics.quantity && (
                <Badge variant="outline" className="font-mono text-sm border-primary/30">
                  {formatNumber(rollUpTotals.quantity)} {quantityUnit}
                </Badge>
              )}
              {enabledMetrics.revenue && (
                <Badge variant="outline" className="font-mono text-sm border-primary/30">
                  {formatCurrency(rollUpTotals.revenue)}
                </Badge>
              )}
              {enabledMetrics.visits && (
                <Badge variant="outline" className="font-mono text-sm border-primary/30">
                  {formatNumber(rollUpTotals.visits)} visits
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Allocation Method Toggle */}
        {targetStrategy !== 'roll_up' && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground">Method:</span>
            <ToggleGroup 
              type="single" 
              value={allocationMethod} 
              onValueChange={(v) => v && handleMethodChange(v as AllocationMethod)} 
              size="sm"
              className="bg-muted/50 p-0.5 rounded-lg"
            >
              <ToggleGroupItem 
                value="equal" 
                aria-label="Equal Distribution" 
                className="gap-1.5 px-3 py-1.5 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <Equal className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Equal</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="percentage" 
                aria-label="Percentage Based"
                className="gap-1.5 px-3 py-1.5 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <Percent className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Percentage</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="manual" 
                aria-label="Manual Entry"
                className="gap-1.5 px-3 py-1.5 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Manual</span>
              </ToggleGroupItem>
            </ToggleGroup>
            
            {allocationMethod === 'equal' && (
              <Button variant="outline" size="sm" onClick={applyEqualDistribution} className="ml-2 h-7 text-xs">
                Re-distribute
              </Button>
            )}
            {allocationMethod === 'percentage' && (
              <Button variant="outline" size="sm" onClick={applyPercentageDistribution} className="ml-2 h-7 text-xs">
                Apply %
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {viewMode === 'tree' ? (
          <div className="space-y-0">
            {directReports.map(user => renderUserCard(user))}
          </div>
        ) : (
          renderTableView()
        )}

        {/* Summary Section */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg border">
          <span className="font-medium text-sm">
            {targetStrategy === 'roll_up' ? 'Total from subordinates:' 
              : targetStrategy === 'independent' ? 'Subordinate totals:'
              : 'Remaining to allocate:'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {showRemaining && allocationMethod === 'percentage' && (
              <Badge 
                variant={totalPercentage > 100 ? 'destructive' : totalPercentage === 100 ? 'default' : 'secondary'}
                className="font-mono"
              >
                {(100 - totalPercentage).toFixed(1)}%
              </Badge>
            )}
            {enabledMetrics.quantity && (
              <Badge 
                variant={showRemaining 
                  ? (remainingQuantity < 0 ? 'destructive' : remainingQuantity === 0 ? 'default' : 'secondary')
                  : 'outline'}
                className="font-mono"
              >
                {showRemaining ? formatNumber(remainingQuantity) : formatNumber(allocatedQuantity)} {quantityUnit}
              </Badge>
            )}
            {enabledMetrics.revenue && (
              <Badge 
                variant={showRemaining 
                  ? (remainingRevenue < 0 ? 'destructive' : remainingRevenue === 0 ? 'default' : 'secondary')
                  : 'outline'}
                className="font-mono"
              >
                {showRemaining ? formatCurrency(remainingRevenue) : formatCurrency(allocatedRevenue)}
              </Badge>
            )}
            {enabledMetrics.visits && (
              <Badge 
                variant={showRemaining 
                  ? (remainingVisits < 0 ? 'destructive' : remainingVisits === 0 ? 'default' : 'secondary')
                  : 'outline'}
                className="font-mono"
              >
                {showRemaining ? formatNumber(remainingVisits) : formatNumber(allocatedVisits)} visits
              </Badge>
            )}
          </div>
        </div>

        {hasOverAllocation && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm">
              {allocationMethod === 'percentage' && totalPercentage > 100 
                ? `Total percentage (${totalPercentage.toFixed(1)}%) exceeds 100%. Please adjust.`
                : 'Total allocations exceed the target. Please adjust.'
              }
            </span>
          </div>
        )}

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
