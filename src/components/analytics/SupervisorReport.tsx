import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { RefreshCw, Calendar as CalendarIcon, X, Store, MapPin, Package, Scale } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface UserOrderSummary {
  full_name: string;
  total_order_value: number;
}

interface UserOrderDetails {
  order_date: string;
  beat_names: string;
  total_amount: number;
  invoice_count: number;
  retailers_count: number;
  products_count: number;
  total_kg: number;
}

interface UserProfile {
  id: string;
  full_name: string | null;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'];

export const SupervisorReport = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date()
  });
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<UserOrderSummary[]>([]);
  const [selectedUserDetails, setSelectedUserDetails] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserOrderDetails[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSummary, setDetailsSummary] = useState<{
    retailers: number;
    beats: number;
    products: number;
    totalKg: number;
  } | null>(null);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .not('full_name', 'is', null)
        .order('full_name');
      
      if (!error && data) {
        setUsers(data);
      }
    };
    fetchUsers();
  }, []);

  // Fetch summary data
  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      let query = supabase
        .from('orders')
        .select(`
          total_amount,
          user_id,
          profiles!inner(full_name)
        `)
        .gte('order_date', fromDate)
        .lte('order_date', toDate);

      if (selectedUser !== 'all') {
        query = query.ilike('profiles.full_name', `${selectedUser}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching supervisor report:', error);
        setSummaryData([]);
        return;
      }

      // Group by user and calculate totals
      const userTotals: Record<string, number> = {};
      data?.forEach((order: any) => {
        const userName = order.profiles?.full_name || 'Unknown';
        userTotals[userName] = (userTotals[userName] || 0) + Number(order.total_amount || 0);
      });

      // Convert to array and sort by total
      const summaryArray = Object.entries(userTotals)
        .map(([full_name, total_order_value]) => ({ full_name, total_order_value }))
        .sort((a, b) => b.total_order_value - a.total_order_value);

      setSummaryData(summaryArray);
      setSelectedUserDetails(null);
      setUserDetails([]);
      setDetailsSummary(null);
    } catch (error) {
      console.error('Error in supervisor report:', error);
      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user order details when a user is selected
  const fetchUserDetails = async (userName: string) => {
    setDetailsLoading(true);
    setSelectedUserDetails(userName);
    
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch orders with details
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_date,
          total_amount,
          retailer_id,
          retailers(beat_id, beats(beat_name)),
          order_items(product_id, quantity, products(unit))
        `)
        .gte('order_date', fromDate)
        .lte('order_date', toDate)
        .eq('profiles.full_name', userName);

      // Use a different approach - get user ID first
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', userName)
        .single();

      if (!userProfile) {
        setUserDetails([]);
        setDetailsSummary(null);
        setDetailsLoading(false);
        return;
      }

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_date,
          total_amount,
          retailer_id,
          retailers(id, beat_id, beats(beat_name)),
          order_items(product_id, quantity, products(unit))
        `)
        .eq('user_id', userProfile.id)
        .gte('order_date', fromDate)
        .lte('order_date', toDate)
        .order('order_date', { ascending: true });

      if (error) {
        console.error('Error fetching user details:', error);
        setUserDetails([]);
        setDetailsSummary(null);
        setDetailsLoading(false);
        return;
      }

      // Group by date
      const dateGroups: Record<string, {
        orders: any[];
        totalAmount: number;
        beats: Set<string>;
        retailers: Set<string>;
        products: Set<string>;
        totalKg: number;
      }> = {};

      let allRetailers = new Set<string>();
      let allBeats = new Set<string>();
      let allProducts = new Set<string>();
      let allTotalKg = 0;

      orders?.forEach((order: any) => {
        const dateKey = order.order_date;
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = {
            orders: [],
            totalAmount: 0,
            beats: new Set(),
            retailers: new Set(),
            products: new Set(),
            totalKg: 0
          };
        }

        dateGroups[dateKey].orders.push(order);
        dateGroups[dateKey].totalAmount += Number(order.total_amount || 0);

        if (order.retailer_id) {
          dateGroups[dateKey].retailers.add(order.retailer_id);
          allRetailers.add(order.retailer_id);
        }

        const beatName = order.retailers?.beats?.beat_name;
        if (beatName) {
          dateGroups[dateKey].beats.add(beatName);
          allBeats.add(beatName);
        }

        order.order_items?.forEach((item: any) => {
          if (item.product_id) {
            dateGroups[dateKey].products.add(item.product_id);
            allProducts.add(item.product_id);
          }
          const qty = Number(item.quantity || 0);
          const unit = (item.products?.unit || '').toLowerCase();
          let kg = 0;
          if (unit === 'grams') {
            kg = qty / 1000;
          } else if (unit === 'kg' || unit === 'kgs') {
            kg = qty;
          }
          dateGroups[dateKey].totalKg += kg;
          allTotalKg += kg;
        });
      });

      // Convert to array
      const detailsArray = Object.entries(dateGroups).map(([date, data]) => ({
        order_date: date,
        beat_names: Array.from(data.beats).join(', ') || 'N/A',
        total_amount: data.totalAmount,
        invoice_count: data.orders.length,
        retailers_count: data.retailers.size,
        products_count: data.products.size,
        total_kg: data.totalKg
      }));

      setUserDetails(detailsArray);
      setDetailsSummary({
        retailers: allRetailers.size,
        beats: allBeats.size,
        products: allProducts.size,
        totalKg: allTotalKg
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      setUserDetails([]);
      setDetailsSummary(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchSummaryData();
  }, []);

  const totalOrderValue = summaryData.reduce((sum, item) => sum + item.total_order_value, 0);

  const pieChartData = summaryData.map((item, index) => ({
    name: item.full_name,
    value: item.total_order_value,
    percentage: totalOrderValue > 0 ? ((item.total_order_value / totalOrderValue) * 100).toFixed(0) : 0,
    color: COLORS[index % COLORS.length]
  }));

  const handlePieClick = (data: any) => {
    if (data && data.name) {
      fetchUserDetails(data.name);
    }
  };

  const handleRowClick = (userName: string) => {
    fetchUserDetails(userName);
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Order Summary by User</CardTitle>
          <p className="text-sm text-muted-foreground">
            View confirmed order totals grouped by user
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Select User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.filter(u => u.full_name).map((user) => (
                    <SelectItem key={user.id} value={user.full_name!}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-end">
              <div>
                <label className="text-sm font-medium mb-2 block">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDateRange({ from: startOfMonth(new Date()), to: new Date() })}
                title="Reset to current month"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={fetchSummaryData} disabled={loading}>
              <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
              Run Query
            </Button>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : summaryData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">Click on a segment or row to view details</p>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      labelLine={{ stroke: '#888', strokeWidth: 1 }}
                      onClick={handlePieClick}
                      style={{ cursor: 'pointer' }}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke={selectedUserDetails === entry.name ? '#000' : 'transparent'}
                          strokeWidth={selectedUserDetails === entry.name ? 3 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Order Value']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Table */}
              <div>
                <h3 className="font-semibold mb-3">User Order Summary</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Full Name</TableHead>
                        <TableHead className="text-right">Total Order Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.map((row, index) => (
                        <TableRow 
                          key={index} 
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors",
                            selectedUserDetails === row.full_name && "bg-muted"
                          )}
                          onClick={() => handleRowClick(row.full_name)}
                        >
                          <TableCell className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            {row.full_name}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{row.total_order_value.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot className="bg-muted/30">
                      <TableRow>
                        <TableCell className="font-semibold">Total</TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          ₹{totalOrderValue.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No data found for the selected filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Section */}
      {selectedUserDetails && (
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Order Details - {selectedUserDetails}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => {
              setSelectedUserDetails(null);
              setUserDetails([]);
              setDetailsSummary(null);
            }}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailsLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-muted-foreground">Loading details...</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                {detailsSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Store className="h-4 w-4" />
                        Retailers
                      </div>
                      <div className="text-2xl font-bold">{detailsSummary.retailers}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <MapPin className="h-4 w-4" />
                        Beats
                      </div>
                      <div className="text-2xl font-bold">{detailsSummary.beats}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Package className="h-4 w-4" />
                        Products
                      </div>
                      <div className="text-2xl font-bold">{detailsSummary.products}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Scale className="h-4 w-4" />
                        Total KG
                      </div>
                      <div className="text-2xl font-bold">{detailsSummary.totalKg.toFixed(1)}</div>
                    </Card>
                  </div>
                )}

                {/* Details Table */}
                <p className="text-sm text-muted-foreground">Click a row to see product breakdown</p>
                {userDetails.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Date</TableHead>
                          <TableHead>Beat</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Invoice</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userDetails.map((row, index) => (
                          <TableRow key={index} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <div className="font-medium">{format(new Date(row.order_date), 'MMM dd')}</div>
                                <div className="text-xs text-muted-foreground">{format(new Date(row.order_date), 'EEEE')}</div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate" title={row.beat_names}>
                              {row.beat_names}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ₹{row.total_amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              ZIP({row.invoice_count})
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot className="bg-muted/30">
                        <TableRow>
                          <TableCell className="font-semibold" colSpan={2}>
                            Total ({userDetails.length} days)
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            ₹{userDetails.reduce((sum, row) => sum + row.total_amount, 0).toLocaleString()}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </tfoot>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No order details found for this user
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
