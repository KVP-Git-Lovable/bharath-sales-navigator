import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Activity, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface DayProductivity {
  date: string;
  displayDate: string;
  userName: string;
  userId: string;
  planned: number;
  productive: number;
  unproductive: number;
  pending: number;
}

interface UserProductivitySummary {
  full_name: string;
  planned_visits: number;
  productive_visits: number;
  unproductive_visits: number;
  pending_visits: number;
  total_visits: number;
  productivity_percentage: number;
  days_count: number;
}

interface ProductivitySummarySectionProps {
  selectedUsers: string[]; // user names (for backward compat display)
  selectedUserIds?: string[]; // user IDs for querying
  dateRange: { from: Date; to: Date };
  allUsers?: { id: string; full_name: string | null }[];
  onDataLoaded?: (data: { full_name: string; productivity_percentage: number; productive_visits: number; total_visits: number }[]) => void;
}

export const ProductivitySummarySection = ({ selectedUsers, selectedUserIds, dateRange, allUsers = [], onDataLoaded }: ProductivitySummarySectionProps) => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [dayData, setDayData] = useState<DayProductivity[]>([]);
  const [selectedUserForDrilldown, setSelectedUserForDrilldown] = useState<string | null>(null);

  // Resolve effective user IDs
  const effectiveUserIds = useMemo(() => {
    if (selectedUserIds && selectedUserIds.length > 0) return selectedUserIds;
    // Fallback: resolve from names
    if (selectedUsers.length > 0) {
      return allUsers
        .filter(u => u.full_name && selectedUsers.includes(u.full_name))
        .map(u => u.id);
    }
    // All users
    return allUsers.map(u => u.id);
  }, [selectedUserIds, selectedUsers, allUsers]);

  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach(u => map.set(u.id, u.full_name || 'Unknown'));
    return map;
  }, [allUsers]);

  const isSingleUserMode = effectiveUserIds.length === 1;
  const hasNoData = effectiveUserIds.length === 0;

  const fetchProductivityData = async () => {
    if (hasNoData) {
      setDayData([]);
      return;
    }

    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Generate all dates in range
      const datesInRange: string[] = [];
      const current = new Date(dateRange.from);
      current.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.to);
      end.setHours(23, 59, 59, 999);
      while (current <= end) {
        datesInRange.push(format(current, 'yyyy-MM-dd'));
        current.setDate(current.getDate() + 1);
      }

      // Fetch all data in parallel (same as TodaySummary logic)
      const [beatPlansRes, visitsRes] = await Promise.all([
        // Beat plans for the period
        supabase
          .from('beat_plans')
          .select('beat_id, beat_name, plan_date, user_id, beat_data')
          .in('user_id', effectiveUserIds)
          .gte('plan_date', fromDate)
          .lte('plan_date', toDate),

        // Visits for the period
        supabase
          .from('visits')
          .select('id, retailer_id, status, user_id, planned_date')
          .in('user_id', effectiveUserIds)
          .gte('planned_date', fromDate)
          .lte('planned_date', toDate),
      ]);

      const beatPlans = beatPlansRes.data || [];
      const visits = visitsRes.data || [];

      // Get all beat IDs and fetch retailers for those beats (same as TodaySummary)
      const beatIds = [...new Set(beatPlans.map(bp => bp.beat_id).filter(Boolean))];

      let beatRetailers: { id: string; beat_id: string; user_id: string }[] = [];
      if (beatIds.length > 0) {
        const { data } = await supabase
          .from('retailers')
          .select('id, beat_id, user_id')
          .in('user_id', effectiveUserIds)
          .in('beat_id', beatIds);
        beatRetailers = data || [];
      }

      // Build per-user per-date planned retailers (from beat_plans → retailers)
      // Key: `userId_date` → Set of retailer IDs
      const plannedMap = new Map<string, Set<string>>();

      beatPlans.forEach(bp => {
        const key = `${bp.user_id}_${bp.plan_date}`;
        if (!plannedMap.has(key)) plannedMap.set(key, new Set());
        const set = plannedMap.get(key)!;

        // Get retailers that belong to this beat and this user
        const retailersForBeat = beatRetailers.filter(r => r.beat_id === bp.beat_id && r.user_id === bp.user_id);
        retailersForBeat.forEach(r => set.add(r.id));
      });

      // Calculate per-user per-date metrics using same logic as TodaySummary day-wise
      // TodaySummary counts raw visit records (not unique retailers) for productive/unproductive
      const results: DayProductivity[] = [];

      for (const userId of effectiveUserIds) {
        for (const dateStr of datesInRange) {
          const key = `${userId}_${dateStr}`;
          const plannedRetailers = plannedMap.get(key) || new Set();

          const planned = plannedRetailers.size;

          // Productive: count of visit records with status='productive' (same as TodaySummary line 1405)
          const productive = visits.filter(v => 
            v.user_id === userId && v.planned_date === dateStr && v.status === 'productive'
          ).length;

          // Unproductive: count of visit records with unproductive/store_closed/canceled (same as TodaySummary line 1408-1411)
          const unproductive = visits.filter(v => 
            v.user_id === userId && v.planned_date === dateStr && 
            (v.status === 'unproductive' || v.status === 'store_closed' || v.status === 'canceled')
          ).length;

          if (planned === 0 && productive === 0 && unproductive === 0) continue; // Skip empty days

          const pending = Math.max(0, planned - productive - unproductive);

          results.push({
            date: dateStr,
            displayDate: format(new Date(dateStr + 'T00:00:00'), 'MMMM d, yyyy'),
            userName: userNameMap.get(userId) || 'Unknown',
            userId,
            planned,
            productive,
            unproductive,
            pending,
          });
        }
      }

      setDayData(results);
    } catch (error) {
      console.error('Error fetching productivity data:', error);
      setDayData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductivityData();
  }, [effectiveUserIds.join(','), dateRange.from.getTime(), dateRange.to.getTime()]);

  // Group data by user for multi-user mode
  const userSummaries = useMemo((): UserProductivitySummary[] => {
    const grouped: Record<string, UserProductivitySummary> = {};

    dayData.forEach(row => {
      if (!grouped[row.userName]) {
        grouped[row.userName] = {
          full_name: row.userName,
          planned_visits: 0,
          productive_visits: 0,
          unproductive_visits: 0,
          pending_visits: 0,
          total_visits: 0,
          productivity_percentage: 0,
          days_count: 0,
        };
      }
      const g = grouped[row.userName];
      g.planned_visits += row.planned;
      g.productive_visits += row.productive;
      g.unproductive_visits += row.unproductive;
      g.pending_visits += row.pending;
      g.total_visits += row.productive + row.unproductive;
      g.days_count += 1;
    });

    Object.values(grouped).forEach(user => {
      user.productivity_percentage = user.planned_visits > 0
        ? Math.round((user.productive_visits / user.planned_visits) * 100 * 100) / 100
        : 0;
    });

    return Object.values(grouped).sort((a, b) => b.productivity_percentage - a.productivity_percentage);
  }, [dayData]);

  // Notify parent
  useEffect(() => {
    if (onDataLoaded && userSummaries.length > 0) {
      onDataLoaded(userSummaries.map(u => ({
        full_name: u.full_name,
        productivity_percentage: u.productivity_percentage,
        productive_visits: u.productive_visits,
        total_visits: u.total_visits,
      })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSummaries]);

  // Single-user day-wise data
  const singleUserData = useMemo(() => {
    if (!isSingleUserMode) return [];
    return dayData.sort((a, b) => a.date.localeCompare(b.date));
  }, [dayData, isSingleUserMode]);

  // Drilldown data for multi-user mode
  const drilldownData = useMemo(() => {
    if (!selectedUserForDrilldown) return [];
    return dayData
      .filter(row => row.userName === selectedUserForDrilldown)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dayData, selectedUserForDrilldown]);

  // Calculate totals
  const singleUserTotals = useMemo(() => {
    const totalPlanned = singleUserData.reduce((s, r) => s + r.planned, 0);
    const totalProductive = singleUserData.reduce((s, r) => s + r.productive, 0);
    const totalUnproductive = singleUserData.reduce((s, r) => s + r.unproductive, 0);
    const totalPending = singleUserData.reduce((s, r) => s + r.pending, 0);
    const avgProductivity = totalPlanned > 0 ? Math.round((totalProductive / totalPlanned) * 100 * 100) / 100 : 0;
    return { planned: totalPlanned, productive: totalProductive, unproductive: totalUnproductive, pending: totalPending, avgProductivity };
  }, [singleUserData]);

  const multiUserTotals = useMemo(() => {
    const totalPlanned = userSummaries.reduce((s, r) => s + r.planned_visits, 0);
    const totalProductive = userSummaries.reduce((s, r) => s + r.productive_visits, 0);
    const totalUnproductive = userSummaries.reduce((s, r) => s + r.unproductive_visits, 0);
    const totalPending = userSummaries.reduce((s, r) => s + r.pending_visits, 0);
    const avgProductivity = totalPlanned > 0 ? Math.round((totalProductive / totalPlanned) * 100 * 100) / 100 : 0;
    return { planned: totalPlanned, productive: totalProductive, unproductive: totalUnproductive, pending: totalPending, avgProductivity, usersCount: userSummaries.length };
  }, [userSummaries]);

  const drilldownTotals = useMemo(() => {
    const totalPlanned = drilldownData.reduce((s, r) => s + r.planned, 0);
    const totalProductive = drilldownData.reduce((s, r) => s + r.productive, 0);
    const totalUnproductive = drilldownData.reduce((s, r) => s + r.unproductive, 0);
    const totalPending = drilldownData.reduce((s, r) => s + r.pending, 0);
    const avgProductivity = totalPlanned > 0 ? Math.round((totalProductive / totalPlanned) * 100 * 100) / 100 : 0;
    return { planned: totalPlanned, productive: totalProductive, unproductive: totalUnproductive, pending: totalPending, avgProductivity };
  }, [drilldownData]);

  const getProductivityColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const effectiveUserDisplay = isSingleUserMode
    ? (userNameMap.get(effectiveUserIds[0]) || selectedUsers[0] || 'Unknown')
    : `${effectiveUserIds.length} users`;

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base sm:text-lg md:text-xl">Productivity Summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                Visit productivity {isSingleUserMode ? 'by date' : 'by user'} • {
                  hasNoData ? 'Loading users...' : effectiveUserDisplay
                } • {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasNoData ? (
            <div className="text-center py-8 text-muted-foreground">
              No user data available
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-muted-foreground">Loading productivity data...</p>
            </div>
          ) : dayData.length > 0 ? (
            <div className={cn(
              "relative border rounded-lg scrollbar-always-visible",
              dayData.length > 8 && "max-h-[400px]"
            )}>
              <div className="min-w-max">
                {isSingleUserMode ? (
                  // Single user: Day-wise breakdown
                  <table className={cn("w-full caption-bottom", isMobile ? "text-[9px]" : "text-sm")}>
                    <thead className="sticky top-0 bg-muted z-20">
                      <TableRow className="border-b">
                        <TableHead className={cn("whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Date</TableHead>
                        <TableHead className={cn("text-right whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Planned</TableHead>
                        <TableHead className={cn("text-right whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Productive</TableHead>
                        <TableHead className={cn("text-right whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Unproductive</TableHead>
                        <TableHead className={cn("text-right whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Pending</TableHead>
                        <TableHead className={cn("text-right whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Productivity %</TableHead>
                      </TableRow>
                    </thead>
                    <TableBody>
                      {singleUserData.map((row, index) => {
                        const pct = row.planned > 0 ? Math.round((row.productive / row.planned) * 100 * 100) / 100 : 0;
                        return (
                          <TableRow key={index} className="hover:bg-muted/30">
                            <TableCell className={cn("font-medium whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{row.displayDate}</TableCell>
                            <TableCell className={cn("text-right text-blue-600 font-medium whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{row.planned}</TableCell>
                            <TableCell className={cn("text-right text-green-600 font-medium whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{row.productive}</TableCell>
                            <TableCell className={cn("text-right text-orange-600 font-medium whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{row.unproductive}</TableCell>
                            <TableCell className={cn("text-right text-yellow-600 font-medium whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{row.pending}</TableCell>
                            <TableCell className={cn("text-right font-semibold whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>
                              <span className={getProductivityColor(pct)}>{pct}%</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <tfoot className="bg-background border-t sticky bottom-0 z-10">
                      <TableRow>
                        <TableCell className={cn("font-semibold whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Total ({singleUserData.length} days)</TableCell>
                        <TableCell className={cn("text-right font-bold text-blue-600 whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{singleUserTotals.planned}</TableCell>
                        <TableCell className={cn("text-right font-bold text-green-600 whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{singleUserTotals.productive}</TableCell>
                        <TableCell className={cn("text-right font-bold text-orange-600 whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{singleUserTotals.unproductive}</TableCell>
                        <TableCell className={cn("text-right font-bold text-yellow-600 whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{singleUserTotals.pending}</TableCell>
                        <TableCell className={cn("text-right font-bold text-primary whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{singleUserTotals.avgProductivity}%</TableCell>
                      </TableRow>
                    </tfoot>
                  </table>
                ) : (
                  // Multi-user: User-wise summary
                  <table className={cn("w-full caption-bottom", isMobile ? "text-[9px]" : "text-sm")}>
                    <thead className="sticky top-0 bg-muted z-20">
                      <TableRow className="border-b">
                        <TableHead className={cn("whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>User</TableHead>
                        <TableHead className={cn("text-right whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Productivity %</TableHead>
                        <TableHead className={cn("text-right whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Planned</TableHead>
                        <TableHead className={cn("text-right whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Productive</TableHead>
                        <TableHead className={cn("text-right whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Unproductive</TableHead>
                        <TableHead className={cn("text-right whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Pending</TableHead>
                        <TableHead className={cn(isMobile ? "w-6 py-1 px-1" : "w-8 py-1.5")}></TableHead>
                      </TableRow>
                    </thead>
                    <TableBody>
                      {userSummaries.map((row, index) => (
                        <TableRow
                          key={index}
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => setSelectedUserForDrilldown(row.full_name)}
                        >
                          <TableCell className={cn("font-medium whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{row.full_name}</TableCell>
                          <TableCell className={cn("text-right font-semibold whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>
                            <span className={getProductivityColor(row.productivity_percentage)}>{row.productivity_percentage}%</span>
                          </TableCell>
                          <TableCell className={cn("text-right text-blue-600 font-medium whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{row.planned_visits}</TableCell>
                          <TableCell className={cn("text-right text-green-600 font-medium whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{row.productive_visits}</TableCell>
                          <TableCell className={cn("text-right text-orange-600 font-medium whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{row.unproductive_visits}</TableCell>
                          <TableCell className={cn("text-right text-yellow-600 font-medium whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{row.pending_visits}</TableCell>
                          <TableCell className={cn(isMobile ? "py-1 px-1" : "py-1.5")}>
                            <ChevronRight className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "text-muted-foreground")} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot className="bg-background border-t sticky bottom-0 z-10">
                      <TableRow>
                        <TableCell className={cn("font-semibold whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>Total ({multiUserTotals.usersCount} users)</TableCell>
                        <TableCell className={cn("text-right font-bold text-primary whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{multiUserTotals.avgProductivity}%</TableCell>
                        <TableCell className={cn("text-right font-bold text-blue-600 whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{multiUserTotals.planned}</TableCell>
                        <TableCell className={cn("text-right font-bold text-green-600 whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{multiUserTotals.productive}</TableCell>
                        <TableCell className={cn("text-right font-bold text-orange-600 whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{multiUserTotals.unproductive}</TableCell>
                        <TableCell className={cn("text-right font-bold text-yellow-600 whitespace-nowrap", isMobile ? "py-1 px-2" : "py-1.5")}>{multiUserTotals.pending}</TableCell>
                        <TableCell className={cn(isMobile ? "py-1 px-1" : "py-1.5")}></TableCell>
                      </TableRow>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No productivity data found for the selected filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day-wise Drilldown Dialog for Multi-user mode */}
      <Dialog open={!!selectedUserForDrilldown} onOpenChange={() => setSelectedUserForDrilldown(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Day-wise Productivity - {selectedUserForDrilldown}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg">
            {drilldownData.length > 0 ? (
              <table className="w-full caption-bottom text-sm">
                <TableHeader className="sticky top-0 bg-muted/50 z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Productive</TableHead>
                    <TableHead className="text-right">Unproductive</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Productivity %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldownData.map((row, index) => {
                    const pct = row.planned > 0 ? Math.round((row.productive / row.planned) * 100 * 100) / 100 : 0;
                    return (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{row.displayDate}</TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">{row.planned}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{row.productive}</TableCell>
                        <TableCell className="text-right text-orange-600 font-medium">{row.unproductive}</TableCell>
                        <TableCell className="text-right text-yellow-600 font-medium">{row.pending}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={getProductivityColor(pct)}>{pct}%</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <tfoot className="bg-muted/30 sticky bottom-0">
                  <TableRow>
                    <TableCell className="font-semibold">Total ({drilldownData.length} days)</TableCell>
                    <TableCell className="text-right font-bold text-blue-600">{drilldownTotals.planned}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{drilldownTotals.productive}</TableCell>
                    <TableCell className="text-right font-bold text-orange-600">{drilldownTotals.unproductive}</TableCell>
                    <TableCell className="text-right font-bold text-yellow-600">{drilldownTotals.pending}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{drilldownTotals.avgProductivity}%</TableCell>
                  </TableRow>
                </tfoot>
              </table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No data available for this user
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
