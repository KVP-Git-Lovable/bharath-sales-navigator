import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Trophy, TrendingUp, TrendingDown, Filter, Globe, ChevronDown, ChevronRight, Package, Network } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSubordinates } from '@/hooks/useSubordinates';
import { useTeamTargetProgress, PeriodType, TargetBasis, TeamMemberProgress } from '@/hooks/useTeamTargetProgress';
import { useFYTargetConfig } from '@/hooks/useFYTargetConfig';
import { ProductMonthBreakdownTable } from './ProductMonthBreakdownTable';
import { UserScope } from '@/pages/admin/TargetVsActual';
import { useHierarchyTeamStructure, HierarchyGroup } from '@/hooks/useHierarchyTeamProgress';

interface TeamTargetDashboardProps {
  userScope?: UserScope;
  onUserScopeChange?: (scope: UserScope) => void;
  effectiveUserIds?: string[];
  fyYear?: number;
  hasAdminAccess?: boolean;
}

// Analytics-style period options
type DashboardPeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_quarter' | 'this_fy' | 'last_week' | 'last_month' | 'last_quarter' | 'last_fy' | 'last_60_days';

const getWeekStart = (d: Date) => {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getFYStart = (d: Date) => {
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(year, 3, 1);
};

const getFYEnd = (d: Date) => {
  const year = d.getMonth() >= 3 ? d.getFullYear() + 1 : d.getFullYear();
  const end = new Date(year, 2, 31);
  end.setHours(23, 59, 59, 999);
  return end;
};

const getQuarterStart = (d: Date) => {
  const month = d.getMonth();
  if (month >= 3 && month <= 5) return new Date(d.getFullYear(), 3, 1);
  if (month >= 6 && month <= 8) return new Date(d.getFullYear(), 6, 1);
  if (month >= 9 && month <= 11) return new Date(d.getFullYear(), 9, 1);
  return new Date(d.getFullYear(), 0, 1);
};

const getQuarterEnd = (d: Date) => {
  const month = d.getMonth();
  if (month >= 3 && month <= 5) return new Date(d.getFullYear(), 5, 30, 23, 59, 59, 999);
  if (month >= 6 && month <= 8) return new Date(d.getFullYear(), 8, 30, 23, 59, 59, 999);
  if (month >= 9 && month <= 11) return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
  return new Date(d.getFullYear(), 2, 31, 23, 59, 59, 999);
};

const computeDateRange = (period: DashboardPeriod): { from: Date; to: Date } => {
  const today = new Date();
  switch (period) {
    case 'today': {
      const from = new Date(today);
      from.setHours(0, 0, 0, 0);
      const to = new Date(today);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    case 'yesterday': {
      const from = new Date(today);
      from.setDate(today.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    case 'this_week':
      return { from: getWeekStart(today), to: today };
    case 'this_month':
      return { from: startOfMonth(today), to: today };
    case 'this_quarter':
      return { from: getQuarterStart(today), to: today };
    case 'this_fy':
      return { from: getFYStart(today), to: today };
    case 'last_week': {
      const lastWeekDate = new Date(today);
      lastWeekDate.setDate(today.getDate() - 7);
      const from = getWeekStart(lastWeekDate);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    case 'last_month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    case 'last_quarter': {
      const currentQStart = getQuarterStart(today);
      const lastQEnd = new Date(currentQStart);
      lastQEnd.setDate(lastQEnd.getDate() - 1);
      lastQEnd.setHours(23, 59, 59, 999);
      const from = getQuarterStart(lastQEnd);
      return { from, to: lastQEnd };
    }
    case 'last_fy': {
      const currentFYStart = getFYStart(today);
      const lastFYEnd = new Date(currentFYStart);
      lastFYEnd.setDate(lastFYEnd.getDate() - 1);
      lastFYEnd.setHours(23, 59, 59, 999);
      const from = getFYStart(lastFYEnd);
      return { from, to: lastFYEnd };
    }
    case 'last_60_days': {
      const from = new Date(today);
      from.setDate(today.getDate() - 60);
      from.setHours(0, 0, 0, 0);
      return { from, to: today };
    }
    default:
      return { from: startOfMonth(today), to: today };
  }
};

const periodToPeriodType = (period: DashboardPeriod): PeriodType => {
  switch (period) {
    case 'today':
    case 'yesterday':
      return 'day';
    case 'this_week':
    case 'last_week':
      return 'week';
    case 'this_month':
    case 'last_month':
    case 'last_60_days':
      return 'month';
    case 'this_quarter':
    case 'last_quarter':
      return 'quarter';
    case 'this_fy':
    case 'last_fy':
      return 'year';
    default:
      return 'month';
  }
};

export function TeamTargetDashboard({
  userScope = 'team',
  onUserScopeChange,
  effectiveUserIds = [],
  fyYear,
  hasAdminAccess = false,
}: TeamTargetDashboardProps) {
  const { user } = useAuth();
  const { subordinateIds, isManager } = useSubordinates();
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>('this_month');
  const [basis, setBasis] = useState<TargetBasis>('quantity');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'almost_there' | 'good_to_go' | 'achieved'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Fetch FY config to get enabled parameters
  const { data: fyConfig } = useFYTargetConfig(fyYear || new Date().getFullYear());
  const enabledParameters = fyConfig?.enabled_parameters;
  const hasProductAndMonthly = enabledParameters?.product && enabledParameters?.monthly;

  // Get all team member IDs
  const teamUserIds = effectiveUserIds.length > 0 ? effectiveUserIds : subordinateIds;

  // Compute period type and date from the dashboard period
  const periodType = useMemo(() => periodToPeriodType(dashboardPeriod), [dashboardPeriod]);
  const dateRange = useMemo(() => computeDateRange(dashboardPeriod), [dashboardPeriod]);

  const { data: teamProgress, isLoading } = useTeamTargetProgress({
    userIds: teamUserIds,
    periodType,
    date: dateRange.from,
    basis,
    enabledParameters,
  });

  // Fetch hierarchy structure for grouping
  const { data: hierarchyGroups } = useHierarchyTeamStructure(teamUserIds);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!teamProgress?.length) {
      return { total: 0, achieved: 0, goodToGo: 0, almostThere: 0, inProgress: 0, notStarted: 0 };
    }
    return {
      total: teamProgress.length,
      achieved: teamProgress.filter(m => m.status === 'achieved').length,
      goodToGo: teamProgress.filter(m => m.status === 'good_to_go').length,
      almostThere: teamProgress.filter(m => m.status === 'almost_there').length,
      inProgress: teamProgress.filter(m => m.status === 'in_progress').length,
      notStarted: teamProgress.filter(m => m.status === 'not_started').length,
    };
  }, [teamProgress]);

  // Filter team progress based on selected status
  const filteredTeamProgress = useMemo(() => {
    if (!teamProgress?.length || statusFilter === 'all') return teamProgress;
    return teamProgress.filter(m => m.status === statusFilter);
  }, [teamProgress, statusFilter]);

  // Build progress lookup map
  const progressMap = useMemo(() => {
    const map = new Map<string, TeamMemberProgress>();
    filteredTeamProgress?.forEach(m => map.set(m.userId, m));
    return map;
  }, [filteredTeamProgress]);

  // Recursively aggregate hierarchy group data
  const buildGroupedData = (group: HierarchyGroup): any => {
    // Get leaf members that exist in filteredTeamProgress
    const members = group.memberIds
      .map(id => progressMap.get(id))
      .filter(Boolean) as TeamMemberProgress[];

    // Recursively build children
    const children = (group.children || [])
      .map(child => buildGroupedData(child))
      .filter((c: any) => c.members.length > 0 || c.children.length > 0);

    // Aggregate totals: leaf members + all nested children
    let teamTarget = members.reduce((sum, m) => sum + m.target, 0);
    let teamActual = members.reduce((sum, m) => sum + m.actual, 0);
    
    children.forEach((child: any) => {
      teamTarget += child.teamTarget;
      teamActual += child.teamActual;
    });
    
    const teamAchievement = teamTarget > 0 ? (teamActual / teamTarget) * 100 : 0;

    return {
      ...group,
      members,
      children,
      teamTarget,
      teamActual,
      teamAchievement,
    };
  };

  // Build hierarchy groups with aggregated data
  const groupedData = useMemo(() => {
    if (!hierarchyGroups?.length || !filteredTeamProgress?.length) {
      return null;
    }

    return hierarchyGroups
      .map(group => buildGroupedData(group))
      .filter((g: any) => g.members.length > 0 || g.children.length > 0);
  }, [hierarchyGroups, filteredTeamProgress, progressMap]);

  const handleStatusFilterClick = (filter: 'all' | 'not_started' | 'in_progress' | 'almost_there' | 'good_to_go' | 'achieved') => {
    setStatusFilter(prev => prev === filter ? 'all' : filter);
  };

  const toggleRowExpanded = (userId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleGroupCollapsed = (managerId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(managerId)) next.delete(managerId);
      else next.add(managerId);
      return next;
    });
  };

  const formatValue = (value: number): string => {
    if (basis === 'revenue') {
      if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
      if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
      return `₹${value.toFixed(0)}`;
    } else {
      if (value >= 1000) return `${value.toFixed(0)} KG`;
      if (value >= 100) return `${value.toFixed(1)} KG`;
      if (value >= 1) return `${value.toFixed(2)} KG`;
      return `${value.toFixed(2)} KG`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'achieved':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Achieved</Badge>;
      case 'good_to_go':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Good to Go</Badge>;
      case 'almost_there':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Almost There</Badge>;
      case 'in_progress':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">In Progress</Badge>;
      case 'not_started':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Not Started</Badge>;
      default:
        return null;
    }
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderMemberRow = (member: TeamMemberProgress) => {
    const isExpanded = expandedRows.has(member.userId);
    const hasBreakdown = hasProductAndMonthly && member.productMonthBreakdown && member.productMonthBreakdown.length > 0;

    return (
      <React.Fragment key={member.userId}>
        <TableRow
          className={cn(
            hasBreakdown && "cursor-pointer hover:bg-muted/50",
            isExpanded && "bg-muted/30"
          )}
          onClick={() => hasBreakdown && toggleRowExpanded(member.userId)}
        >
          {hasProductAndMonthly && (
            <TableCell className="p-2 w-10">
              {hasBreakdown ? (
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : null}
            </TableCell>
          )}
          <TableCell>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">{getInitials(member.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{member.fullName}</span>
                {hasBreakdown && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {member.productMonthBreakdown!.length} product-month entries
                  </span>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="text-right font-medium">{formatValue(member.target)}</TableCell>
          <TableCell className="text-right font-medium">{formatValue(member.actual)}</TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Progress value={Math.min(member.achievementPercentage, 100)} className="h-2 w-20" />
              <span className="text-sm font-medium w-12 text-right">{member.achievementPercentage.toFixed(0)}%</span>
            </div>
          </TableCell>
          <TableCell className={cn("text-right font-medium", member.gap >= 0 ? "text-green-600" : "text-red-600")}>
            {member.gap >= 0 ? '+' : ''}{formatValue(member.gap)}
          </TableCell>
          <TableCell className="text-center">{getStatusBadge(member.status)}</TableCell>
        </TableRow>
        {hasBreakdown && isExpanded && (
          <TableRow>
            <TableCell colSpan={hasProductAndMonthly ? 7 : 6} className="p-0 bg-muted/20">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Product × Month Breakdown</span>
                </div>
                <ProductMonthBreakdownTable data={member.productMonthBreakdown!} basis={basis} />
              </div>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  // Count total members recursively in a group
  const countTotalMembers = (group: any): number => {
    return group.members.length + (group.children || []).reduce((sum: number, child: any) => sum + countTotalMembers(child), 0);
  };

  const renderHierarchyGroup = (group: any, idx: number, depth: number) => {
    const groupKey = group.managerId || `other-${idx}`;
    const isCollapsed = collapsedGroups.has(groupKey);
    const teamStatus = group.teamAchievement >= 100 ? 'achieved' : group.teamAchievement >= 90 ? 'good_to_go' : group.teamAchievement >= 50 ? 'almost_there' : group.teamAchievement >= 1 ? 'in_progress' : 'not_started';
    const totalMembers = countTotalMembers(group);

    return (
      <div key={groupKey} className={cn("border rounded-lg overflow-hidden", depth > 0 && "ml-4 mt-2")}>
        {/* Group Header */}
        <div
          className={cn(
            "flex items-center justify-between p-3 cursor-pointer transition-colors",
            depth === 0 ? "bg-muted/50 hover:bg-muted/70" : "bg-muted/30 hover:bg-muted/50"
          )}
          onClick={() => toggleGroupCollapsed(groupKey)}
        >
          <div className="flex items-center gap-3">
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {group.managerId && (
              <Avatar className="h-7 w-7">
                <AvatarImage src={group.managerAvatar || undefined} />
                <AvatarFallback className="text-[10px]">{getInitials(group.managerName)}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <span className="font-semibold text-sm">{group.managerName}</span>
              <span className="text-xs text-muted-foreground ml-2">({totalMembers} members)</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs hidden sm:block">
              <div className="text-muted-foreground">Team Target</div>
              <div className="font-semibold">{formatValue(group.teamTarget)}</div>
            </div>
            <div className="text-right text-xs hidden sm:block">
              <div className="text-muted-foreground">Team Actual</div>
              <div className="font-semibold">{formatValue(group.teamActual)}</div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={Math.min(group.teamAchievement, 100)} className="h-2 w-16" />
              <span className="text-xs font-bold w-10 text-right">{group.teamAchievement.toFixed(0)}%</span>
            </div>
            {getStatusBadge(teamStatus)}
          </div>
        </div>

        {/* Group Content */}
        {!isCollapsed && (
          <div>
            {/* Nested sub-manager groups */}
            {(group.children || []).length > 0 && (
              <div className="p-2 space-y-2">
                {group.children.map((child: any, childIdx: number) => renderHierarchyGroup(child, childIdx, depth + 1))}
              </div>
            )}

            {/* Leaf members table */}
            {group.members.length > 0 && (
              <div className={cn("overflow-x-auto", (group.children || []).length > 0 && "border-t")}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {hasProductAndMonthly && <TableHead className="w-10"></TableHead>}
                      <TableHead>Team Member</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-center">Progress</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.members.map((member: TeamMemberProgress) => renderMemberRow(member))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isManager && teamUserIds.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Team Members</p>
            <p className="text-sm mt-1">You don't have any team members assigned</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const colSpan = hasProductAndMonthly ? 7 : 6;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* User Scope - Only show for admins */}
            {hasAdminAccess && onUserScopeChange && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">User Scope</label>
                <Select value={userScope} onValueChange={(v) => onUserScopeChange(v as UserScope)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        My Team
                      </div>
                    </SelectItem>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        All Users
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Period - Analytics-style dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Period</label>
              <Select value={dashboardPeriod} onValueChange={(v) => setDashboardPeriod(v as DashboardPeriod)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="this_fy">This FY</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_quarter">Last Quarter</SelectItem>
                  <SelectItem value="last_fy">Last FY</SelectItem>
                  <SelectItem value="last_60_days">Last 60 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Display */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Date Range</label>
              <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/30 text-sm text-muted-foreground">
                {format(dateRange.from, "dd MMM yyyy")} – {format(dateRange.to, "dd MMM yyyy")}
              </div>
            </div>

            {/* Basis Toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Target Basis</label>
              <Select value={basis} onValueChange={(v) => setBasis(v as TargetBasis)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantity">Quantity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'all' && "ring-2 ring-blue-500 ring-offset-2")}
          onClick={() => handleStatusFilterClick('all')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg"><Users className="h-4 w-4 text-blue-600" /></div>
              <div>
                <p className="text-xl font-bold">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'achieved' && "ring-2 ring-green-500 ring-offset-2")}
          onClick={() => handleStatusFilterClick('achieved')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded-lg"><Trophy className="h-4 w-4 text-green-600" /></div>
              <div>
                <p className="text-xl font-bold text-green-600">{stats.achieved}</p>
                <p className="text-[10px] text-muted-foreground">Achieved ≥100%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'good_to_go' && "ring-2 ring-emerald-500 ring-offset-2")}
          onClick={() => handleStatusFilterClick('good_to_go')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
              <div>
                <p className="text-xl font-bold text-emerald-600">{stats.goodToGo}</p>
                <p className="text-[10px] text-muted-foreground">Good to Go 90-99%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'almost_there' && "ring-2 ring-yellow-500 ring-offset-2")}
          onClick={() => handleStatusFilterClick('almost_there')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-yellow-100 rounded-lg"><TrendingUp className="h-4 w-4 text-yellow-600" /></div>
              <div>
                <p className="text-xl font-bold text-yellow-600">{stats.almostThere}</p>
                <p className="text-[10px] text-muted-foreground">Almost There 50-89%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'in_progress' && "ring-2 ring-orange-500 ring-offset-2")}
          onClick={() => handleStatusFilterClick('in_progress')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-100 rounded-lg"><TrendingDown className="h-4 w-4 text-orange-600" /></div>
              <div>
                <p className="text-xl font-bold text-orange-600">{stats.inProgress}</p>
                <p className="text-[10px] text-muted-foreground">In Progress 1-49%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'not_started' && "ring-2 ring-red-500 ring-offset-2")}
          onClick={() => handleStatusFilterClick('not_started')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded-lg"><TrendingDown className="h-4 w-4 text-red-600" /></div>
              <div>
                <p className="text-xl font-bold text-red-600">{stats.notStarted}</p>
                <p className="text-[10px] text-muted-foreground">Not Started 0%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Table - Hierarchy Grouped */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="h-5 w-5" />
              Team Performance (Hierarchy View)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !filteredTeamProgress?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{statusFilter === 'all' ? 'No data available for the selected period' : `No ${statusFilter.replace('_', ' ')} members found`}</p>
              {statusFilter !== 'all' && (
                <Button variant="link" onClick={() => setStatusFilter('all')} className="mt-2">Clear filter</Button>
              )}
            </div>
          ) : groupedData && groupedData.length > 0 ? (
            <div className="space-y-4">
              {groupedData.map((group: any, idx: number) => renderHierarchyGroup(group, idx, 0))}
            </div>
          ) : (
            // Fallback flat table when no hierarchy data
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {hasProductAndMonthly && <TableHead className="w-10"></TableHead>}
                    <TableHead>Team Member</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeamProgress.map(member => renderMemberRow(member))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
