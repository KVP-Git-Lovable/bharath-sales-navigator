import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Trophy, TrendingUp, TrendingDown, Calendar as CalendarIcon, Filter, Globe, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSubordinates } from '@/hooks/useSubordinates';
import { useTeamTargetProgress, PeriodType, TargetBasis } from '@/hooks/useTeamTargetProgress';
import { useFYTargetConfig } from '@/hooks/useFYTargetConfig';
import { ProductMonthBreakdownTable } from './ProductMonthBreakdownTable';
import { UserScope } from '@/pages/admin/TargetVsActual';
import { supabase } from '@/integrations/supabase/client';

interface TeamTargetDashboardProps {
  userScope?: UserScope;
  onUserScopeChange?: (scope: UserScope) => void;
  effectiveUserIds?: string[];
  fyYear?: number;
  hasAdminAccess?: boolean;
}

export function TeamTargetDashboard({
  userScope = 'team',
  onUserScopeChange,
  effectiveUserIds = [],
  fyYear,
  hasAdminAccess = false,
}: TeamTargetDashboardProps = {}) {
  const { user } = useAuth();
  const { subordinateIds, isManager } = useSubordinates();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [basis, setBasis] = useState<TargetBasis>('quantity');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'achieved' | 'in_progress' | 'not_achieved'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch FY config to get enabled parameters
  const { data: fyConfig } = useFYTargetConfig(fyYear || new Date().getFullYear());
  const enabledParameters = fyConfig?.enabled_parameters;
  const hasProductAndMonthly = enabledParameters?.product && enabledParameters?.monthly;

  // Get all team member IDs - use effectiveUserIds if provided, else subordinates
  const teamUserIds = effectiveUserIds.length > 0 ? effectiveUserIds : subordinateIds;

  const { data: teamProgress, isLoading } = useTeamTargetProgress({
    userIds: teamUserIds,
    periodType,
    date: selectedDate,
    basis,
    enabledParameters,
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

  const toggleRowExpanded = (userId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const formatValue = (value: number): string => {
    if (basis === 'revenue') {
      if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
      if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
      return `₹${value.toFixed(0)}`;
    } else {
      // Quantity is always in KG - display with appropriate precision
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

            {/* Period Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Period</label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
            <p className="text-[10px] text-muted-foreground mt-2">Achievement ≥ 100%</p>
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
            <p className="text-[10px] text-muted-foreground mt-2">Achievement between 50% – 99%</p>
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
            <p className="text-[10px] text-muted-foreground mt-2">Achievement below 50%</p>
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
                  {filteredTeamProgress.map((member) => {
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
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : null}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatarUrl || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(member.fullName)}
                                </AvatarFallback>
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
                        {hasBreakdown && isExpanded && (
                          <TableRow>
                            <TableCell colSpan={hasProductAndMonthly ? 7 : 6} className="p-0 bg-muted/20">
                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Product × Month Breakdown</span>
                                </div>
                                <ProductMonthBreakdownTable 
                                  data={member.productMonthBreakdown!} 
                                  basis={basis}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
