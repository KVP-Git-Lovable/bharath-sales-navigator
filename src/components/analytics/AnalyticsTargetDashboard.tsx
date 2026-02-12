import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, Trophy, TrendingUp, TrendingDown, ChevronDown, ChevronRight, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeamTargetProgress, PeriodType, TargetBasis, TeamMemberProgress } from '@/hooks/useTeamTargetProgress';
import { useHierarchyTeamStructure } from '@/hooks/useHierarchyTeamProgress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsTargetDashboardProps {
  selectedUserIds: string[];
  dateRange: { from: Date; to: Date };
  periodFilter?: string;
  isScopeReady?: boolean;
}

export function AnalyticsTargetDashboard({ selectedUserIds, dateRange, periodFilter, isScopeReady = true }: AnalyticsTargetDashboardProps) {
  const [basis, setBasis] = useState<TargetBasis>('quantity');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'almost_there' | 'good_to_go' | 'achieved'>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Fetch all user IDs when no specific users are selected
  const { data: allUserIds = [] } = useQuery({
    queryKey: ['all-user-ids-for-analytics-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id');
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
        case 'today':
        case 'yesterday':
          return 'day';
        case 'this_week':
        case 'last_week':
          return 'week';
        case 'this_month':
        case 'last_month':
          return 'month';
        case 'this_quarter':
        case 'last_quarter':
          return 'quarter';
        case 'this_fy':
        case 'last_fy':
          return 'year';
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

  // Fetch hierarchy structure for grouping
  const { data: hierarchyGroups } = useHierarchyTeamStructure(effectiveUserIds);

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

  // Build hierarchy groups with aggregated data
  const groupedData = useMemo(() => {
    if (!hierarchyGroups?.length || !filteredTeamProgress?.length) {
      return null;
    }

    return hierarchyGroups.map(group => {
      const members = group.memberIds
        .map(id => progressMap.get(id))
        .filter(Boolean) as TeamMemberProgress[];

      const managerProgress = group.managerId ? progressMap.get(group.managerId) : null;

      const teamTarget = members.reduce((sum, m) => sum + m.target, 0);
      const teamActual = members.reduce((sum, m) => sum + m.actual, 0);
      const teamAchievement = teamTarget > 0 ? (teamActual / teamTarget) * 100 : 0;

      return {
        ...group,
        members,
        managerProgress,
        teamTarget,
        teamActual,
        teamAchievement,
      };
    }).filter(g => g.members.length > 0 || g.managerProgress);
  }, [hierarchyGroups, filteredTeamProgress, progressMap]);

  const handleStatusFilterClick = (filter: 'all' | 'not_started' | 'in_progress' | 'almost_there' | 'good_to_go' | 'achieved') => {
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

  if (!isScopeReady) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
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
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (effectiveUserIds.length === 0 && selectedUserIds.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderMemberRow = (member: TeamMemberProgress) => (
    <TableRow key={member.userId}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={member.avatarUrl || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(member.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{member.fullName}</span>
        </div>
      </TableCell>
      <TableCell className="text-right font-medium hidden sm:table-cell">
        {formatValue(member.target)}
      </TableCell>
      <TableCell className="text-right font-medium hidden sm:table-cell">
        {formatValue(member.actual)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress 
            value={Math.min(member.achievementPercentage, 100)} 
            className="h-2 w-20"
          />
          <span className="text-sm font-medium w-12 text-right">
            {member.achievementPercentage.toFixed(0)}%
          </span>
        </div>
      </TableCell>
      <TableCell className={cn(
        "text-right font-medium hidden sm:table-cell",
        member.gap >= 0 ? "text-green-600" : "text-red-600"
      )}>
        {member.gap >= 0 ? '+' : ''}{formatValue(member.gap)}
      </TableCell>
      <TableCell className="text-center">
        {getStatusBadge(member.status)}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-4">
      {/* Basis Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
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

      {/* Summary Cards - Clickable Filters */}
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

      {/* Team Performance - Hierarchy View */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="h-5 w-5" />
            Team Performance (Hierarchy View)
          </CardTitle>
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
                <Button variant="link" onClick={() => setStatusFilter('all')} className="mt-2">
                  Clear filter
                </Button>
              )}
            </div>
          ) : groupedData && groupedData.length > 0 ? (
            <div className="space-y-4">
              {groupedData.map((group, idx) => {
                const groupKey = group.managerId || `other-${idx}`;
                const isCollapsed = collapsedGroups.has(groupKey);
                const teamStatus = group.teamAchievement >= 100 ? 'achieved' : group.teamAchievement >= 90 ? 'good_to_go' : group.teamAchievement >= 50 ? 'almost_there' : group.teamAchievement >= 1 ? 'in_progress' : 'not_started';

                return (
                  <div key={groupKey} className="border rounded-lg overflow-hidden">
                    {/* Group Header */}
                    <div
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer transition-colors",
                        "bg-muted/50 hover:bg-muted/70"
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
                          <span className="text-xs text-muted-foreground ml-2">({group.members.length} members)</span>
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
                        <span className="hidden sm:inline-flex">{getStatusBadge(teamStatus)}</span>
                      </div>
                    </div>

                    {/* Group Members */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Team Member</TableHead>
                              <TableHead className="text-right hidden sm:table-cell">Target</TableHead>
                              <TableHead className="text-right hidden sm:table-cell">Actual</TableHead>
                              <TableHead className="text-center">Progress</TableHead>
                              <TableHead className="text-right hidden sm:table-cell">Gap</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.members.map(member => renderMemberRow(member))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Fallback flat table when no hierarchy data
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Target</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Actual</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Gap</TableHead>
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
