import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeamTargetProgress, PeriodType, TargetBasis } from '@/hooks/useTeamTargetProgress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsTargetDashboardProps {
  selectedUserIds: string[];
  dateRange: { from: Date; to: Date };
  periodFilter?: string;
}

export function AnalyticsTargetDashboard({ selectedUserIds, dateRange, periodFilter }: AnalyticsTargetDashboardProps) {
  const [basis, setBasis] = useState<TargetBasis>('quantity');
  const [statusFilter, setStatusFilter] = useState<'all' | 'achieved' | 'in_progress' | 'not_achieved'>('all');

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
    enabled: selectedUserIds.length === 0,
    staleTime: 5 * 60 * 1000,
  });

  // Use selected users if provided, otherwise use all users
  const effectiveUserIds = selectedUserIds.length > 0 ? selectedUserIds : allUserIds;

  // Determine period type based on periodFilter or date range
  const periodType = useMemo((): PeriodType => {
    // Use explicit period mapping if periodFilter is provided
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
    // Fallback to date range calculation
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

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!teamProgress?.length) {
      return { total: 0, achieved: 0, inProgress: 0, notAchieved: 0 };
    }

    return {
      total: teamProgress.length,
      achieved: teamProgress.filter(m => m.status === 'achieved').length,
      inProgress: teamProgress.filter(m => m.status === 'in_progress').length,
      notAchieved: teamProgress.filter(m => m.status === 'not_achieved').length,
    };
  }, [teamProgress]);

  // Filter team progress based on selected status
  const filteredTeamProgress = useMemo(() => {
    if (!teamProgress?.length || statusFilter === 'all') return teamProgress;
    return teamProgress.filter(m => m.status === statusFilter);
  }, [teamProgress, statusFilter]);

  const handleStatusFilterClick = (filter: 'all' | 'achieved' | 'in_progress' | 'not_achieved') => {
    setStatusFilter(prev => prev === filter ? 'all' : filter);
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
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">In Progress</Badge>;
      case 'not_achieved':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Not Achieved</Badge>;
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

  // Show loading while fetching all user IDs
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'all' && "ring-2 ring-blue-500 ring-offset-2"
          )}
          onClick={() => handleStatusFilterClick('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'achieved' && "ring-2 ring-green-500 ring-offset-2"
          )}
          onClick={() => handleStatusFilterClick('achieved')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.achieved}</p>
                <p className="text-xs text-muted-foreground">Achieved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'in_progress' && "ring-2 ring-yellow-500 ring-offset-2"
          )}
          onClick={() => handleStatusFilterClick('in_progress')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'not_achieved' && "ring-2 ring-red-500 ring-offset-2"
          )}
          onClick={() => handleStatusFilterClick('not_achieved')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.notAchieved}</p>
                <p className="text-xs text-muted-foreground">Not Achieved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Progress Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Team Performance</CardTitle>
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
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeamProgress.map((member) => (
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
                      <TableCell className="text-right font-medium">
                        {formatValue(member.target)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
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
                        "text-right font-medium",
                        member.gap >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {member.gap >= 0 ? '+' : ''}{formatValue(member.gap)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(member.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
