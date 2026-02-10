import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, ChevronRight, MapPin, CheckCircle, Clock, XCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubordinates } from '@/hooks/useSubordinates';
import { useHierarchyTeamStructure, HierarchyGroup } from '@/hooks/useHierarchyTeamProgress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface UserVisitSummary {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  beatNames: string[];
  totalPlanned: number;
  productive: number;
  unproductive: number;
  pending: number;
  totalOrderValue: number;
  visits: {
    retailerName: string;
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    orderValue: number;
  }[];
}

interface TeamHierarchyVisitsViewProps {
  selectedDate: string;
}

export const TeamHierarchyVisitsView: React.FC<TeamHierarchyVisitsViewProps> = ({ selectedDate }) => {
  const { user } = useAuth();
  const { subordinateIds, isManager, isLoading: subsLoading } = useSubordinates();
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // All viewable user IDs (self + subordinates)
  const allUserIds = useMemo(() => {
    if (!user?.id) return [];
    return [user.id, ...subordinateIds];
  }, [user?.id, subordinateIds]);

  const { data: hierarchyGroups = [], isLoading: hierarchyLoading } = useHierarchyTeamStructure(allUserIds);

  // Fetch visit summaries for all users on the selected date
  const { data: userSummaries = [], isLoading: summariesLoading } = useQuery({
    queryKey: ['team-visit-summaries', selectedDate, allUserIds.length],
    queryFn: async (): Promise<UserVisitSummary[]> => {
      if (!allUserIds.length) return [];

      // Fetch profiles, beat plans, visits, and orders in parallel
      const [profilesRes, beatPlansRes, visitsRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, profile_picture_url').in('id', allUserIds),
        supabase.from('beat_plans').select('user_id, beat_name, beat_id').in('user_id', allUserIds).eq('plan_date', selectedDate),
        supabase.from('visits').select('id, user_id, retailer_id, status, check_in_time, check_out_time, no_order_reason').in('user_id', allUserIds).eq('planned_date', selectedDate),
        supabase.from('orders').select('id, user_id, retailer_id, total_amount, retailer_name').in('user_id', allUserIds).eq('order_date', selectedDate).eq('status', 'confirmed'),
      ]);

      const profiles = profilesRes.data || [];
      const beatPlans = beatPlansRes.data || [];
      const visits = visitsRes.data || [];
      const orders = ordersRes.data || [];

      // Get all beat IDs to fetch retailers
      const beatIdsByUser = new Map<string, string[]>();
      beatPlans.forEach(bp => {
        const existing = beatIdsByUser.get(bp.user_id) || [];
        existing.push(bp.beat_id);
        beatIdsByUser.set(bp.user_id, existing);
      });

      const allBeatIds = Array.from(new Set(beatPlans.map(bp => bp.beat_id)));
      
      // Fetch retailers for planned beats
      let retailers: any[] = [];
      if (allBeatIds.length > 0) {
        const { data } = await supabase.from('retailers').select('id, name, beat_id, user_id').in('beat_id', allBeatIds).in('user_id', allUserIds);
        retailers = data || [];
      }

      // Build summaries
      const profileMap = new Map(profiles.map(p => [p.id, p]));
      
      return allUserIds.map(userId => {
        const profile = profileMap.get(userId);
        const userBeatPlans = beatPlans.filter(bp => bp.user_id === userId);
        const userVisits = visits.filter(v => v.user_id === userId);
        const userOrders = orders.filter(o => o.user_id === userId);
        const userBeatIds = beatIdsByUser.get(userId) || [];
        const userRetailers = retailers.filter(r => r.user_id === userId && userBeatIds.includes(r.beat_id));

        // Build visit map
        const visitMap = new Map(userVisits.map(v => [v.retailer_id, v]));
        const orderMap = new Map<string, number>();
        userOrders.forEach(o => {
          orderMap.set(o.retailer_id, (orderMap.get(o.retailer_id) || 0) + Number(o.total_amount || 0));
        });

        // Get all retailer IDs (from visits + planned retailers)
        const allRetailerIds = new Set([
          ...userVisits.map(v => v.retailer_id),
          ...userRetailers.map(r => r.id),
        ]);

        const retailerNameMap = new Map(userRetailers.map(r => [r.id, r.name]));
        // Also add names from orders
        userOrders.forEach(o => {
          if (o.retailer_name && !retailerNameMap.has(o.retailer_id)) {
            retailerNameMap.set(o.retailer_id, o.retailer_name);
          }
        });

        let productive = 0, unproductive = 0, pending = 0;
        const visitDetails: UserVisitSummary['visits'] = [];

        allRetailerIds.forEach(rid => {
          const visit = visitMap.get(rid);
          const orderVal = orderMap.get(rid) || 0;
          const hasOrder = orderVal > 0;
          
          let status = 'planned';
          if (hasOrder) {
            status = 'productive';
            productive++;
          } else if (visit?.status === 'productive') {
            status = 'productive';
            productive++;
          } else if (visit?.status === 'unproductive' || visit?.no_order_reason) {
            status = 'unproductive';
            unproductive++;
          } else {
            pending++;
          }

          visitDetails.push({
            retailerName: retailerNameMap.get(rid) || 'Unknown',
            status,
            checkInTime: visit?.check_in_time || null,
            checkOutTime: visit?.check_out_time || null,
            orderValue: orderVal,
          });
        });

        const totalOrderValue = userOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

        return {
          userId,
          fullName: profile?.full_name || 'Unknown User',
          avatarUrl: profile?.profile_picture_url || null,
          beatNames: userBeatPlans.map(bp => bp.beat_name),
          totalPlanned: allRetailerIds.size,
          productive,
          unproductive,
          pending,
          totalOrderValue,
          visits: visitDetails.sort((a, b) => {
            const order = { productive: 0, unproductive: 1, planned: 2 };
            return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
          }),
        };
      });
    },
    enabled: allUserIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const summaryMap = useMemo(() => new Map(userSummaries.map(s => [s.userId, s])), [userSummaries]);

  const toggleManager = (managerId: string) => {
    setExpandedManagers(prev => {
      const next = new Set(prev);
      if (next.has(managerId)) next.delete(managerId);
      else next.add(managerId);
      return next;
    });
  };

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const isLoading = subsLoading || hierarchyLoading || summariesLoading;

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading team hierarchy...</span>
        </CardContent>
      </Card>
    );
  }

  if (!isManager && allUserIds.length <= 1) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No team members found in your hierarchy.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'productive':
        return <Badge className="bg-success/15 text-success border-success/30 text-[10px] px-1.5">Productive</Badge>;
      case 'unproductive':
        return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] px-1.5">Unproductive</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground border-border text-[10px] px-1.5">Pending</Badge>;
    }
  };

  const renderUserCard = (userId: string) => {
    const summary = summaryMap.get(userId);
    if (!summary) return null;

    const isExpanded = expandedUsers.has(userId);
    const completionRate = summary.totalPlanned > 0
      ? Math.round(((summary.productive + summary.unproductive) / summary.totalPlanned) * 100)
      : 0;

    return (
      <div key={userId} className="border border-border/60 rounded-lg bg-card overflow-hidden">
        <button
          onClick={() => toggleUser(userId)}
          className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={summary.avatarUrl || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {summary.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{summary.fullName}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">{completionRate}% done</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {summary.beatNames.length > 0 ? (
                <span className="text-[10px] text-muted-foreground truncate">
                  <MapPin className="h-3 w-3 inline mr-0.5" />
                  {summary.beatNames.join(', ')}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground italic">No beats planned</span>
              )}
            </div>
          </div>
        </button>

        {/* Summary stats bar */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 text-[10px]">
            <div className="flex items-center gap-1 text-success">
              <CheckCircle className="h-3 w-3" />
              <span>{summary.productive}</span>
            </div>
            <div className="flex items-center gap-1 text-destructive">
              <XCircle className="h-3 w-3" />
              <span>{summary.unproductive}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{summary.pending}</span>
            </div>
            {summary.totalOrderValue > 0 && (
              <div className="flex items-center gap-1 text-success ml-auto">
                <ShoppingCart className="h-3 w-3" />
                <span>₹{Math.round(summary.totalOrderValue).toLocaleString()}</span>
              </div>
            )}
          </div>
          <Progress value={completionRate} className="h-1.5 mt-1.5" />
        </div>

        {/* Expanded visit details */}
        {isExpanded && summary.visits.length > 0 && (
          <div className="border-t border-border/40 bg-muted/20">
            <div className="divide-y divide-border/30">
              {summary.visits.map((visit, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{visit.retailerName}</span>
                    {visit.checkInTime && (
                      <span className="text-[10px] text-muted-foreground">
                        In: {format(new Date(visit.checkInTime), 'hh:mm a')}
                        {visit.checkOutTime && ` • Out: ${format(new Date(visit.checkOutTime), 'hh:mm a')}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {visit.orderValue > 0 && (
                      <span className="text-success font-medium">₹{Math.round(visit.orderValue).toLocaleString()}</span>
                    )}
                    {getStatusBadge(visit.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Team Hierarchy – {format(new Date(selectedDate + 'T00:00:00'), 'MMM dd, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {hierarchyGroups.map((group, gIdx) => {
          const groupKey = group.managerId || `ungrouped-${gIdx}`;
          const isGroupExpanded = expandedManagers.has(groupKey);
          
          // Calculate group stats
          const groupMembers = group.memberIds.map(id => summaryMap.get(id)).filter(Boolean) as UserVisitSummary[];
          const managerSummary = group.managerId ? summaryMap.get(group.managerId) : null;
          const allGroupSummaries = managerSummary ? [managerSummary, ...groupMembers] : groupMembers;
          
          const groupProductiveTotal = allGroupSummaries.reduce((s, m) => s + m.productive, 0);
          const groupTotalPlanned = allGroupSummaries.reduce((s, m) => s + m.totalPlanned, 0);
          const groupOrderValue = allGroupSummaries.reduce((s, m) => s + m.totalOrderValue, 0);

          return (
            <Collapsible key={groupKey} open={isGroupExpanded} onOpenChange={() => toggleManager(groupKey)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/15 hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-2">
                    {isGroupExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
                    {group.managerAvatar ? (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={group.managerAvatar} />
                        <AvatarFallback className="text-[10px]">{group.managerName[0]}</AvatarFallback>
                      </Avatar>
                    ) : null}
                    <span className="font-semibold text-sm text-primary">{group.managerName}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 border-primary/30 text-primary">
                      {allGroupSummaries.length} {allGroupSummaries.length === 1 ? 'member' : 'members'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="text-success font-medium">{groupProductiveTotal}/{groupTotalPlanned}</span>
                    {groupOrderValue > 0 && (
                      <span className="text-success">₹{Math.round(groupOrderValue).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1.5 mt-1.5 ml-2">
                  {/* Render manager card if they are also a user */}
                  {group.managerId && renderUserCard(group.managerId)}
                  {/* Render member cards */}
                  {group.memberIds.map(id => renderUserCard(id))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
