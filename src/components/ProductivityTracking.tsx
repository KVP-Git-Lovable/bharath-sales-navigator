import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Download, CalendarIcon, TableIcon, LayoutGrid, ExternalLink, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subDays, subWeeks, subMonths, subQuarters, isSameDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
// xlsx loaded dynamically in handler

interface ProductivityData {
  user_id: string;
  user_name: string;
  beat_name: string;
  date: string;
  orders_count: number;
  total_order_value: number;
  daily_allowance: number;
  travel_allowance: number;
  total_allowance: number;
  productivity_ratio: number;
}

const ProductivityTracking = () => {
  const [productivityData, setProductivityData] = useState<ProductivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [sortBy, setSortBy] = useState('productivity_ratio');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const navigate = useNavigate();

  const getDateRange = () => {
    const today = new Date();
    
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'current_week':
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case 'last_week':
        const lastWeekStart = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
        return { start: lastWeekStart, end: endOfWeek(lastWeekStart, { weekStartsOn: 1 }) };
      case 'current_month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'last_month':
        const lastMonthStart = subMonths(startOfMonth(today), 1);
        return { start: lastMonthStart, end: endOfMonth(lastMonthStart) };
      case 'current_quarter':
        return { start: startOfQuarter(today), end: endOfQuarter(today) };
      case 'previous_quarter':
        const prevQuarterStart = subQuarters(startOfQuarter(today), 1);
        return { start: prevQuarterStart, end: endOfQuarter(prevQuarterStart) };
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          return { start: startOfDay(customDateRange.from), end: endOfDay(customDateRange.to) };
        }
        return { start: startOfDay(today), end: endOfDay(today) };
      default:
        return { start: startOfDay(today), end: endOfDay(today) };
    }
  };

  const fetchProductivityData = async () => {
    try {
      setLoading(true);
      
      const { start, end } = getDateRange();

      // Fetch orders in date range
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total_amount, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (ordersError) throw ordersError;

      // Fetch beat plans to get beat names
      const { data: beatPlansData, error: beatPlansError } = await supabase
        .from('beat_plans')
        .select('user_id, beat_name, plan_date')
        .gte('plan_date', format(start, 'yyyy-MM-dd'))
        .lte('plan_date', format(end, 'yyyy-MM-dd'));

      if (beatPlansError) throw beatPlansError;

      // Create beat name map by user and date
      const beatNameMap = new Map<string, string>();
      (beatPlansData || []).forEach((bp: any) => {
        const key = `${bp.user_id}_${bp.plan_date}`;
        beatNameMap.set(key, bp.beat_name);
      });

      // Fetch beats for travel allowance
      const { data: beatsData, error: beatsError } = await supabase
        .from('beats')
        .select('beat_name, travel_allowance');

      if (beatsError) throw beatsError;

      // Create travel allowance map by beat name
      const travelAllowanceMap = new Map<string, number>();
      (beatsData || []).forEach((b: any) => {
        travelAllowanceMap.set(b.beat_name, b.travel_allowance || 0);
      });

      // Fetch expense master config for DA
      const { data: configData } = await supabase
        .from('expense_master_config')
        .select('da_amount, ta_type, fixed_ta_amount')
        .single();

      const daAmount = configData?.da_amount || 0;
      const taType = configData?.ta_type || 'from_beat';
      const fixedTaAmount = configData?.fixed_ta_amount || 0;

      // Fetch profiles for user names
      const userIds = Array.from(new Set((ordersData || []).map((o: any) => o.user_id)));
      let nameMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        nameMap = Object.fromEntries((profilesData as any[] | null)?.map((p: any) => [p.id, p.full_name]) || []);
      }

      // Group data by user and date
      const groupedData = new Map<string, ProductivityData>();

      (ordersData as any[] | null)?.forEach((order: any) => {
        const userId = order.user_id as string;
        const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd');
        const key = `${userId}_${orderDate}`;

        if (!groupedData.has(key)) {
          const beatName = beatNameMap.get(key) || '-';
          const travelAllowance = taType === 'fixed' 
            ? fixedTaAmount 
            : (travelAllowanceMap.get(beatName) || 0);
          const totalAllowance = daAmount + travelAllowance;

          groupedData.set(key, {
            user_id: userId,
            user_name: nameMap[userId] || 'Unknown User',
            beat_name: beatName,
            date: orderDate,
            orders_count: 0,
            total_order_value: 0,
            daily_allowance: daAmount,
            travel_allowance: travelAllowance,
            total_allowance: totalAllowance,
            productivity_ratio: 0
          });
        }

        const existing = groupedData.get(key)!;
        existing.orders_count += 1;
        existing.total_order_value += Number(order.total_amount || 0);
        existing.productivity_ratio = existing.total_allowance > 0 
          ? existing.total_order_value / existing.total_allowance 
          : 0;
      });

      const dataArray = Array.from(groupedData.values());

      // Sort data
      dataArray.sort((a, b) => {
        switch (sortBy) {
          case 'productivity_ratio':
            return b.productivity_ratio - a.productivity_ratio;
          case 'orders_count':
            return b.orders_count - a.orders_count;
          case 'total_order_value':
            return b.total_order_value - a.total_order_value;
          case 'date':
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          default:
            return b.productivity_ratio - a.productivity_ratio;
        }
      });

      setProductivityData(dataArray);

    } catch (error) {
      console.error('Error fetching productivity data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch productivity data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductivityData();
  }, [dateFilter, sortBy, customDateRange]);

  const filteredData = productivityData.filter(item =>
    item.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.beat_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductivityColor = (ratio: number) => {
    if (ratio >= 5) return 'text-green-600 bg-green-50';
    if (ratio >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getProductivityLabel = (ratio: number) => {
    if (ratio >= 5) return 'Excellent';
    if (ratio >= 3) return 'Good';
    if (ratio >= 1) return 'Average';
    return 'Below Target';
  };

  const handleMoreDetails = (date: string) => {
    navigate(`/today-summary?date=${date}`);
  };

  const handleDownloadXLS = async () => {
    const XLSX = await import('xlsx');
    const exportData = filteredData.map(item => ({
      'User Name': item.user_name,
      'Beat Name': item.beat_name,
      'Date': format(new Date(item.date), 'MMM dd, yyyy'),
      'Orders': item.orders_count,
      'Order Value (₹)': item.total_order_value.toFixed(2),
      'DA (₹)': item.daily_allowance.toFixed(2),
      'TA (₹)': item.travel_allowance.toFixed(2),
      'Total Allowance (₹)': item.total_allowance.toFixed(2),
      'Productivity Ratio': item.productivity_ratio.toFixed(2),
      'Performance': getProductivityLabel(item.productivity_ratio)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productivity Report');
    XLSX.writeFile(wb, `Productivity_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: "Downloaded",
      description: "Productivity report downloaded successfully",
    });
  };

  // Get data for calendar view
  const getDataForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredData.filter(item => item.date === dateStr);
  };

  // Get dates that have data
  const datesWithData = new Set(filteredData.map(item => item.date));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Productivity Tracking</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* View Toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-r-none"
                >
                  <TableIcon className="h-4 w-4 mr-1" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="rounded-l-none"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Calendar
                </Button>
              </div>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-auto min-w-[140px] h-9 text-xs gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="current_week">Current Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="current_month">Current Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="current_quarter">Current Quarter</SelectItem>
                  <SelectItem value="previous_quarter">Previous Quarter</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range Picker */}
              {dateFilter === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {customDateRange.from ? (
                        customDateRange.to ? (
                          `${format(customDateRange.from, 'MMM dd')} - ${format(customDateRange.to, 'MMM dd')}`
                        ) : (
                          format(customDateRange.from, 'MMM dd, yyyy')
                        )
                      ) : (
                        'Pick dates'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: customDateRange.from, to: customDateRange.to }}
                      onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-auto min-w-[130px] h-9 text-xs gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="productivity_ratio">Productivity</SelectItem>
                  <SelectItem value="orders_count">Order Count</SelectItem>
                  <SelectItem value="total_order_value">Order Value</SelectItem>
                </SelectContent>
              </Select>

              {/* Download Button */}
              <Button variant="outline" size="sm" onClick={handleDownloadXLS}>
                <Download className="h-4 w-4 mr-1" />
                XLS
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user name or beat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {viewMode === 'table' ? (
              /* Table View */
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Beat</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Order Value</TableHead>
                      <TableHead>DA</TableHead>
                      <TableHead>TA</TableHead>
                      <TableHead>Total Allowance</TableHead>
                      <TableHead>Productivity</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No productivity data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item, index) => (
                        <TableRow key={`${item.user_id}_${item.date}_${index}`}>
                          <TableCell className="font-medium">{item.user_name}</TableCell>
                          <TableCell>{item.beat_name}</TableCell>
                          <TableCell>{format(new Date(item.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{item.orders_count}</TableCell>
                          <TableCell>₹{item.total_order_value.toFixed(2)}</TableCell>
                          <TableCell>₹{item.daily_allowance.toFixed(2)}</TableCell>
                          <TableCell>₹{item.travel_allowance.toFixed(2)}</TableCell>
                          <TableCell>₹{item.total_allowance.toFixed(2)}</TableCell>
                          <TableCell>{item.productivity_ratio.toFixed(2)}x</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProductivityColor(item.productivity_ratio)}`}>
                              {getProductivityLabel(item.productivity_ratio)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoreDetails(item.date)}
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              More details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              /* Calendar View */
              <div className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedCalendarDate}
                  onSelect={(date) => date && setSelectedCalendarDate(date)}
                  className="rounded-md border"
                  modifiers={{
                    hasData: (date) => datesWithData.has(format(date, 'yyyy-MM-dd'))
                  }}
                  modifiersStyles={{
                    hasData: { backgroundColor: 'hsl(var(--primary) / 0.1)', fontWeight: 'bold' }
                  }}
                />
                
                {/* Data for selected date */}
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">
                    Data for {format(selectedCalendarDate, 'MMM dd, yyyy')}
                  </h3>
                  {getDataForDate(selectedCalendarDate).length === 0 ? (
                    <p className="text-muted-foreground">No data for this date</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Beat</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead>Order Value</TableHead>
                            <TableHead>Allowance</TableHead>
                            <TableHead>Productivity</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getDataForDate(selectedCalendarDate).map((item, index) => (
                            <TableRow key={`cal_${item.user_id}_${index}`}>
                              <TableCell className="font-medium">{item.user_name}</TableCell>
                              <TableCell>{item.beat_name}</TableCell>
                              <TableCell>{item.orders_count}</TableCell>
                              <TableCell>₹{item.total_order_value.toFixed(2)}</TableCell>
                              <TableCell>₹{item.total_allowance.toFixed(2)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProductivityColor(item.productivity_ratio)}`}>
                                  {item.productivity_ratio.toFixed(2)}x
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoreDetails(item.date)}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  More details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductivityTracking;
