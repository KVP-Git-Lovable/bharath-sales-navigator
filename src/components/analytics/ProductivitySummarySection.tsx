import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Activity, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
}

export const ProductivitySummarySection = ({ selectedUsers, dateRange, allUsers = [] }: ProductivitySummarySectionProps) => {
  const [loading, setLoading] = useState(false);
  const [productivityData, setProductivityData] = useState<ProductivityData[]>([]);
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
      return;
    }

    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch data for all effective users in parallel
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
    } catch (error) {
      console.error('Error in productivity fetch:', error);
      setProductivityData([]);
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

    // Calculate productivity percentage for each user
    Object.values(grouped).forEach(user => {
      user.productivity_percentage = user.total_visits > 0 
        ? Math.round((user.productive_visits / user.total_visits) * 100 * 100) / 100 
        : 0;
    });

    return Object.values(grouped).sort((a, b) => b.total_visits - a.total_visits);
  }, [productivityData]);

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
    const totalProductive = userSummaries.reduce((sum, row) => sum + row.productive_visits, 0);
    const totalUnproductive = userSummaries.reduce((sum, row) => sum + row.unproductive_visits, 0);
    const totalVisits = userSummaries.reduce((sum, row) => sum + row.total_visits, 0);
    const avgProductivity = totalVisits > 0 ? Math.round((totalProductive / totalVisits) * 100 * 100) / 100 : 0;
    
    return {
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

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Productivity Summary</CardTitle>
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
            <div className={cn(
              "border rounded-lg overflow-hidden",
              productivityData.length > 6 && isSingleUserMode && "max-h-[320px] overflow-y-auto",
              userSummaries.length > 6 && !isSingleUserMode && "max-h-[320px] overflow-y-auto"
            )}>
              {isSingleUserMode ? (
                // Single user: Day-wise breakdown (original view)
                <Table>
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
                    {productivityData.map((row, index) => (
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
                      <TableCell className="font-semibold">Total ({productivityData.length} days)</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {singleUserTotals.productive}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        {singleUserTotals.unproductive}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {singleUserTotals.total}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {singleUserTotals.avgProductivity}%
                      </TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              ) : (
                // Multi-user: User-wise summary (click to drill down)
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50 z-10">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead className="text-right">Productive</TableHead>
                      <TableHead className="text-right">Unproductive</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Productivity %</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSummaries.map((row, index) => (
                      <TableRow 
                        key={index} 
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelectedUserForDrilldown(row.full_name)}
                      >
                        <TableCell className="font-medium">{row.full_name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.days_count}
                        </TableCell>
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
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot className="bg-muted/30 sticky bottom-0">
                    <TableRow>
                      <TableCell className="font-semibold">Total ({multiUserTotals.usersCount} users)</TableCell>
                      <TableCell className="text-right font-bold text-muted-foreground">-</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {multiUserTotals.productive}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        {multiUserTotals.unproductive}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {multiUserTotals.total}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {multiUserTotals.avgProductivity}%
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              )}
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
              <Table>
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
              </Table>
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
