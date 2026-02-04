import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Clock, Store, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

interface AttendanceData {
  user_id: string;
  full_name: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  working_hours: number;
}

interface RetailerTimeData {
  user_id: string;
  full_name: string;
  date: string;
  retailer_hours: number;
}

interface UserSummary {
  full_name: string;
  user_id: string;
  avg_working_hours: number;
  avg_retailer_hours: number;
  days_count: number;
}

interface AttendanceMarketHoursSectionProps {
  selectedUsers: string[];
  dateRange: { from: Date; to: Date };
  allUsers?: { id: string; full_name: string | null }[];
}

export const AttendanceMarketHoursSection = ({ 
  selectedUsers, 
  dateRange, 
  allUsers = [] 
}: AttendanceMarketHoursSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [retailerTimeData, setRetailerTimeData] = useState<RetailerTimeData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'working' | 'retailer' | null>(null);
  const [selectedUserForDrilldown, setSelectedUserForDrilldown] = useState<string | null>(null);

  // Determine effective users
  const effectiveUserIds = useMemo(() => {
    if (selectedUsers.length === 0) {
      return allUsers.map(u => u.id);
    }
    return selectedUsers;
  }, [selectedUsers, allUsers]);

  const isSingleUserMode = effectiveUserIds.length === 1;

  // Fetch data
  const fetchData = async () => {
    if (effectiveUserIds.length === 0) {
      setAttendanceData([]);
      setRetailerTimeData([]);
      return;
    }

    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch attendance data
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('user_id, date, check_in_time, check_out_time')
        .in('user_id', effectiveUserIds)
        .gte('date', fromDate)
        .lte('date', toDate)
        .not('check_in_time', 'is', null);

      if (attError) {
        console.error('Error fetching attendance:', attError);
        setAttendanceData([]);
      } else {
        // Get user names
        const userNames: Record<string, string> = {};
        allUsers.forEach(u => {
          if (u.full_name) userNames[u.id] = u.full_name;
        });

        const processedAttendance: AttendanceData[] = (attendance || []).map(record => {
          let workingHours = 0;
          if (record.check_in_time && record.check_out_time) {
            const checkIn = new Date(record.check_in_time);
            const checkOut = new Date(record.check_out_time);
            workingHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          }
          return {
            user_id: record.user_id,
            full_name: userNames[record.user_id] || 'Unknown',
            date: record.date,
            check_in_time: record.check_in_time,
            check_out_time: record.check_out_time,
            working_hours: Math.max(0, workingHours)
          };
        });
        setAttendanceData(processedAttendance);
      }

      // Fetch retailer visit logs for time at retailers
      // Only require start_time (matching TodaySummary logic)
      const { data: visitLogs, error: visitError } = await supabase
        .from('retailer_visit_logs')
        .select('user_id, visit_date, start_time')
        .in('user_id', effectiveUserIds)
        .gte('visit_date', fromDate)
        .lte('visit_date', toDate)
        .not('start_time', 'is', null);

      if (visitError) {
        console.error('Error fetching visit logs:', visitError);
        setRetailerTimeData([]);
      } else {
        // Get user names
        const userNames: Record<string, string> = {};
        allUsers.forEach(u => {
          if (u.full_name) userNames[u.id] = u.full_name;
        });

        // Group by user and date, then calculate time as span from first to last start_time
        // This matches TodaySummary logic exactly
        const dateUserMap: Record<string, { 
          user_id: string; 
          full_name: string; 
          date: string; 
          startTimes: number[] 
        }> = {};
        
        (visitLogs || []).forEach(log => {
          if (!log.start_time) return;
          
          const key = `${log.user_id}_${log.visit_date}`;
          if (!dateUserMap[key]) {
            dateUserMap[key] = {
              user_id: log.user_id,
              full_name: userNames[log.user_id] || 'Unknown',
              date: log.visit_date,
              startTimes: []
            };
          }
          
          // Store the start_time timestamp
          const startTime = new Date(log.start_time).getTime();
          dateUserMap[key].startTimes.push(startTime);
        });

        // Calculate retailer hours as span from first to last start_time (matching TodaySummary)
        const processedRetailerTime: RetailerTimeData[] = Object.values(dateUserMap).map(item => {
          let retailerHours = 0;
          
          if (item.startTimes.length >= 2) {
            // Find earliest and latest start times
            const earliestStart = Math.min(...item.startTimes);
            const latestStart = Math.max(...item.startTimes);
            
            // Time at retailers = span from first visit to last visit
            retailerHours = (latestStart - earliestStart) / (1000 * 60 * 60);
          }
          // If only 1 visit, retailer hours = 0 (no span)
          
          return {
            user_id: item.user_id,
            full_name: item.full_name,
            date: item.date,
            retailer_hours: Math.max(0, retailerHours)
          };
        });
        
        setRetailerTimeData(processedRetailerTime);
      }
    } catch (error) {
      console.error('Error fetching attendance/market data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [effectiveUserIds.join(','), dateRange.from, dateRange.to]);

  // Calculate user summaries
  const userSummaries = useMemo((): UserSummary[] => {
    const summaryMap: Record<string, {
      full_name: string;
      user_id: string;
      totalWorkingHours: number;
      totalRetailerHours: number;
      workingDays: Set<string>;
      retailerDays: Set<string>;
    }> = {};

    // Process attendance data
    attendanceData.forEach(record => {
      if (!summaryMap[record.user_id]) {
        summaryMap[record.user_id] = {
          full_name: record.full_name,
          user_id: record.user_id,
          totalWorkingHours: 0,
          totalRetailerHours: 0,
          workingDays: new Set(),
          retailerDays: new Set()
        };
      }
      summaryMap[record.user_id].totalWorkingHours += record.working_hours;
      summaryMap[record.user_id].workingDays.add(record.date);
    });

    // Process retailer time data
    retailerTimeData.forEach(record => {
      if (!summaryMap[record.user_id]) {
        summaryMap[record.user_id] = {
          full_name: record.full_name,
          user_id: record.user_id,
          totalWorkingHours: 0,
          totalRetailerHours: 0,
          workingDays: new Set(),
          retailerDays: new Set()
        };
      }
      summaryMap[record.user_id].totalRetailerHours += record.retailer_hours;
      summaryMap[record.user_id].retailerDays.add(record.date);
    });

    return Object.values(summaryMap).map(item => ({
      full_name: item.full_name,
      user_id: item.user_id,
      avg_working_hours: item.workingDays.size > 0 
        ? Math.round((item.totalWorkingHours / item.workingDays.size) * 100) / 100 
        : 0,
      avg_retailer_hours: item.retailerDays.size > 0 
        ? Math.round((item.totalRetailerHours / item.retailerDays.size) * 100) / 100 
        : 0,
      days_count: Math.max(item.workingDays.size, item.retailerDays.size)
    })).sort((a, b) => b.avg_working_hours - a.avg_working_hours);
  }, [attendanceData, retailerTimeData]);

  // Overall averages
  const overallAverages = useMemo(() => {
    const totalWorkingHours = userSummaries.reduce((sum, u) => sum + u.avg_working_hours, 0);
    const totalRetailerHours = userSummaries.reduce((sum, u) => sum + u.avg_retailer_hours, 0);
    const userCount = userSummaries.length;
    
    return {
      avgWorkingHours: userCount > 0 ? Math.round((totalWorkingHours / userCount) * 100) / 100 : 0,
      avgRetailerHours: userCount > 0 ? Math.round((totalRetailerHours / userCount) * 100) / 100 : 0,
      userCount
    };
  }, [userSummaries]);

  // Get drilldown data for selected user
  const drilldownData = useMemo(() => {
    if (!selectedUserForDrilldown) return [];
    
    const userAttendance = attendanceData.filter(a => a.full_name === selectedUserForDrilldown);
    const userRetailer = retailerTimeData.filter(r => r.full_name === selectedUserForDrilldown);
    
    // Combine by date
    const dateMap: Record<string, { date: string; working_hours: number; retailer_hours: number }> = {};
    
    userAttendance.forEach(a => {
      if (!dateMap[a.date]) {
        dateMap[a.date] = { date: a.date, working_hours: 0, retailer_hours: 0 };
      }
      dateMap[a.date].working_hours = a.working_hours;
    });
    
    userRetailer.forEach(r => {
      if (!dateMap[r.date]) {
        dateMap[r.date] = { date: r.date, working_hours: 0, retailer_hours: 0 };
      }
      dateMap[r.date].retailer_hours = r.retailer_hours;
    });
    
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedUserForDrilldown, attendanceData, retailerTimeData]);

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const scrollViewportClassName = cn(
    userSummaries.length > 6 && 'max-h-[320px]'
  );

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base sm:text-lg md:text-xl">Attendance & Market Hours</CardTitle>
              <p className="text-sm text-muted-foreground">
                Average working hours and time at retailers • {
                  isSingleUserMode ? userSummaries[0]?.full_name || 'Loading...' : 
                  `${userSummaries.length} users`
                } • {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-muted-foreground">Loading attendance data...</p>
            </div>
          ) : userSummaries.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Cards - Dark Mode Style */}
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md bg-primary text-primary-foreground",
                    selectedMetric === 'working' && "ring-2 ring-primary-foreground"
                  )}
                  onClick={() => setSelectedMetric(selectedMetric === 'working' ? null : 'working')}
                >
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock className="h-5 w-5" />
                      <span className="text-sm opacity-90">Avg. Working Hours</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatHours(overallAverages.avgWorkingHours)}
                    </div>
                    <p className="text-xs opacity-75 mt-1">
                      Between Start & End time
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md bg-primary text-primary-foreground",
                    selectedMetric === 'retailer' && "ring-2 ring-primary-foreground"
                  )}
                  onClick={() => setSelectedMetric(selectedMetric === 'retailer' ? null : 'retailer')}
                >
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Store className="h-5 w-5" />
                      <span className="text-sm opacity-90">Avg. Time at Retailers</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatHours(overallAverages.avgRetailerHours)}
                    </div>
                    <p className="text-xs opacity-75 mt-1">
                      Time spent at stores
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Table */}
              {(selectedMetric || !isSingleUserMode) && (
                <ScrollAreaPrimitive.Root
                  type="always"
                  className="relative border rounded-lg"
                >
                  <ScrollAreaPrimitive.Viewport
                    className={cn('w-full', scrollViewportClassName)}
                  >
                    <div className="min-w-max">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="sticky top-0 bg-muted z-20">
                          <TableRow className="border-b">
                            <TableHead className="py-1.5">{isSingleUserMode ? 'Date' : 'User'}</TableHead>
                            <TableHead className="text-right py-1.5">Working Hours</TableHead>
                            <TableHead className="text-right py-1.5">Time at Retailers</TableHead>
                            {!isSingleUserMode && <TableHead className="text-right py-1.5">Days</TableHead>}
                            {!isSingleUserMode && <TableHead className="w-8 py-1.5"></TableHead>}
                          </TableRow>
                        </thead>
                        <TableBody>
                          {isSingleUserMode ? (
                            // Single user: show day-wise breakdown
                            drilldownData.length > 0 ? drilldownData.map((row, index) => (
                              <TableRow key={index} className="hover:bg-muted/30">
                                <TableCell className="font-medium py-1.5">{format(new Date(row.date), 'dd-MM-yyyy')}</TableCell>
                                <TableCell className="text-right text-blue-600 font-medium py-1.5">
                                  {formatHours(row.working_hours)}
                                </TableCell>
                                <TableCell className="text-right text-green-600 font-medium py-1.5">
                                  {formatHours(row.retailer_hours)}
                                </TableCell>
                              </TableRow>
                            )) : attendanceData.filter(a => effectiveUserIds.includes(a.user_id)).map((row, index) => (
                              <TableRow key={index} className="hover:bg-muted/30">
                                <TableCell className="font-medium py-1.5">{format(new Date(row.date), 'dd-MM-yyyy')}</TableCell>
                                <TableCell className="text-right text-blue-600 font-medium py-1.5">
                                  {formatHours(row.working_hours)}
                                </TableCell>
                                <TableCell className="text-right text-green-600 font-medium py-1.5">
                                  {formatHours(retailerTimeData.find(r => r.user_id === row.user_id && r.date === row.date)?.retailer_hours || 0)}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            // Multi-user: show user-wise summary
                            userSummaries.map((row, index) => (
                              <TableRow 
                                key={index} 
                                className="hover:bg-muted/30 cursor-pointer"
                                onClick={() => setSelectedUserForDrilldown(row.full_name)}
                              >
                                <TableCell className="font-medium py-1.5">{row.full_name}</TableCell>
                                <TableCell className="text-right text-blue-600 font-medium py-1.5">
                                  {formatHours(row.avg_working_hours)}
                                </TableCell>
                                <TableCell className="text-right text-green-600 font-medium py-1.5">
                                  {formatHours(row.avg_retailer_hours)}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground py-1.5">
                                  {row.days_count}
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                        <tfoot className="bg-background border-t sticky bottom-0 z-10">
                          <TableRow>
                            <TableCell className="font-semibold py-1.5">
                              {isSingleUserMode ? `Total (${attendanceData.filter(a => effectiveUserIds.includes(a.user_id)).length} days)` : `Average (${userSummaries.length} users)`}
                            </TableCell>
                            <TableCell className="text-right font-bold text-blue-600 py-1.5">
                              {formatHours(overallAverages.avgWorkingHours)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600 py-1.5">
                              {formatHours(overallAverages.avgRetailerHours)}
                            </TableCell>
                            {!isSingleUserMode && <TableCell className="py-1.5"></TableCell>}
                            {!isSingleUserMode && <TableCell className="py-1.5"></TableCell>}
                          </TableRow>
                        </tfoot>
                      </table>
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
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No attendance data found for the selected filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day-wise Drilldown Dialog for Multi-user mode */}
      <Dialog open={!!selectedUserForDrilldown} onOpenChange={() => setSelectedUserForDrilldown(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Day-wise Hours - {selectedUserForDrilldown}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg">
            {drilldownData.length > 0 ? (
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 bg-muted z-20">
                  <TableRow className="border-b">
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Working Hours</TableHead>
                    <TableHead className="text-right">Time at Retailers</TableHead>
                  </TableRow>
                </thead>
                <TableBody>
                  {drilldownData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{format(new Date(row.date), 'dd-MM-yyyy')}</TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        {formatHours(row.working_hours)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatHours(row.retailer_hours)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot className="bg-muted/30 sticky bottom-0">
                  <TableRow>
                    <TableCell className="font-semibold">Average ({drilldownData.length} days)</TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {formatHours(
                        drilldownData.reduce((sum, r) => sum + r.working_hours, 0) / drilldownData.length
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatHours(
                        drilldownData.reduce((sum, r) => sum + r.retailer_hours, 0) / drilldownData.length
                      )}
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
