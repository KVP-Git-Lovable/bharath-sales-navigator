import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { RefreshCw, Calendar as CalendarIcon, X, PieChartIcon, BarChart3, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface SKURevenue {
  product_name: string;
  quantity_sold: number;
  revenue: number;
  unit: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#a855f7'];

export const RevenueBySKUSection = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date()
  });
  const [loading, setLoading] = useState(false);
  const [skuData, setSkuData] = useState<SKURevenue[]>([]);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: adminData, error: adminError } = await supabase.rpc('get_basic_profiles_for_admin');
      
      if (!adminError && adminData) {
        const filteredUsers = adminData
          .filter((u: any) => u.full_name)
          .sort((a: any, b: any) => (a.full_name || '').localeCompare(b.full_name || ''));
        setUsers(filteredUsers);
        // Set default user if available
        if (filteredUsers.length > 0) {
          setSelectedUser(filteredUsers[0].full_name);
        }
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .not('full_name', 'is', null)
          .order('full_name');
        
        if (!error && data) {
          setUsers(data);
          if (data.length > 0 && data[0].full_name) {
            setSelectedUser(data[0].full_name);
          }
        }
      }
    };
    fetchUsers();
  }, []);

  // Fetch SKU revenue data
  const fetchSKUData = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      const { data, error } = await supabase.rpc('get_product_revenue_performance', {
        user_full_name: selectedUser,
        start_date: fromDate,
        end_date: toDate
      });

      if (error) {
        console.error('Error fetching SKU data:', error);
        setSkuData([]);
        return;
      }

      if (data && data.length > 0) {
        // Aggregate by product name (in case of duplicates)
        const aggregated: Record<string, SKURevenue> = {};
        data.forEach((item: any) => {
          const key = item.product_name;
          if (!aggregated[key]) {
            aggregated[key] = {
              product_name: item.product_name,
              quantity_sold: 0,
              revenue: 0,
              unit: item.unit || 'KG'
            };
          }
          aggregated[key].quantity_sold += Number(item.quantity_sold || 0);
          aggregated[key].revenue += Number(item.revenue || 0);
        });

        // Sort by revenue descending
        const sortedData = Object.values(aggregated).sort((a, b) => b.revenue - a.revenue);
        setSkuData(sortedData);
      } else {
        setSkuData([]);
      }
    } catch (error) {
      console.error('Error in SKU revenue fetch:', error);
      setSkuData([]);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    const totalRevenue = skuData.reduce((sum, item) => sum + item.revenue, 0);
    return skuData.slice(0, 10).map((item, index) => ({
      name: item.product_name.length > 15 ? item.product_name.substring(0, 15) + '...' : item.product_name,
      fullName: item.product_name,
      value: item.revenue,
      quantity: item.quantity_sold,
      unit: item.unit,
      percentage: totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0',
      color: COLORS[index % COLORS.length]
    }));
  }, [skuData]);

  const totalRevenue = useMemo(() => 
    skuData.reduce((sum, item) => sum + item.revenue, 0), 
    [skuData]
  );

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Revenue Summary by SKU</CardTitle>
            <p className="text-sm text-muted-foreground">
              Product-wise revenue breakdown based on confirmed orders
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Select User</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
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
          <Button onClick={fetchSKUData} disabled={loading || !selectedUser}>
            <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} />
            Run Query
          </Button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
            <p className="text-muted-foreground">Loading SKU data...</p>
          </div>
        ) : skuData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Top 10 products by revenue</p>
                <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v as 'pie' | 'bar')}>
                  <ToggleGroupItem value="pie" aria-label="Pie Chart" className="h-8 w-8 p-0">
                    <PieChartIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="bar" aria-label="Bar Chart" className="h-8 w-8 p-0">
                    <BarChart3 className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      labelLine={{ stroke: '#888', strokeWidth: 1 }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `₹${value.toLocaleString()} | ${props.payload.quantity} ${props.payload.unit}`,
                        props.payload.fullName
                      ]}
                    />
                    <Legend />
                  </PieChart>
                ) : (
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `₹${value.toLocaleString()} | ${props.payload.quantity} ${props.payload.unit}`,
                        props.payload.fullName
                      ]}
                    />
                    <Bar dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Summary Table */}
            <div>
              <h3 className="font-semibold mb-3">SKU Revenue Summary</h3>
              <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50 z-10">
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skuData.map((row, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="truncate max-w-[150px]" title={row.product_name}>
                            {row.product_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {row.quantity_sold.toFixed(1)} {row.unit}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{row.revenue.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot className="bg-muted/30 sticky bottom-0">
                    <TableRow>
                      <TableCell className="font-semibold">Total ({skuData.length} SKUs)</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-bold text-primary">
                        ₹{totalRevenue.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {selectedUser ? 'No data found for the selected filters. Click "Run Query" to fetch data.' : 'Select a user and click "Run Query" to view SKU revenue data.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
