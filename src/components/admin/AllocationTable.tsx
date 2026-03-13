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
  GitBranch, Table2, ArrowUpCircle, Calendar, CalendarDays, TrendingUp,
  Split, Maximize2, Minimize2, AlertTriangle, Pencil, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TargetStrategy, SplitMethod, LevelStrategyConfig, LevelInfo, StrategyBadge } from './TargetStrategySelector';
import { TargetSplitDialog } from './TargetSplitDialog';
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
  designation?: string;
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
  targetStartMonth?: number;
  targetEndMonth?: number;
}

const FY_MONTHS_LIST = [
  'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar',
];

type ViewMode = 'tree' | 'table';
type DisplayDensity = 'compact' | 'expanded';

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

const getMonthRangeLabel = (startMonth: number, endMonth: number) => {
  if (startMonth === endMonth) return FY_MONTHS_LIST[startMonth - 1];
  return `${FY_MONTHS_LIST[startMonth - 1]} - ${FY_MONTHS_LIST[endMonth - 1]}`;
};

// Daily Average Panel for expanded user cards
function DailyAvgPanel({
  quantityTarget,
  revenueTarget,
  visitsTarget,
  quantityUnit,
  enabledMetrics,
  targetStartMonth,
  targetEndMonth,
}: {
  quantityTarget: number;
  revenueTarget: number;
  visitsTarget: number;
  quantityUnit: string;
  enabledMetrics: { quantity: boolean; revenue: boolean; visits: boolean };
  targetStartMonth: number;
  targetEndMonth: number;
}) {
  const [workingDays, setWorkingDays] = React.useState(25);
  const activeMonthCount = targetEndMonth - targetStartMonth + 1;
  const monthLabel = getMonthRangeLabel(targetStartMonth, targetEndMonth);

  const monthlyQty = activeMonthCount === 1 ? quantityTarget : quantityTarget / activeMonthCount;
  const monthlyRev = activeMonthCount === 1 ? revenueTarget : revenueTarget / activeMonthCount;
  const monthlyVisits = activeMonthCount === 1 ? visitsTarget : visitsTarget / activeMonthCount;

  const avgQtyPerDay = workingDays > 0 ? monthlyQty / workingDays : 0;
  const avgRevPerDay = workingDays > 0 ? monthlyRev / workingDays : 0;
  const avgVisitsPerDay = workingDays > 0 ? monthlyVisits / workingDays : 0;

  const fmt = (num: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(num);

  return (
    <div className="mt-2 ml-10 p-3 bg-muted/30 rounded-lg border space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily Avg</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
          <Calendar className="h-3 w-3" />
          {monthLabel}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Working days/month:</span>
        <Input
          type="number"
          min={1}
          max={31}
          value={workingDays}
          onChange={(e) => setWorkingDays(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-16 h-7 text-right text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {enabledMetrics.quantity && (
          <div className="flex-1 min-w-[120px] p-2 rounded-md bg-card border">
            <p className="text-[10px] text-muted-foreground uppercase">Qty / Day</p>
            <p className="text-sm font-bold">{fmt(avgQtyPerDay)} {quantityUnit}</p>
            <p className="text-[10px] text-muted-foreground">{fmt(monthlyQty)} ÷ {workingDays}d</p>
          </div>
        )}
        {enabledMetrics.revenue && (
          <div className="flex-1 min-w-[120px] p-2 rounded-md bg-card border">
            <p className="text-[10px] text-muted-foreground uppercase">Revenue / Day</p>
            <p className="text-sm font-bold">₹{fmt(avgRevPerDay)}</p>
            <p className="text-[10px] text-muted-foreground">₹{fmt(monthlyRev)} ÷ {workingDays}d</p>
          </div>
        )}
        {enabledMetrics.visits && (
          <div className="flex-1 min-w-[120px] p-2 rounded-md bg-card border">
            <p className="text-[10px] text-muted-foreground uppercase">Visits / Day</p>
            <p className="text-sm font-bold">{fmt(avgVisitsPerDay)}</p>
            <p className="text-[10px] text-muted-foreground">{fmt(monthlyVisits)} ÷ {workingDays}d</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Recursively auto-distribute targets based on level strategies and split method.
 * Modifies the allocations map in-place and returns it.
 */
function autoDistributeTargets(
  nodes: SubordinateAllocation[],
  parentTarget: { quantity: number; revenue: number; visits: number },
  levelStrategies: Map<number, TargetStrategy>,
  splitMethod: SplitMethod,
  allocations: Map<string, SubordinateAllocation>,
  enabledMetrics: { quantity: boolean; revenue: boolean; visits: boolean },
): Map<string, SubordinateAllocation> {

  function distribute(nodeList: SubordinateAllocation[], parentTgt: { quantity: number; revenue: number; visits: number }) {
    if (nodeList.length === 0) return;

    const firstLevel = nodeList[0].level;
    const strategy = levelStrategies.get(firstLevel) || 'roll_down';

    if (strategy === 'roll_down') {
      const count = nodeList.length;
      nodeList.forEach((node) => {
        const alloc = allocations.get(node.userId);
        if (!alloc) return;

        let qty = 0, rev = 0, vis = 0, pct = 0;
        if (splitMethod === 'equal') {
          qty = enabledMetrics.quantity ? Math.floor(parentTgt.quantity / count) : 0;
          rev = enabledMetrics.revenue ? Math.floor(parentTgt.revenue / count) : 0;
          vis = enabledMetrics.visits ? Math.floor(parentTgt.visits / count) : 0;
          pct = Math.round((100 / count) * 100) / 100;
        } else if (splitMethod === 'percentage') {
          const p = (alloc.percentage || 0) / 100;
          qty = enabledMetrics.quantity ? Math.round(parentTgt.quantity * p) : 0;
          rev = enabledMetrics.revenue ? Math.round(parentTgt.revenue * p) : 0;
          vis = enabledMetrics.visits ? Math.round(parentTgt.visits * p) : 0;
          pct = alloc.percentage || 0;
        } else {
          // manual — keep existing values
          qty = alloc.quantityTarget;
          rev = alloc.revenueTarget;
          vis = alloc.visitsTarget;
          pct = alloc.percentage;
        }

        allocations.set(node.userId, { ...alloc, quantityTarget: qty, revenueTarget: rev, visitsTarget: vis, percentage: pct });

        // Recurse into children with THIS node's target as parent
        if (node.children.length > 0) {
          distribute(node.children, { quantity: qty, revenue: rev, visits: vis });
        }
      });
    } else if (strategy === 'roll_up') {
      // First recurse into children (they keep their own values or get distributed further)
      nodeList.forEach((node) => {
        if (node.children.length > 0) {
          distribute(node.children, { quantity: 0, revenue: 0, visits: 0 }); // parent target not used for roll_up children
        }
      });
      // Then compute roll-up for each node
      nodeList.forEach((node) => {
        const alloc = allocations.get(node.userId);
        if (!alloc) return;
        if (node.children.length > 0) {
          let sumQ = 0, sumR = 0, sumV = 0;
          node.children.forEach(child => {
            const ca = allocations.get(child.userId);
            if (ca) { sumQ += ca.quantityTarget; sumR += ca.revenueTarget; sumV += ca.visitsTarget; }
          });
          allocations.set(node.userId, { ...alloc, quantityTarget: sumQ, revenueTarget: sumR, visitsTarget: sumV });
        }
      });
    } else {
      // independent — keep existing values, recurse children independently
      nodeList.forEach((node) => {
        if (node.children.length > 0) {
          distribute(node.children, { quantity: 0, revenue: 0, visits: 0 });
        }
      });
    }
  }

  distribute(nodes, parentTarget);
  return allocations;
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
  targetStartMonth = 1,
  targetEndMonth = 12,
}: AllocationTableProps) {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<Map<string, SubordinateAllocation>>(new Map());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [displayDensity, setDisplayDensity] = useState<DisplayDensity>('expanded');
  const [fineTuneMode, setFineTuneMode] = useState(false);
  const [hasAutoCalculated, setHasAutoCalculated] = useState(false);

  // Level-wise strategy config
  const [levelStrategies, setLevelStrategies] = useState<Map<number, TargetStrategy>>(new Map());
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');

  // Split dialog state
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitDialogManager, setSplitDialogManager] = useState<SubordinateAllocation | null>(null);

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

      if (!subordinatesOnly.length) return { roots: [] as SubordinateAllocation[] };

      const userIds = subordinatesOnly.map((s: { subordinate_user_id: string }) => s.subordinate_user_id);

      const [profilesRes, plansRes, employeesRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, profile_picture_url, designation').in('id', userIds),
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

      subordinatesOnly.forEach((sub: { subordinate_user_id: string; level: number }) => {
        const profile = profileMap.get(sub.subordinate_user_id);
        const existingPlan = planMap.get(sub.subordinate_user_id);
        const savedStrategy = (existingPlan?.target_strategy as TargetStrategy) || 'roll_down';
        
        nodeMap.set(sub.subordinate_user_id, {
          userId: sub.subordinate_user_id,
          fullName: profile?.full_name || 'Unknown',
          profilePictureUrl: profile?.profile_picture_url || null,
          designation: profile?.designation || undefined,
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

      return { roots };
    },
    enabled: !!parentUserId,
  });

  // Flatten hierarchy for allocations map
  useEffect(() => {
    if (hierarchyData?.roots) {
      const newAllocations = new Map<string, SubordinateAllocation>();
      const levelSet = new Set<number>();
      const flatten = (nodes: SubordinateAllocation[]) => {
        nodes.forEach(node => {
          newAllocations.set(node.userId, node);
          levelSet.add(node.level);
          if (node.children.length > 0) {
            flatten(node.children);
          }
        });
      };
      flatten(hierarchyData.roots);
      setAllocations(newAllocations);
      setExpandedUsers(new Set(hierarchyData.roots.map(u => u.userId)));

      // Initialize level strategies from first node at each level
      const initStrategies = new Map<number, TargetStrategy>();
      levelSet.forEach(level => {
        // Find first manager at this level to get their strategy
        for (const [, node] of newAllocations) {
          if (node.level === level && node.subordinateCount > 0) {
            initStrategies.set(level, node.targetStrategy || 'roll_down');
            break;
          }
        }
        if (!initStrategies.has(level)) {
          initStrategies.set(level, 'roll_down');
        }
      });
      setLevelStrategies(initStrategies);
    }
  }, [hierarchyData]);

  const directReports = useMemo(() => hierarchyData?.roots || [], [hierarchyData]);

  // Compute level info for the config panel
  const levelInfos = useMemo((): LevelInfo[] => {
    const levelMap = new Map<number, { users: number; managers: number; userDetails: Array<{ fullName: string; designation?: string }> }>();
    allocations.forEach(alloc => {
      const existing = levelMap.get(alloc.level) || { users: 0, managers: 0, userDetails: [] };
      existing.users++;
      if (alloc.subordinateCount > 0) existing.managers++;
      existing.userDetails.push({ fullName: alloc.fullName, designation: alloc.designation });
      levelMap.set(alloc.level, existing);
    });
    return Array.from(levelMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, info]) => ({ level, userCount: info.users, managerCount: info.managers, users: info.userDetails }));
  }, [allocations]);

  // Compute per-manager distribution status
  const managerDistribution = useMemo(() => {
    const result = new Map<string, { distributed: number; remaining: number; total: number }>();
    const computeForNode = (node: SubordinateAllocation) => {
      if (node.children.length > 0) {
        const childSum = node.children.reduce((s, c) => s + (allocations.get(c.userId)?.quantityTarget || 0), 0);
        const nodeTarget = allocations.get(node.userId)?.quantityTarget || 0;
        result.set(node.userId, { distributed: childSum, remaining: nodeTarget - childSum, total: nodeTarget });
        node.children.forEach(computeForNode);
      }
    };
    directReports.forEach(computeForNode);
    return result;
  }, [directReports, allocations]);

  // Status dot
  const getStatusDot = useCallback((user: SubordinateAllocation) => {
    const alloc = allocations.get(user.userId);
    const target = alloc?.quantityTarget || 0;
    const dist = managerDistribution.get(user.userId);

    if (dist && dist.remaining < 0) return { color: 'bg-destructive', label: 'Over-allocated' };
    if (dist && dist.remaining > 0 && dist.total > 0) return { color: 'bg-amber-500', label: 'Partially distributed' };
    if (target === 0) return { color: 'bg-muted-foreground/40', label: 'Not assigned' };
    return { color: 'bg-emerald-500', label: 'Assigned' };
  }, [allocations, managerDistribution]);

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
        // Find parent target for this user
        const parentTarget = { quantity: totalQuantity, revenue: totalRevenue, visits: totalVisits };
        const pct = percentage / 100;
        next.set(userId, {
          ...current,
          percentage,
          quantityTarget: enabledMetrics.quantity ? Math.round(parentTarget.quantity * pct) : 0,
          revenueTarget: enabledMetrics.revenue ? Math.round(parentTarget.revenue * pct) : 0,
          visitsTarget: enabledMetrics.visits ? Math.round(parentTarget.visits * pct) : 0,
        });
      }
      return next;
    });
  };

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Handle level strategy change
  const handleLevelStrategyChange = useCallback((level: number, strategy: TargetStrategy) => {
    setLevelStrategies(prev => {
      const next = new Map(prev);
      next.set(level, strategy);
      return next;
    });
  }, []);

  // Auto-calculate handler
  const handleAutoCalculate = useCallback(() => {
    if (!directReports.length) return;

    const newAllocations = new Map(allocations);
    autoDistributeTargets(
      directReports,
      { quantity: totalQuantity, revenue: totalRevenue, visits: totalVisits },
      levelStrategies,
      splitMethod,
      newAllocations,
      enabledMetrics,
    );
    setAllocations(newAllocations);
    setHasAutoCalculated(true);
    setFineTuneMode(false);
    // Expand all to show results
    const allIds = new Set<string>();
    const collectIds = (nodes: SubordinateAllocation[]) => {
      nodes.forEach(n => { allIds.add(n.userId); if (n.children.length) collectIds(n.children); });
    };
    collectIds(directReports);
    setExpandedUsers(allIds);
    toast.success('Targets auto-calculated! Review below and save.');
  }, [directReports, allocations, levelStrategies, splitMethod, totalQuantity, totalRevenue, totalVisits, enabledMetrics]);

  // Split dialog
  const openSplitDialog = useCallback((manager: SubordinateAllocation) => {
    setSplitDialogManager(manager);
    setSplitDialogOpen(true);
  }, []);

  const handleSplitApply = useCallback((updatedChildren: Array<{
    userId: string; quantityTarget: number; revenueTarget: number; visitsTarget: number; percentage: number;
  }>) => {
    setAllocations(prev => {
      const next = new Map(prev);
      updatedChildren.forEach(child => {
        const current = next.get(child.userId);
        if (current) {
          next.set(child.userId, {
            ...current,
            quantityTarget: child.quantityTarget,
            revenueTarget: child.revenueTarget,
            visitsTarget: child.visitsTarget,
            percentage: child.percentage,
          });
        }
      });
      return next;
    });
    toast.success('Split applied successfully');
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = Array.from(allocations.values()).map(alloc => {
        const levelStrategy = levelStrategies.get(alloc.level) || 'roll_down';
        const userStrategy = alloc.subordinateCount > 0 ? levelStrategy : 'roll_down';

        return {
          id: alloc.existingPlanId || undefined,
          user_id: alloc.userId,
          year: fyYear,
          fiscal_year: `${fyYear}-${fyYear + 1}`,
          year_start: fyYear,
          year_end: fyYear + 1,
          quantity_target: alloc.quantityTarget,
          revenue_target: alloc.revenueTarget,
          quantity_unit: quantityUnit,
          target_strategy: userStrategy,
        };
      });

      const { error } = await supabase
        .from('user_business_plans')
        .upsert(upserts as any, { onConflict: 'user_id,year' });
      if (error) throw error;

      // Save parent manager's plan
      const rootStrategy = levelStrategies.get(0) || 'roll_down';
      const managerPlanData: Record<string, unknown> = {
        user_id: parentUserId,
        year: fyYear,
        target_strategy: rootStrategy,
        quantity_unit: quantityUnit,
        quantity_target: 0,
        revenue_target: 0,
      };

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

  // Render a single user card (Tree View)
  const renderUserCard = (user: SubordinateAllocation, depth: number = 0) => {
    const isExpanded = expandedUsers.has(user.userId);
    const hasChildren = user.children.length > 0;
    const levelBg = getLevelBackground(user.level);
    const isManager = user.subordinateCount > 0;
    const statusDot = getStatusDot(user);
    const dist = managerDistribution.get(user.userId);
    const alloc = allocations.get(user.userId);
    const levelStrategy = levelStrategies.get(user.level) || 'roll_down';

    // Compact mode
    if (displayDensity === 'compact') {
      return (
        <div key={user.userId} style={{ marginLeft: `${depth * 24}px` }}>
          <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border mb-1', levelBg)}>
            {hasChildren && (
              <button onClick={() => toggleExpand(user.userId)} className="p-0.5 hover:bg-muted/50 rounded shrink-0">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            )}
            <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', statusDot.color)} title={statusDot.label} />
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={user.profilePictureUrl || undefined} alt={user.fullName} />
              <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">{getInitials(user.fullName)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">{user.fullName}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">L{user.level}</Badge>
            {isManager && (
              <Badge variant="secondary" className="text-[9px] gap-0.5 px-1 py-0 h-4 shrink-0">
                <Users className="h-2.5 w-2.5" />{user.subordinateCount}
              </Badge>
            )}
            {isManager && <StrategyBadge strategy={levelStrategy} />}
            <div className="flex-1" />
            {enabledMetrics.quantity && (
              <span className="text-sm font-mono font-medium">
                {formatNumber(alloc?.quantityTarget || 0)} <span className="text-xs text-muted-foreground">{quantityUnit}</span>
              </span>
            )}
            {enabledMetrics.revenue && (
              <span className="text-sm font-mono font-medium">{formatCurrency(alloc?.revenueTarget || 0)}</span>
            )}
            {fineTuneMode && isManager && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => openSplitDialog(user)}>
                <Split className="h-3 w-3" /> Split
              </Button>
            )}
          </div>
          {isExpanded && hasChildren && (
            <div>{user.children.map(child => renderUserCard(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    // Expanded mode
    return (
      <div key={user.userId} style={{ marginLeft: `${depth * 24}px` }}>
        <div className={cn('flex flex-col gap-1 p-3 rounded-lg border transition-all mb-2', levelBg)}>
          <div className="flex items-center gap-3">
            <button onClick={() => toggleExpand(user.userId)} className="p-1 hover:bg-muted/50 rounded shrink-0">
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
            <div className={cn('h-3 w-3 rounded-full shrink-0', statusDot.color)} title={statusDot.label} />
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={user.profilePictureUrl || undefined} alt={user.fullName} />
              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">{getInitials(user.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 min-w-[120px]">
              <span className="font-medium text-sm truncate">{user.fullName}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">L{user.level}</Badge>
              {isManager && (
                <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0 h-5 shrink-0">
                  <Users className="h-3 w-3" />{user.subordinateCount}
                </Badge>
              )}
              {isManager && <StrategyBadge strategy={levelStrategy} />}
            </div>

            <div className="flex-1" />

            {/* Fine-tune: split button */}
            {fineTuneMode && isManager && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openSplitDialog(user)}>
                <Split className="h-3 w-3" /> Split
              </Button>
            )}

            {/* Editable fields in fine-tune mode, read-only otherwise */}
            {fineTuneMode ? (
              <div className="flex items-center gap-3">
                {splitMethod === 'percentage' && (
                  <div className="flex items-center gap-1">
                    <Input type="number" value={alloc?.percentage || ''} onChange={(e) => handlePercentageChange(user.userId, parseFloat(e.target.value) || 0)} placeholder="0" className="h-8 w-16 text-right text-sm" min={0} max={100} step={0.5} />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                )}
                {enabledMetrics.quantity && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Qty</span>
                    <Input type="text" value={(alloc?.quantityTarget || 0) > 0 ? formatNumber(alloc!.quantityTarget) : ''} onChange={(e) => handleAllocationChange(user.userId, 'quantityTarget', parseNumber(e.target.value))} placeholder="0" className="h-8 w-20 text-right text-sm" />
                    <span className="text-xs text-muted-foreground">{quantityUnit}</span>
                  </div>
                )}
                {enabledMetrics.revenue && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input type="text" value={(alloc?.revenueTarget || 0) > 0 ? formatNumber(alloc!.revenueTarget) : ''} onChange={(e) => handleAllocationChange(user.userId, 'revenueTarget', parseNumber(e.target.value))} placeholder="0" className="h-8 w-24 text-right text-sm" />
                  </div>
                )}
                {enabledMetrics.visits && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Visits</span>
                    <Input type="text" value={(alloc?.visitsTarget || 0) > 0 ? formatNumber(alloc!.visitsTarget) : ''} onChange={(e) => handleAllocationChange(user.userId, 'visitsTarget', Math.round(parseNumber(e.target.value)))} placeholder="0" className="h-8 w-16 text-right text-sm" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {enabledMetrics.quantity && (
                  <span className="text-sm font-mono font-medium">
                    {formatNumber(alloc?.quantityTarget || 0)} <span className="text-xs text-muted-foreground">{quantityUnit}</span>
                  </span>
                )}
                {enabledMetrics.revenue && (
                  <span className="text-sm font-mono font-medium">{formatCurrency(alloc?.revenueTarget || 0)}</span>
                )}
                {enabledMetrics.visits && (
                  <span className="text-sm font-mono font-medium">{formatNumber(alloc?.visitsTarget || 0)} <span className="text-xs text-muted-foreground">visits</span></span>
                )}
              </div>
            )}
          </div>

          {/* Distribution warning for managers */}
          {dist && dist.total > 0 && dist.remaining !== 0 && (
            <div className={cn(
              'ml-10 flex items-center gap-1.5 text-[11px] px-2 py-1 rounded',
              dist.remaining < 0 ? 'text-destructive bg-destructive/10' : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
            )}>
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {dist.remaining > 0
                ? `${formatNumber(dist.remaining)} ${quantityUnit} not yet distributed`
                : `Over-allocated by ${formatNumber(Math.abs(dist.remaining))} ${quantityUnit}`
              }
            </div>
          )}

          {/* Distribution progress bar for managers */}
          {dist && dist.total > 0 && (
            <div className="ml-10 mt-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      dist.remaining < 0 ? 'bg-destructive' : dist.remaining === 0 ? 'bg-emerald-500' : 'bg-amber-500'
                    )}
                    style={{ width: `${Math.min(100, dist.total > 0 ? (dist.distributed / dist.total) * 100 : 0)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {dist.total > 0 ? Math.round((dist.distributed / dist.total) * 100) : 0}%
                </span>
              </div>
            </div>
          )}

          {/* Daily Average Section */}
          {isExpanded && !hasChildren && (
            <DailyAvgPanel
              quantityTarget={alloc?.quantityTarget || 0}
              revenueTarget={alloc?.revenueTarget || 0}
              visitsTarget={alloc?.visitsTarget || 0}
              quantityUnit={quantityUnit}
              enabledMetrics={enabledMetrics}
              targetStartMonth={targetStartMonth}
              targetEndMonth={targetEndMonth}
            />
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>{user.children.map(child => renderUserCard(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  // Table View
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
              const levelStrategy = levelStrategies.get(user.level) || 'roll_down';
              const alloc = allocations.get(user.userId);

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
                      <StrategyBadge strategy={levelStrategy} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  {enabledMetrics.quantity && (
                    <td className="p-3 text-right">
                      {fineTuneMode ? (
                        <Input
                          type="text"
                          value={(alloc?.quantityTarget || 0) > 0 ? formatNumber(alloc!.quantityTarget) : ''}
                          onChange={(e) => handleAllocationChange(user.userId, 'quantityTarget', parseNumber(e.target.value))}
                          placeholder="0"
                          className="h-7 w-24 text-right text-sm ml-auto"
                        />
                      ) : (
                        <span className="text-sm font-mono">{formatNumber(alloc?.quantityTarget || 0)}</span>
                      )}
                    </td>
                  )}
                  {enabledMetrics.revenue && (
                    <td className="p-3 text-right">
                      {fineTuneMode ? (
                        <Input
                          type="text"
                          value={(alloc?.revenueTarget || 0) > 0 ? formatNumber(alloc!.revenueTarget) : ''}
                          onChange={(e) => handleAllocationChange(user.userId, 'revenueTarget', parseNumber(e.target.value))}
                          placeholder="0"
                          className="h-7 w-28 text-right text-sm ml-auto"
                        />
                      ) : (
                        <span className="text-sm font-mono">{formatCurrency(alloc?.revenueTarget || 0)}</span>
                      )}
                    </td>
                  )}
                  {enabledMetrics.visits && (
                    <td className="p-3 text-right">
                      {fineTuneMode ? (
                        <Input
                          type="text"
                          value={(alloc?.visitsTarget || 0) > 0 ? formatNumber(alloc!.visitsTarget) : ''}
                          onChange={(e) => handleAllocationChange(user.userId, 'visitsTarget', Math.round(parseNumber(e.target.value)))}
                          placeholder="0"
                          className="h-7 w-20 text-right text-sm ml-auto"
                        />
                      ) : (
                        <span className="text-sm font-mono">{formatNumber(alloc?.visitsTarget || 0)}</span>
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

  // Calculate totals
  const allocatedQuantity = directReports.reduce((sum, u) => sum + (allocations.get(u.userId)?.quantityTarget || 0), 0);
  const allocatedRevenue = directReports.reduce((sum, u) => sum + (allocations.get(u.userId)?.revenueTarget || 0), 0);
  const allocatedVisits = directReports.reduce((sum, u) => sum + (allocations.get(u.userId)?.visitsTarget || 0), 0);

  const remainingQuantity = totalQuantity - allocatedQuantity;
  const remainingRevenue = totalRevenue - allocatedRevenue;
  const remainingVisits = totalVisits - allocatedVisits;
  const hasOverAllocation =
    (enabledMetrics.quantity && remainingQuantity < 0) || 
    (enabledMetrics.revenue && remainingRevenue < 0) || 
    (enabledMetrics.visits && remainingVisits < 0);

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
            {/* Fine-tune toggle */}
            <Button
              variant={fineTuneMode ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setFineTuneMode(!fineTuneMode)}
            >
              {fineTuneMode ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {fineTuneMode ? 'Preview' : 'Fine-tune'}
            </Button>

            {/* Compact/Expanded toggle */}
            <ToggleGroup type="single" value={displayDensity} onValueChange={(v) => v && setDisplayDensity(v as DisplayDensity)} size="sm">
              <ToggleGroupItem value="compact" aria-label="Compact View" className="gap-1 px-2">
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Compact</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="expanded" aria-label="Expanded View" className="gap-1 px-2">
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Expanded</span>
              </ToggleGroupItem>
            </ToggleGroup>

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

        {/* Level-wise Strategy Configuration Panel */}
        <div className="mt-3 pt-3 border-t">
          <LevelStrategyConfig
            levels={levelInfos}
            levelStrategies={levelStrategies}
            onLevelStrategyChange={handleLevelStrategyChange}
            splitMethod={splitMethod}
            onSplitMethodChange={setSplitMethod}
            onAutoCalculate={handleAutoCalculate}
          />
        </div>
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
          <span className="font-medium text-sm">Remaining to allocate:</span>
          <div className="flex flex-wrap items-center gap-2">
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

        {hasOverAllocation && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm">Total allocations exceed the target. Please adjust.</span>
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

      {/* Split Dialog */}
      {splitDialogManager && (
        <TargetSplitDialog
          open={splitDialogOpen}
          onOpenChange={setSplitDialogOpen}
          managerName={splitDialogManager.fullName}
          managerQuantityTarget={allocations.get(splitDialogManager.userId)?.quantityTarget || 0}
          managerRevenueTarget={allocations.get(splitDialogManager.userId)?.revenueTarget || 0}
          managerVisitsTarget={allocations.get(splitDialogManager.userId)?.visitsTarget || 0}
          quantityUnit={quantityUnit}
          enabledMetrics={enabledMetrics}
          children={splitDialogManager.children.map(c => ({
            userId: c.userId,
            fullName: c.fullName,
            profilePictureUrl: c.profilePictureUrl,
            quantityTarget: allocations.get(c.userId)?.quantityTarget || 0,
            revenueTarget: allocations.get(c.userId)?.revenueTarget || 0,
            visitsTarget: allocations.get(c.userId)?.visitsTarget || 0,
            percentage: allocations.get(c.userId)?.percentage || 0,
          }))}
          onApply={handleSplitApply}
        />
      )}
    </Card>
  );
}
