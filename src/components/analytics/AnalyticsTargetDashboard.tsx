import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Trophy, TrendingUp, TrendingDown, ChevronDown, ChevronRight, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTeamTargetProgress, PeriodType, TargetBasis, TeamMemberProgress } from '@/hooks/useTeamTargetProgress';
import { useHierarchyTeamStructure, HierarchyGroup } from '@/hooks/useHierarchyTeamProgress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsTargetDashboardProps {
  selectedUserIds: string[];
  dateRange: { from: Date; to: Date };
  periodFilter?: string;
  isScopeReady?: boolean;
}

interface FlatEntry {
  type: 'manager' | 'member';
  depth: number;
  roleLabel: string;
  managerId?: string;
  parentManagerId?: string;
  data: any;
}

export function AnalyticsTargetDashboard({ selectedUserIds, dateRange, periodFilter, isScopeReady = true }: AnalyticsTargetDashboardProps) {
  const [basis, setBasis] = useState<TargetBasis>('quantity');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'almost_there' | 'good_to_go' | 'achieved'>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [mobileShowValues, setMobileShowValues] = useState(false);
  const isMobile = useIsMobile();

  const { data: allUserIds = [] } = useQuery({
    queryKey: ['all-user-ids-for-analytics-targets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id');
      if (error) throw error;
      return (data || []).map((p: { id: string }) => p.id);
    },
    enabled: selectedUserIds.length === 0 && isScopeReady,
    staleTime: 5 * 60 * 1000,
  });

  const effectiveUserIds = selectedUserIds.length > 0 ? selectedUserIds : allUserIds;

  const periodType = useMemo((): PeriodType => {
    if (periodFilter) {
      switch (periodFilter) {
        case 'today': case 'yesterday': return 'day';
        case 'this_week': case 'last_week': return 'week';
        case 'this_month': case 'last_month': return 'month';
        case 'this_quarter': case 'last_quarter': return 'quarter';
        case 'this_fy': case 'last_fy': return 'year';
      }
    }
    const diffDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 'day';
    if (diffDays <= 7) return 'week';
    if (diffDays <= 31) return 'month';
    if (diffDays <= 92) return 'quarter';
    return 'year';
  }, [dateRange, periodFilter]);

  const { data: teamProgress, isLoading } = useTeamTargetProgress({
    userIds: effectiveUserIds,
    periodType,
    date: dateRange.from,
    basis,
  });

  const { data: hierarchyGroups } = useHierarchyTeamStructure(effectiveUserIds);

  const stats = useMemo(() => {
    if (!teamProgress?.length) return { total: 0, achieved: 0, goodToGo: 0, almostThere: 0, inProgress: 0, notStarted: 0 };
    return {
      total: teamProgress.length,
      achieved: teamProgress.filter(m => m.status === 'achieved').length,
      goodToGo: teamProgress.filter(m => m.status === 'good_to_go').length,
      almostThere: teamProgress.filter(m => m.status === 'almost_there').length,
      inProgress: teamProgress.filter(m => m.status === 'in_progress').length,
      notStarted: teamProgress.filter(m => m.status === 'not_started').length,
    };
  }, [teamProgress]);

  const filteredTeamProgress = useMemo(() => {
    if (!teamProgress?.length || statusFilter === 'all') return teamProgress;
    return teamProgress.filter(m => m.status === statusFilter);
  }, [teamProgress, statusFilter]);

  const progressMap = useMemo(() => {
    const map = new Map<string, TeamMemberProgress>();
    filteredTeamProgress?.forEach(m => map.set(m.userId, m));
    return map;
  }, [filteredTeamProgress]);

  // Recursively aggregate hierarchy group data
  const buildGroupedData = (group: HierarchyGroup): any => {
    const members = group.memberIds
      .map(id => progressMap.get(id))
      .filter(Boolean) as TeamMemberProgress[];

    const children = (group.children || [])
      .map(child => buildGroupedData(child))
      .filter((c: any) => c.members.length > 0 || c.children.length > 0);

    let teamTarget = members.reduce((sum, m) => sum + m.target, 0);
    let teamActual = members.reduce((sum, m) => sum + m.actual, 0);

    children.forEach((child: any) => {
      teamTarget += child.teamTarget;
      teamActual += child.teamActual;
    });

    const teamAchievement = teamTarget > 0 ? (teamActual / teamTarget) * 100 : 0;

    return { ...group, members, children, teamTarget, teamActual, teamAchievement };
  };

  const groupedData = useMemo(() => {
    if (!hierarchyGroups?.length || !filteredTeamProgress?.length) return null;
    return hierarchyGroups
      .map(group => buildGroupedData(group))
      .filter((g: any) => g.members.length > 0 || g.children.length > 0);
  }, [hierarchyGroups, filteredTeamProgress, progressMap]);

  // Flatten hierarchy
  const flattenHierarchy = (groups: any[]): FlatEntry[] => {
    const entries: FlatEntry[] = [];
    const walkGroup = (group: any, depth: number, parentManagerId?: string) => {
      const groupKey = group.managerId || `other-${entries.length}`;
      if (group.managerId) {
        entries.push({
          type: 'manager', depth,
          roleLabel: depth === 0 ? 'Top Manager' : depth === 1 ? 'Manager' : 'Team Lead',
          managerId: groupKey, parentManagerId, data: group,
        });
      }
      (group.children || []).forEach((child: any) => walkGroup(child, depth + 1, groupKey));
      group.members.forEach((member: TeamMemberProgress) => {
        entries.push({
          type: 'member', depth: group.managerId ? depth + 1 : depth,
          roleLabel: 'Member', parentManagerId: groupKey, data: member,
        });
      });
    };
    groups.forEach(g => walkGroup(g, 0));
    return entries;
  };

  const flatEntries = useMemo(() => {
    if (!groupedData?.length) return [];
    return flattenHierarchy(groupedData);
  }, [groupedData]);

  const visibleEntries = useMemo(() => {
    if (!flatEntries.length) return [];
    const isHidden = (entry: FlatEntry): boolean => {
      if (!entry.parentManagerId) return false;
      if (collapsedGroups.has(entry.parentManagerId)) return true;
      const parentEntry = flatEntries.find(e => e.managerId === entry.parentManagerId);
      if (parentEntry) return isHidden(parentEntry);
      return false;
    };
    return flatEntries.filter(entry => !isHidden(entry));
  }, [flatEntries, collapsedGroups]);

  const handleStatusFilterClick = (filter: typeof statusFilter) => {
    setStatusFilter(prev => prev === filter ? 'all' : filter);
  };

  const toggleGroupCollapsed = (managerId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(managerId)) next.delete(managerId);
      else next.add(managerId);
      return next;
    });
  };

  if (!isScopeReady || (effectiveUserIds.length === 0 && selectedUserIds.length === 0)) {
    return (
      <Card><CardContent className="py-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CardContent></Card>
    );
  }

  const formatValue = (value: number): string => {
    if (basis === 'revenue') {
      if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
      if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
      return `₹${value.toFixed(0)}`;
    } else {
      if (value >= 1000) return `${value.toFixed(0)} KG`;
      if (value >= 100) return `${value.toFixed(1)} KG`;
      return `${value.toFixed(2)} KG`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'achieved': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-1.5">Achieved</Badge>;
      case 'good_to_go': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5">Good to Go</Badge>;
      case 'almost_there': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-[10px] px-1.5">Almost There</Badge>;
      case 'in_progress': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1.5">In Progress</Badge>;
      case 'not_started': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px] px-1.5">Not Started</Badge>;
      default: return null;
    }
  };

  const getInitials = (name: string): string => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleBadgeStyle = (depth: number) => {
    const styles = [
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-amber-100 text-amber-700 border-amber-200',
    ];
    return styles[Math.min(depth, styles.length - 1)];
  };

  const getRowBgStyle = (depth: number) => {
    const styles = [
      'bg-rose-50/60 dark:bg-rose-950/20 border-l-rose-500',
      'bg-purple-50/60 dark:bg-purple-950/20 border-l-purple-500',
      'bg-blue-50/60 dark:bg-blue-950/20 border-l-blue-500',
      'bg-emerald-50/60 dark:bg-emerald-950/20 border-l-emerald-500',
      'bg-amber-50/60 dark:bg-amber-950/20 border-l-amber-500',
    ];
    return styles[Math.min(depth, styles.length - 1)];
  };

  const renderFlatRow = (entry: FlatEntry, idx: number) => {
    if (entry.type === 'manager') {
      const group = entry.data;
      const groupKey = entry.managerId!;
      const isCollapsed = collapsedGroups.has(groupKey);
      const teamStatus = group.teamAchievement >= 100 ? 'achieved' : group.teamAchievement >= 90 ? 'good_to_go' : group.teamAchievement >= 50 ? 'almost_there' : group.teamAchievement >= 1 ? 'in_progress' : 'not_started';

      return (
        <div
          key={`mgr-${groupKey}-${idx}`}
          className={cn(
            "grid items-center py-2.5 px-3 border-l-[3px] cursor-pointer transition-colors hover:opacity-90 gap-x-2",
            getRowBgStyle(entry.depth),
            isMobile ? "grid-cols-[auto_1fr_auto_auto]" : "grid-cols-[auto_auto_1fr_80px_80px_40px_auto]"
          )}
          onClick={() => toggleGroupCollapsed(groupKey)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}

          {!isMobile && (
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={group.managerAvatar || undefined} />
              <AvatarFallback className="text-[10px]">{getInitials(group.managerName)}</AvatarFallback>
            </Avatar>
          )}

          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("font-semibold truncate", isMobile ? "text-xs" : "text-sm")}>{group.managerName}</span>
            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border shrink-0 hidden sm:inline-flex", getRoleBadgeStyle(entry.depth))}>
              {entry.roleLabel}
            </Badge>
          </div>

          {!isMobile && (
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground leading-none">Target</p>
              <p className="text-xs font-bold leading-tight">{formatValue(group.teamTarget)}</p>
            </div>
          )}

          {!isMobile && (
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground leading-none">Actual</p>
              <p className="text-xs font-bold leading-tight">{formatValue(group.teamActual)}</p>
            </div>
          )}

          {isMobile && mobileShowValues ? (
            <>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground leading-none">Target</p>
                <p className="text-[11px] font-bold leading-tight">{formatValue(group.teamTarget)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground leading-none">Actual</p>
                <p className="text-[11px] font-bold leading-tight">{formatValue(group.teamActual)}</p>
              </div>
            </>
          ) : (
            <>
              <span className={cn("text-xs font-bold text-right", isMobile && "text-[11px]")}>{group.teamAchievement.toFixed(0)}%</span>
              <div className="shrink-0 justify-self-end">{getStatusBadge(teamStatus)}</div>
            </>
          )}
        </div>
      );
    }

    // Member row
    const member = entry.data as TeamMemberProgress;

    return (
      <div key={`mem-${member.userId}-${idx}`}>
        <div
          className={cn(
            "grid items-center py-2 px-3 border-l-[3px] transition-colors gap-x-2",
            getRowBgStyle(entry.depth),
            isMobile ? "grid-cols-[auto_1fr_auto_auto]" : "grid-cols-[auto_auto_1fr_80px_80px_40px_auto]"
          )}
        >
          <div className="w-4 shrink-0" />

          {!isMobile && (
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={member.avatarUrl || undefined} />
              <AvatarFallback className="text-[10px]">{getInitials(member.fullName)}</AvatarFallback>
            </Avatar>
          )}

          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("font-medium truncate", isMobile ? "text-xs" : "text-sm")}>{member.fullName}</span>
            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border shrink-0 hidden sm:inline-flex", getRoleBadgeStyle(entry.depth))}>
              {entry.roleLabel}
            </Badge>
          </div>

          {!isMobile && (
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground leading-none">Target</p>
              <p className="text-xs font-semibold leading-tight">{formatValue(member.target)}</p>
            </div>
          )}

          {!isMobile && (
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground leading-none">Actual</p>
              <p className="text-xs font-semibold leading-tight">{formatValue(member.actual)}</p>
            </div>
          )}

          {isMobile && mobileShowValues ? (
            <>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground leading-none">Target</p>
                <p className="text-[11px] font-semibold leading-tight">{formatValue(member.target)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground leading-none">Actual</p>
                <p className="text-[11px] font-semibold leading-tight">{formatValue(member.actual)}</p>
              </div>
            </>
          ) : (
            <>
              <span className={cn("text-xs font-bold text-right", isMobile && "text-[11px]")}>{member.achievementPercentage.toFixed(0)}%</span>
              <div className="shrink-0 justify-self-end">{getStatusBadge(member.status)}</div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Basis Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Target Basis</label>
              <Select value={basis} onValueChange={(v) => setBasis(v as TargetBasis)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
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
        {[
          { key: 'all' as const, icon: Users, color: 'blue', value: stats.total, label: 'Total' },
          { key: 'achieved' as const, icon: Trophy, color: 'green', value: stats.achieved, label: 'Achieved ≥100%' },
          { key: 'good_to_go' as const, icon: TrendingUp, color: 'emerald', value: stats.goodToGo, label: 'Good to Go 90-99%' },
          { key: 'almost_there' as const, icon: TrendingUp, color: 'yellow', value: stats.almostThere, label: 'Almost There 50-89%' },
          { key: 'in_progress' as const, icon: TrendingDown, color: 'orange', value: stats.inProgress, label: 'In Progress 1-49%' },
          { key: 'not_started' as const, icon: TrendingDown, color: 'red', value: stats.notStarted, label: 'Not Started 0%' },
        ].map(({ key, icon: Icon, color, value, label }) => (
          <Card
            key={key}
            className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === key && `ring-2 ring-${color}-500 ring-offset-2`)}
            onClick={() => handleStatusFilterClick(key)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 bg-${color}-100 rounded-lg`}><Icon className={`h-4 w-4 text-${color}-600`} /></div>
                <div>
                  <p className={`text-xl font-bold ${key !== 'all' ? `text-${color}-600` : ''}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Target Summary - Flat Hierarchy View */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="h-5 w-5" />
              Target Summary
            </CardTitle>
            {isMobile && (
              <Button
                variant={mobileShowValues ? "default" : "outline"}
                size="sm"
                className="h-7 text-[10px] px-2"
                onClick={() => setMobileShowValues(prev => !prev)}
              >
                {mobileShowValues ? 'Show Status' : 'Show Values'}
              </Button>
            )}
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
          ) : visibleEntries.length > 0 ? (
            <div className="rounded-lg overflow-hidden border divide-y divide-border/50">
              {visibleEntries.map((entry, idx) => renderFlatRow(entry, idx))}
            </div>
          ) : (
            // Fallback flat list
            <div className="rounded-lg overflow-hidden border divide-y divide-border/50">
              {filteredTeamProgress.map((member, idx) => (
                <div
                  key={member.userId}
                  className={cn(
                    "grid items-center py-2 px-3 border-l-[3px] gap-x-2",
                    getRowBgStyle(3),
                    isMobile ? "grid-cols-[auto_1fr_auto_auto_auto]" : "grid-cols-[auto_auto_1fr_80px_80px_40px_auto]"
                  )}
                >
                  <div className="w-4 shrink-0" />
                  {!isMobile && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback className="text-[10px]">{getInitials(member.fullName)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{member.fullName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-muted-foreground leading-none">Target</p>
                    <p className="text-xs font-semibold leading-tight">{formatValue(member.target)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-muted-foreground leading-none">Actual</p>
                    <p className="text-xs font-semibold leading-tight">{formatValue(member.actual)}</p>
                  </div>
                  {!isMobile && <span className="text-xs font-bold text-right">{member.achievementPercentage.toFixed(0)}%</span>}
                  <div className="shrink-0 justify-self-end">{getStatusBadge(member.status)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
