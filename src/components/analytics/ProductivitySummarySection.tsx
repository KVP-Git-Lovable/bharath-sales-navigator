import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Activity, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

interface ProductivityData {
  full_name: string;
  planned_date: string;
  productive_visits: number;
  unproductive_visits: number;
  total_visits: number;
  productivity_percentage: number;
}

interface UserProductivitySummary {
  full_name: string;
  planned_visits: number;
  productive_visits: number;
  unproductive_visits: number;
  total_visits: number;
  productivity_percentage: number;
  days_count: number;
}

interface ProductivitySummarySectionProps {
  selectedUsers: string[];
  dateRange: { from: Date; to: Date };
  allUsers?: { id: string; full_name: string | null }[];
  onDataLoaded?: (data: { full_name: string; productivity_percentage: number; productive_visits: number; total_visits: number }[]) => void;
}

export const ProductivitySummarySection = ({ selectedUsers, dateRange, allUsers = [], onDataLoaded }: ProductivitySummarySectionProps) => {
  const [loading, setLoading] = useState(false);
  const [productivityData, setProductivityData] = useState<ProductivityData[]>([]);
  const [plannedVisitsData, setPlannedVisitsData] = useState<Record<string, number>>({});
  const [selectedUserForDrilldown, setSelectedUserForDrilldown] = useState<string | null>(null);

  // Determine if we're in single-user or multi-user mode
  // When selectedUsers is empty, it means "All Users" - so we fetch all
  const effectiveUsers = selectedUsers.length === 0 
    ? [...new Set(allUsers.map(u => u.full_name).filter((name): name is string => !!name))]
    : selectedUsers;
  
  const isSingleUserMode = effectiveUsers.length === 1;
  const hasNoData = effectiveUsers.length === 0 && allUsers.length === 0;

  // Fetch productivity data for all selected users
  const fetchProductivityData = async () => {
    if (hasNoData) {
      setProductivityData([]);
      setPlannedVisitsData({});
      return;
    }

    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch productivity summary data for all effective users in parallel
      const promises = effectiveUsers.map(userName => 
        supabase.rpc('get_productivity_summary', {
          user_full_name: userName,
          start_date: fromDate,
          end_date: toDate
        })
      );

      const results = await Promise.all(promises);
      
      // Combine all results
      const allData: ProductivityData[] = [];
      results.forEach((result, index) => {
        if (result.data && result.data.length > 0) {
          allData.push(...result.data);
        }
      });

      setProductivityData(allData);

      // Fetch planned visits count separately (all visits including 'planned' status)
      // Get user IDs for the effective users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('full_name', effectiveUsers);

      if (profilesData && profilesData.length > 0) {
        const userIdMap: Record<string, string> = {};
        profilesData.forEach(p => {
          if (p.full_name) userIdMap[p.id] = p.full_name;
        });

        // Fetch all visits (including planned, productive, unproductive) to count total planned
        const { data: visitsData } = await supabase
          .from('visits')
          .select('user_id')
          .in('user_id', Object.keys(userIdMap))
          .gte('planned_date', fromDate)
          .lte('planned_date', toDate);

        // Count visits per user
        const plannedCounts: Record<string, number> = {};
        visitsData?.forEach(visit => {
          const userName = userIdMap[visit.user_id];
          if (userName) {
            plannedCounts[userName] = (plannedCounts[userName] || 0) + 1;
          }
        });
        setPlannedVisitsData(plannedCounts);
      }
    } catch (error) {
      console.error('Error in productivity fetch:', error);
      setProductivityData([]);
      setPlannedVisitsData({});
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when props change
  useEffect(() => {
    fetchProductivityData();
  }, [effectiveUsers.join(','), dateRange.from, dateRange.to]);

  // Group data by user for multi-user mode
  const userSummaries = useMemo((): UserProductivitySummary[] => {
    const grouped: Record<string, UserProductivitySummary> = {};
    
    productivityData.forEach(row => {
      if (!grouped[row.full_name]) {
        grouped[row.full_name] = {
          full_name: row.full_name,
          planned_visits: plannedVisitsData[row.full_name] || 0,
          productive_visits: 0,
          unproductive_visits: 0,
          total_visits: 0,
          productivity_percentage: 0,
          days_count: 0
        };
      }
      grouped[row.full_name].productive_visits += row.productive_visits;
      grouped[row.full_name].unproductive_visits += row.unproductive_visits;
      grouped[row.full_name].total_visits += row.total_visits;
      grouped[row.full_name].days_count += 1;
    });

    // Calculate productivity percentage for each user (based on planned visits if available)
    Object.values(grouped).forEach(user => {
      // Use planned visits as denominator if available, otherwise use total_visits
      const denominator = user.planned_visits > 0 ? user.planned_visits : user.total_visits;
      user.productivity_percentage = denominator > 0 
        ? Math.round((user.productive_visits / denominator) * 100 * 100) / 100 
        : 0;
    });

    return Object.values(grouped).sort((a, b) => b.productivity_percentage - a.productivity_percentage);
  }, [productivityData, plannedVisitsData]);

  // Notify parent when data is loaded
  // Note: Removed onDataLoaded from deps to prevent infinite loops when parent doesn't memoize callback
  useEffect(() => {
    if (onDataLoaded && userSummaries.length > 0) {
      onDataLoaded(userSummaries.map(u => ({
        full_name: u.full_name,
        productivity_percentage: u.productivity_percentage,
        productive_visits: u.productive_visits,
        total_visits: u.total_visits
      })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSummaries]);

  // Get day-wise data for selected user in drilldown
  const drilldownData = useMemo(() => {
    if (!selectedUserForDrilldown) return [];
    return productivityData
      .filter(row => row.full_name === selectedUserForDrilldown)
      .sort((a, b) => a.planned_date.localeCompare(b.planned_date));
  }, [productivityData, selectedUserForDrilldown]);

  // Calculate totals for single-user view
  const singleUserTotals = useMemo(() => {
    const data = isSingleUserMode ? productivityData : [];
    const totalProductive = data.reduce((sum, row) => sum + row.productive_visits, 0);
    const totalUnproductive = data.reduce((sum, row) => sum + row.unproductive_visits, 0);
    const totalVisits = data.reduce((sum, row) => sum + row.total_visits, 0);
    const avgProductivity = totalVisits > 0 ? Math.round((totalProductive / totalVisits) * 100 * 100) / 100 : 0;
    
    return {
      productive: totalProductive,
      unproductive: totalUnproductive,
      total: totalVisits,
      avgProductivity
    };
  }, [productivityData, isSingleUserMode]);

  // Calculate totals for multi-user view
  const multiUserTotals = useMemo(() => {
    const totalPlanned = userSummaries.reduce((sum, row) => sum + row.planned_visits, 0);
    const totalProductive = userSummaries.reduce((sum, row) => sum + row.productive_visits, 0);
    const totalUnproductive = userSummaries.reduce((sum, row) => sum + row.unproductive_visits, 0);
    const totalVisits = userSummaries.reduce((sum, row) => sum + row.total_visits, 0);
    const avgProductivity = totalPlanned > 0 
      ? Math.round((totalProductive / totalPlanned) * 100 * 100) / 100 
      : (totalVisits > 0 ? Math.round((totalProductive / totalVisits) * 100 * 100) / 100 : 0);
    
    return {
      planned: totalPlanned,
      productive: totalProductive,
      unproductive: totalUnproductive,
      total: totalVisits,
      avgProductivity,
      usersCount: userSummaries.length
    };
  }, [userSummaries]);

  // Calculate drilldown totals
  const drilldownTotals = useMemo(() => {
    const totalProductive = drilldownData.reduce((sum, row) => sum + row.productive_visits, 0);
    const totalUnproductive = drilldownData.reduce((sum, row) => sum + row.unproductive_visits, 0);
    const totalVisits = drilldownData.reduce((sum, row) => sum + row.total_visits, 0);
    const avgProductivity = totalVisits > 0 ? Math.round((totalProductive / totalVisits) * 100 * 100) / 100 : 0;
    
    return {
      productive: totalProductive,
      unproductive: totalUnproductive,
      total: totalVisits,
      avgProductivity
    };
  }, [drilldownData]);

  const getProductivityColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const scrollViewportClassName = cn(
    (productivityData.length > 6 && isSingleUserMode) && 'max-h-[320px]',
    (userSummaries.length > 6 && !isSingleUserMode) && 'max-h-[320px]'
  );

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
                  hasNoData ? 'Loading users...' : 
                  isSingleUserMode ? effectiveUsers[0] : 
                  `${effectiveUsers.length} users`
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
          ) : productivityData.length > 0 ? (
            <ScrollAreaPrimitive.Root
              type="always"
              className="relative border rounded-lg"
            >
              <ScrollAreaPrimitive.Viewport
                className={cn('w-full', scrollViewportClassName)}
              >
                <div className="min-w-max">
                  {isSingleUserMode ? (
                // Single user: Day-wise breakdown (original view)
                <table className="w-full caption-bottom text-sm">
                  <thead className="sticky top-0 bg-muted z-20">
                    <TableRow className="border-b">
                      <TableHead className="py-1.5">Date</TableHead>
                      <TableHead className="text-right py-1.5">Productive</TableHead>
                      <TableHead className="text-right py-1.5">Unproductive</TableHead>
                      <TableHead className="text-right py-1.5">Total</TableHead>
                      <TableHead className="text-right py-1.5">Productivity %</TableHead>
                    </TableRow>
                  </thead>
                  <TableBody>
                    {productivityData.map((row, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="font-medium py-1.5">{row.planned_date}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium py-1.5">
                          {row.productive_visits}
                        </TableCell>
                        <TableCell className="text-right text-orange-600 font-medium py-1.5">
                          {row.unproductive_visits}
                        </TableCell>
                        <TableCell className="text-right font-medium py-1.5">
                          {row.total_visits}
                        </TableCell>
                        <TableCell className="text-right font-semibold py-1.5">
                          <span className={getProductivityColor(row.productivity_percentage)}>
                            {row.productivity_percentage}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot className="bg-background border-t sticky bottom-0 z-10">
                    <TableRow>
                      <TableCell className="font-semibold py-1.5">Total ({productivityData.length} days)</TableCell>
                      <TableCell className="text-right font-bold text-green-600 py-1.5">
                        {singleUserTotals.productive}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600 py-1.5">
                        {singleUserTotals.unproductive}
                      </TableCell>
                      <TableCell className="text-right font-bold py-1.5">
                        {singleUserTotals.total}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary py-1.5">
                        {singleUserTotals.avgProductivity}%
                      </TableCell>
                    </TableRow>
                  </tfoot>
                </table>
              ) : (
                // Multi-user: User-wise summary (click to drill down)
                <table className="w-full caption-bottom text-sm">
                  <thead className="sticky top-0 bg-muted z-20">
                    <TableRow className="border-b">
                      <TableHead className="py-1.5">User</TableHead>
                      <TableHead className="text-right py-1.5">Productivity %</TableHead>
                      <TableHead className="text-right py-1.5">Planned</TableHead>
                      <TableHead className="text-right py-1.5">Productive</TableHead>
                      <TableHead className="text-right py-1.5">Unproductive</TableHead>
                      <TableHead className="text-right py-1.5">Total</TableHead>
                      <TableHead className="w-8 py-1.5"></TableHead>
                    </TableRow>
                  </thead>
                  <TableBody>
                    {userSummaries.map((row, index) => (
                      <TableRow 
                        key={index} 
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelectedUserForDrilldown(row.full_name)}
                      >
                        <TableCell className="font-medium py-1.5">{row.full_name}</TableCell>
                        <TableCell className="text-right font-semibold py-1.5">
                          <span className={getProductivityColor(row.productivity_percentage)}>
                            {row.productivity_percentage}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-medium py-1.5">
                          {row.planned_visits}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium py-1.5">
                          {row.productive_visits}
                        </TableCell>
                        <TableCell className="text-right text-orange-600 font-medium py-1.5">
                          {row.unproductive_visits}
                        </TableCell>
                        <TableCell className="text-right font-medium py-1.5">
                          {row.total_visits}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot className="bg-background border-t sticky bottom-0 z-10">
                    <TableRow>
                      <TableCell className="font-semibold py-1.5">Total ({multiUserTotals.usersCount} users)</TableCell>
                      <TableCell className="text-right font-bold text-primary py-1.5">
                        {multiUserTotals.avgProductivity}%
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600 py-1.5">
                        {multiUserTotals.planned}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600 py-1.5">
                        {multiUserTotals.productive}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600 py-1.5">
                        {multiUserTotals.unproductive}
                      </TableCell>
                      <TableCell className="text-right font-bold py-1.5">
                        {multiUserTotals.total}
                      </TableCell>
                      <TableCell className="py-1.5"></TableCell>
                    </TableRow>
                  </tfoot>
                </table>
              )}
                </div>
              </ScrollAreaPrimitive.Viewport>

              <ScrollAreaPrimitive.ScrollAreaScrollbar
                forceMount
                orientation="vertical"
                className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
              >
                <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
              </ScrollAreaPrimitive.ScrollAreaScrollbar>

              <ScrollAreaPrimitive.ScrollAreaScrollbar
                forceMount
                orientation="horizontal"
                className="flex touch-none select-none transition-colors h-2.5 flex-col border-t border-t-transparent p-[1px]"
              >
                <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
              </ScrollAreaPrimitive.ScrollAreaScrollbar>

              <ScrollAreaPrimitive.Corner />
            </ScrollAreaPrimitive.Root>
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
                    <TableHead className="text-right">Productive</TableHead>
                    <TableHead className="text-right">Unproductive</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Productivity %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldownData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{row.planned_date}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {row.productive_visits}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        {row.unproductive_visits}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.total_visits}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={getProductivityColor(row.productivity_percentage)}>
                          {row.productivity_percentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot className="bg-muted/30 sticky bottom-0">
                  <TableRow>
                    <TableCell className="font-semibold">Total ({drilldownData.length} days)</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {drilldownTotals.productive}
                    </TableCell>
                    <TableCell className="text-right font-bold text-orange-600">
                      {drilldownTotals.unproductive}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {drilldownTotals.total}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {drilldownTotals.avgProductivity}%
                    </TableCell>
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
