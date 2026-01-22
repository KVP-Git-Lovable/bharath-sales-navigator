import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { RefreshCw, Calendar as CalendarIcon, X, Store, MapPin, Package, Scale, ChevronDown, PieChartIcon, BarChart3, Sparkles, TrendingUp, AlertTriangle, Target, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  const [expandedBox, setExpandedBox] = useState<string | null>(null);
  const [retailersList, setRetailersList] = useState<{
    name: string;
    created_date: string;
  }[]>([]);
  const [beatsList, setBeatsList] = useState<{
    beat_name: string;
    category: string | null;
    is_active: boolean;
    created_date: string;
  }[]>([]);
  const [productKgList, setProductKgList] = useState<{
    order_date: string;
    raw_date: string; // Store raw date for querying
    quantity_kg: number;
    revenue: number;
  }[]>([]);
  const [selectedProductDate, setSelectedProductDate] = useState<string | null>(null);
  const [productDayDetails, setProductDayDetails] = useState<{
    product_name: string;
    quantity: number;
    unit: string;
    total: number;
  }[]>([]);
  const [productDayLoading, setProductDayLoading] = useState(false);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // Generate AI insights based on the summary data
  const aiInsights = useMemo(() => {
    if (summaryData.length === 0) return [];

    const insights: { type: 'success' | 'warning' | 'opportunity' | 'info'; title: string; description: string }[] = [];
    const totalValue = summaryData.reduce((sum, item) => sum + item.total_order_value, 0);
    const avgValue = totalValue / summaryData.length;
    
    // Find top performer
    const topPerformer = summaryData[0];
    if (topPerformer && summaryData.length > 1) {
      const topShare = (topPerformer.total_order_value / totalValue) * 100;
      insights.push({
        type: 'success',
        title: 'Top Performer',
        description: `${topPerformer.full_name} leads with ₹${topPerformer.total_order_value.toLocaleString()} (${topShare.toFixed(1)}% of total)`
      });
    }

    // Find underperformers (below 50% of average)
    const underperformers = summaryData.filter(u => u.total_order_value < avgValue * 0.5);
    if (underperformers.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Attention Needed',
        description: `${underperformers.length} user(s) performing below 50% average: ${underperformers.map(u => u.full_name.split(' ')[0]).slice(0, 3).join(', ')}${underperformers.length > 3 ? '...' : ''}`
      });
    }

    // Revenue distribution insight
    if (summaryData.length >= 3) {
      const top3Share = (summaryData.slice(0, 3).reduce((s, u) => s + u.total_order_value, 0) / totalValue) * 100;
      if (top3Share > 70) {
        insights.push({
          type: 'info',
          title: 'Concentrated Revenue',
          description: `Top 3 users contribute ${top3Share.toFixed(0)}% of revenue. Consider diversifying sales coverage.`
        });
      }
    }

    // Growth opportunity
    const midPerformers = summaryData.filter(u => 
      u.total_order_value >= avgValue * 0.5 && u.total_order_value < avgValue * 0.9
    );
    if (midPerformers.length > 0) {
      insights.push({
        type: 'opportunity',
        title: 'Growth Potential',
        description: `${midPerformers.length} user(s) near average can improve with targeted coaching: ${midPerformers.map(u => u.full_name.split(' ')[0]).slice(0, 2).join(', ')}`
      });
    }

    return insights.slice(0, 4); // Limit to 4 insights
  }, [summaryData]);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      // Try admin function first (bypasses RLS)
      const { data: adminData, error: adminError } = await supabase.rpc('get_basic_profiles_for_admin');
      
      if (!adminError && adminData) {
        const filteredUsers = adminData
          .filter((u: any) => u.full_name)
          .sort((a: any, b: any) => (a.full_name || '').localeCompare(b.full_name || ''));
        setUsers(filteredUsers);
      } else {
        // Fallback to direct query
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .not('full_name', 'is', null)
          .order('full_name');
        
        if (!error && data) {
          setUsers(data);
        }
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

      // Fetch confirmed orders in the date range
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total_amount')
        .eq('status', 'confirmed')
        .gte('order_date', fromDate)
        .lte('order_date', toDate);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setSummaryData([]);
        setLoading(false);
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        setSummaryData([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(ordersData.map(o => o.user_id))];

      // Fetch profiles for these users - try admin function first, fallback to direct query
      let profilesData: { id: string; full_name: string | null }[] = [];
      
      // Try using the admin function (bypasses RLS)
      const { data: adminProfiles, error: adminError } = await supabase.rpc('get_basic_profiles_for_admin');
      
      if (!adminError && adminProfiles) {
        // Filter to only the user IDs we need
        profilesData = adminProfiles.filter((p: any) => userIds.includes(p.id));
      } else {
        // Fallback to direct query if admin function fails
        const { data: directProfiles, error: directError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (!directError && directProfiles) {
          profilesData = directProfiles;
        }
      }

      // Create a map of user_id to full_name
      const userNameMap: Record<string, string> = {};
      profilesData?.forEach(p => {
        userNameMap[p.id] = p.full_name || 'Unknown';
      });

      // Group by user and calculate totals
      const userTotals: Record<string, number> = {};
      ordersData.forEach((order) => {
        const userName = userNameMap[order.user_id] || 'Unknown';
        
        // Filter by selected user if not "all" - use exact match
        if (selectedUser !== 'all' && userName !== selectedUser) {
          return;
        }
        
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
    setExpandedBox(null);
    setRetailersList([]);
    setBeatsList([]);
    setProductKgList([]);
    
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Get user ID first
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

      const userId = userProfile.id;

      // Fetch all data in parallel using the user's SQL query logic
      const [retailersResult, beatsResult, ordersResult, productRevenueResult] = await Promise.all([
        // Retailers created by user in date range
        supabase
          .from('retailers')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .gte('created_at', `${fromDate}T00:00:00`)
          .lte('created_at', `${toDate}T23:59:59`),
        
        // Beats created by user (using beats.created_by)
        supabase
          .from('beats')
          .select('id', { count: 'exact' })
          .eq('created_by', userId)
          .gte('created_at', `${fromDate}T00:00:00`)
          .lte('created_at', `${toDate}T23:59:59`),
        
        // Orders for this user (confirmed) - use order_date as per SQL query
        supabase
          .from('orders')
          .select(`
            id,
            order_date,
            total_amount,
            status,
            retailer_id,
            retailers(beat_id, beats(beat_name))
          `)
          .eq('user_id', userId)
          .eq('status', 'confirmed')
          .gte('order_date', fromDate)
          .lte('order_date', toDate)
          .order('order_date', { ascending: true }),
        
        // Use the same RPC as Product and Revenue Performance report
        supabase.rpc('get_product_revenue_performance', {
          user_full_name: userName,
          start_date: fromDate,
          end_date: toDate
        })
      ]);

      // Get beats count from beats table
      const totalBeatsCreated = beatsResult.count || 0;

      // Calculate products and total KG from the RPC result (same logic as SQL Report)
      const productData = productRevenueResult.data || [];
      const totalProductsSold = productData.length; // Count of distinct products
      let totalQuantityKgFromRpc = 0;
      
      productData.forEach((row: any) => {
        const qty = Number(row.quantity_sold || 0);
        const unit = (row.unit || '').toLowerCase();
        // Same conversion logic as Analytics.tsx line 2391-2393
        if (unit === 'grams') {
          totalQuantityKgFromRpc += qty / 1000;
        } else {
          totalQuantityKgFromRpc += qty;
        }
      });

      // Fetch order_items separately for the daily breakdown table
      const orderIds = ordersResult.data?.map(o => o.id) || [];
      let orderItemsData: any[] = [];
      
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('order_id, product_id, quantity, unit, total')
          .in('order_id', orderIds);
        orderItemsData = items || [];
      }
      
      // Create a map of order_id to items
      const orderItemsMap: Record<string, any[]> = {};
      orderItemsData.forEach(item => {
        if (!orderItemsMap[item.order_id]) {
          orderItemsMap[item.order_id] = [];
        }
        orderItemsMap[item.order_id].push(item);
      });

      // Calculate retailer count
      const totalRetailersCreated = retailersResult.count || 0;

      // Process orders for products and KG
      const orders = ordersResult.data || [];
      const allProducts = new Set<string>();
      let totalQuantityKg = 0;
      let totalRevenue = 0;

      // Group by date for the details table
      const dateGroups: Record<string, {
        orders: any[];
        totalAmount: number;
        beats: Set<string>;
        retailers: Set<string>;
        products: Set<string>;
        totalKg: number;
        invoiceCount: number;
      }> = {};

      orders.forEach((order: any) => {
        const dateKey = order.order_date;
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = {
            orders: [],
            totalAmount: 0,
            beats: new Set(),
            retailers: new Set(),
            products: new Set(),
            totalKg: 0,
            invoiceCount: 0
          };
        }

        dateGroups[dateKey].orders.push(order);
        dateGroups[dateKey].totalAmount += Number(order.total_amount || 0);
        dateGroups[dateKey].invoiceCount += 1;
        totalRevenue += Number(order.total_amount || 0);

        if (order.retailer_id) {
          dateGroups[dateKey].retailers.add(order.retailer_id);
        }

        const beatName = order.retailers?.beats?.beat_name;
        if (beatName) {
          dateGroups[dateKey].beats.add(beatName);
        }

        // Use order items from the separate query
        const items = orderItemsMap[order.id] || [];
        items.forEach((item: any) => {
          if (item.product_id) {
            dateGroups[dateKey].products.add(item.product_id);
            allProducts.add(item.product_id);
          }
          
          const qty = Number(item.quantity || 0);
          const unit = (item.unit || '').toLowerCase();
          let kg = 0;
          
          // Match SQL logic: if unit is 'Grams', divide by 1000
          if (unit === 'grams' || unit === 'gram' || unit === 'g') {
            kg = qty / 1000;
          } else {
            // For KG or other units, use quantity directly
            kg = qty;
          }
          
          dateGroups[dateKey].totalKg += kg;
          totalQuantityKg += kg;
        });
      });

      // Convert to array
      const detailsArray = Object.entries(dateGroups).map(([date, data]) => ({
        order_date: date,
        beat_names: Array.from(data.beats).join(', ') || 'N/A',
        total_amount: data.totalAmount,
        invoice_count: data.invoiceCount,
        retailers_count: data.retailers.size,
        products_count: data.products.size,
        total_kg: data.totalKg
      }));

      setUserDetails(detailsArray);
      setDetailsSummary({
        retailers: totalRetailersCreated,
        beats: totalBeatsCreated,
        products: totalProductsSold, // Use RPC result count
        totalKg: Math.round(totalQuantityKgFromRpc * 100) / 100 // Use RPC calculated KG, round to 2 decimals
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

  // Fetch retailers list when clicking on Retailers box
  const handleRetailersBoxClick = async () => {
    if (!selectedUserDetails) return;
    
    if (expandedBox === 'retailers') {
      setExpandedBox(null);
      setRetailersList([]);
      return;
    }

    setExpandedBox('retailers');
    
    const fromDate = format(dateRange.from, 'yyyy-MM-dd');
    const toDate = format(dateRange.to, 'yyyy-MM-dd');

    // Get user profile by name
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', `${selectedUserDetails}%`)
      .limit(1)
      .single();

    if (!userProfile) return;

    // Fetch retailers created by user in date range
    const { data: retailers, error } = await supabase
      .from('retailers')
      .select('id, name, created_at')
      .eq('user_id', userProfile.id)
      .gte('created_at', `${fromDate}T00:00:00`)
      .lte('created_at', `${toDate}T23:59:59`)
      .order('created_at', { ascending: true });

    if (!error && retailers) {
      setRetailersList(retailers.map(r => ({
        name: r.name,
        created_date: format(new Date(r.created_at), 'MMMM dd, yyyy')
      })));
    }
  };

  // Fetch beats list when clicking on Beats box
  const handleBeatsBoxClick = async () => {
    if (!selectedUserDetails) return;
    
    if (expandedBox === 'beats') {
      setExpandedBox(null);
      setBeatsList([]);
      return;
    }

    setExpandedBox('beats');
    
    const fromDate = format(dateRange.from, 'yyyy-MM-dd');
    const toDate = format(dateRange.to, 'yyyy-MM-dd');

    // Get user profile by name
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', `${selectedUserDetails}%`)
      .limit(1)
      .single();

    if (!userProfile) return;

    // Fetch beats created by user in date range
    const { data: beats, error } = await supabase
      .from('beats')
      .select('id, beat_id, beat_name, category, is_active, created_at')
      .eq('created_by', userProfile.id)
      .gte('created_at', `${fromDate}T00:00:00`)
      .lte('created_at', `${toDate}T23:59:59`)
      .order('created_at', { ascending: true });

    if (!error && beats) {
      setBeatsList(beats.map(b => ({
        beat_name: b.beat_name,
        category: b.category,
        is_active: b.is_active ?? true,
        created_date: format(new Date(b.created_at), 'MMMM dd, yyyy')
      })));
    }
  };

  // Fetch products/kg list when clicking on Products or Total KG box
  const handleProductsKgBoxClick = async () => {
    if (!selectedUserDetails) return;
    
    if (expandedBox === 'productsKg') {
      setExpandedBox(null);
      setProductKgList([]);
      return;
    }

    setExpandedBox('productsKg');
    
    const fromDate = format(dateRange.from, 'yyyy-MM-dd');
    const toDate = format(dateRange.to, 'yyyy-MM-dd');

    // Get user profile by name
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', `${selectedUserDetails}%`)
      .limit(1)
      .single();

    if (!userProfile) return;

    // Fetch orders with order_items for confirmed orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at')
      .eq('user_id', userProfile.id)
      .eq('status', 'confirmed')
      .gte('created_at', `${fromDate}T00:00:00`)
      .lt('created_at', `${format(new Date(new Date(toDate).getTime() + 86400000), 'yyyy-MM-dd')}T00:00:00`)
      .order('created_at', { ascending: true });

    if (ordersError || !orders || orders.length === 0) {
      setProductKgList([]);
      return;
    }

    const orderIds = orders.map(o => o.id);

    // Fetch order items for these orders
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('order_id, quantity, unit, total')
      .in('order_id', orderIds);

    if (itemsError || !orderItems) {
      setProductKgList([]);
      return;
    }

    // Create a map of order_id to created_at date
    const orderDateMap: Record<string, string> = {};
    orders.forEach(o => {
      orderDateMap[o.id] = format(new Date(o.created_at), 'yyyy-MM-dd');
    });

    // Group by date
    const dateGroups: Record<string, { quantity_kg: number; revenue: number }> = {};
    let grandTotalKg = 0;
    let grandTotalRevenue = 0;

    orderItems.forEach(item => {
      const dateKey = orderDateMap[item.order_id];
      if (!dateKey) return;

      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = { quantity_kg: 0, revenue: 0 };
      }

      const qty = Number(item.quantity || 0);
      const unit = (item.unit || '').toLowerCase();
      let kg = 0;

      if (unit === 'grams' || unit === 'gram' || unit === 'g') {
        kg = qty / 1000;
      } else {
        kg = qty;
      }

      dateGroups[dateKey].quantity_kg += kg;
      dateGroups[dateKey].revenue += Number(item.total || 0);
      grandTotalKg += kg;
      grandTotalRevenue += Number(item.total || 0);
    });

    // Convert to array and add total row
    const resultArray = Object.entries(dateGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        order_date: format(new Date(date), 'MMMM dd, yyyy'),
        raw_date: date,
        quantity_kg: Math.round(data.quantity_kg * 100) / 100,
        revenue: data.revenue
      }));

    // Add TOTAL row
    resultArray.push({
      order_date: 'TOTAL',
      raw_date: '',
      quantity_kg: Math.round(grandTotalKg * 100) / 100,
      revenue: grandTotalRevenue
    });

    setProductKgList(resultArray);
    setSelectedProductDate(null);
    setProductDayDetails([]);
  };

  // Fetch product-wise data for a specific date
  const handleProductDateClick = async (rawDate: string, displayDate: string) => {
    if (!selectedUserDetails || rawDate === '' || displayDate === 'TOTAL') return;
    
    if (selectedProductDate === displayDate) {
      setSelectedProductDate(null);
      setProductDayDetails([]);
      return;
    }

    setSelectedProductDate(displayDate);
    setProductDayLoading(true);

    try {
      // Get user profile by name
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `${selectedUserDetails}%`)
        .limit(1)
        .single();

      if (!userProfile) {
        setProductDayDetails([]);
        setProductDayLoading(false);
        return;
      }

      // Calculate next day for date range query (matches SQL: created_at < date + 1 day)
      const nextDay = format(new Date(new Date(rawDate).getTime() + 86400000), 'yyyy-MM-dd');

      // Fetch orders for that specific date
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userProfile.id)
        .eq('status', 'confirmed')
        .gte('created_at', `${rawDate}T00:00:00`)
        .lt('created_at', `${nextDay}T00:00:00`);

      if (ordersError || !orders || orders.length === 0) {
        setProductDayDetails([]);
        setProductDayLoading(false);
        return;
      }

      const orderIds = orders.map(o => o.id);

      // Fetch order items - use product_name directly from order_items table
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_name, quantity, unit, total')
        .in('order_id', orderIds);

      if (itemsError || !orderItems) {
        setProductDayDetails([]);
        setProductDayLoading(false);
        return;
      }

      // Group by product_name and convert to KG (matching SQL query)
      const productGroups: Record<string, { 
        product_name: string; 
        quantity: number; 
        unit: string; 
        total: number;
      }> = {};

      orderItems.forEach((item: any) => {
        const productName = item.product_name || 'Unknown Product';
        
        if (!productGroups[productName]) {
          productGroups[productName] = {
            product_name: productName,
            quantity: 0,
            unit: 'KG',
            total: 0
          };
        }

        // Convert Grams to KG, otherwise use quantity directly (matching SQL: CASE WHEN unit = 'Grams' THEN quantity / 1000.0 ELSE quantity END)
        const qty = Number(item.quantity || 0);
        const unit = (item.unit || '').toLowerCase();
        let kgQty = 0;
        
        if (unit === 'grams' || unit === 'gram' || unit === 'g') {
          kgQty = qty / 1000;
        } else {
          kgQty = qty;
        }

        productGroups[productName].quantity += kgQty;
        productGroups[productName].total += Number(item.total || 0);
      });

      // Round to 2 decimal places and sort by revenue DESC
      const productArray = Object.values(productGroups)
        .map(p => ({
          ...p,
          quantity: Math.round(p.quantity * 100) / 100
        }))
        .sort((a, b) => b.total - a.total);

      setProductDayDetails(productArray);
    } catch (error) {
      console.error('Error fetching product day details:', error);
      setProductDayDetails([]);
    } finally {
      setProductDayLoading(false);
    }
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
              {/* Chart Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Click on a segment or row to view details</p>
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
                  ) : (
                    <BarChart data={pieChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Order Value']}
                      />
                      <Bar 
                        dataKey="value" 
                        onClick={(data) => handleRowClick(data.name)}
                        style={{ cursor: 'pointer' }}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke={selectedUserDetails === entry.name ? '#000' : 'transparent'}
                            strokeWidth={selectedUserDetails === entry.name ? 2 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
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

      {/* AI Insights Section */}
      {aiInsights.length > 0 && (
        <Card className="shadow-lg bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200/50 dark:border-violet-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">AI Insights</CardTitle>
                <p className="text-xs text-muted-foreground">Analysis based on user performance data</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {aiInsights.map((insight, index) => (
                <div 
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border",
                    insight.type === 'success' && "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
                    insight.type === 'warning' && "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
                    insight.type === 'opportunity' && "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
                    insight.type === 'info' && "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "p-1.5 rounded-md flex-shrink-0",
                      insight.type === 'success' && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400",
                      insight.type === 'warning' && "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400",
                      insight.type === 'opportunity' && "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
                      insight.type === 'info' && "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400"
                    )}>
                      {insight.type === 'success' && <TrendingUp className="h-3.5 w-3.5" />}
                      {insight.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5" />}
                      {insight.type === 'opportunity' && <Target className="h-3.5 w-3.5" />}
                      {insight.type === 'info' && <Users className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <Card 
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        expandedBox === 'retailers' && "ring-2 ring-primary"
                      )}
                      onClick={handleRetailersBoxClick}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Store className="h-4 w-4" />
                        Retailers
                      </div>
                      <div className="text-2xl font-bold">{detailsSummary.retailers}</div>
                    </Card>
                    <Card 
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        expandedBox === 'beats' && "ring-2 ring-primary"
                      )}
                      onClick={handleBeatsBoxClick}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <MapPin className="h-4 w-4" />
                        Beats
                      </div>
                      <div className="text-2xl font-bold">{detailsSummary.beats}</div>
                    </Card>
                    <Card 
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        expandedBox === 'productsKg' && "ring-2 ring-primary"
                      )}
                      onClick={handleProductsKgBoxClick}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Package className="h-4 w-4" />
                        Products
                      </div>
                      <div className="text-2xl font-bold">{detailsSummary.products}</div>
                    </Card>
                    <Card 
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        expandedBox === 'productsKg' && "ring-2 ring-primary"
                      )}
                      onClick={handleProductsKgBoxClick}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Scale className="h-4 w-4" />
                        Total KG
                      </div>
                      <div className="text-2xl font-bold">{detailsSummary.totalKg.toFixed(1)}</div>
                    </Card>
                  </div>
                )}

                {/* Retailers Subtable */}
                {expandedBox === 'retailers' && retailersList.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                      Retailers Created ({retailersList.length})
                      {retailersList.length > 8 && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </h4>
                    <div className={cn(
                      "border rounded-lg overflow-hidden",
                      retailersList.length > 8 && "max-h-[360px] overflow-y-auto"
                    )}>
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/50 z-10">
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Created Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {retailersList.map((retailer, index) => (
                            <TableRow key={index} className="hover:bg-muted/30">
                              <TableCell>{retailer.name}</TableCell>
                              <TableCell>{retailer.created_date}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Beats Subtable */}
                {expandedBox === 'beats' && beatsList.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                      Beats Created ({beatsList.length})
                      {beatsList.length > 8 && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </h4>
                    <div className={cn(
                      "border rounded-lg overflow-hidden",
                      beatsList.length > 8 && "max-h-[360px] overflow-y-auto"
                    )}>
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/50 z-10">
                          <TableRow>
                            <TableHead>Beat Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Created Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {beatsList.map((beat, index) => (
                            <TableRow key={index} className="hover:bg-muted/30">
                              <TableCell>{beat.beat_name}</TableCell>
                              <TableCell>{beat.category || '-'}</TableCell>
                              <TableCell>{beat.is_active ? 'Yes' : 'No'}</TableCell>
                              <TableCell>{beat.created_date}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Products/KG Subtable with Split View */}
                {expandedBox === 'productsKg' && productKgList.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                      Daily Sales Summary ({productKgList.length - 1} days)
                      {productKgList.length > 9 && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </h4>
                    <div className={cn(
                      "grid gap-4 transition-all duration-300",
                      selectedProductDate ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                    )}>
                      {/* Left: Daily Summary Table */}
                      <div className={cn(
                        "border rounded-lg overflow-hidden",
                        productKgList.length > 9 && "max-h-[360px] overflow-y-auto"
                      )}>
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/50 z-10">
                            <TableRow>
                              <TableHead>Order Date</TableHead>
                              <TableHead className="text-right">Quantity (KG)</TableHead>
                              <TableHead className="text-right">Revenue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productKgList.map((row, index) => (
                              <TableRow 
                                key={index} 
                                className={cn(
                                  "transition-colors",
                                  row.order_date !== 'TOTAL' && "cursor-pointer hover:bg-muted/30",
                                  row.order_date === 'TOTAL' && "bg-muted/50 font-semibold",
                                  selectedProductDate === row.order_date && "bg-primary/10 ring-1 ring-primary"
                                )}
                                onClick={() => handleProductDateClick(row.raw_date, row.order_date)}
                              >
                                <TableCell className={row.order_date === 'TOTAL' ? 'font-bold' : ''}>
                                  {row.order_date}
                                </TableCell>
                                <TableCell className="text-right">{row.quantity_kg.toFixed(2)}</TableCell>
                                <TableCell className="text-right">₹{row.revenue.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Right: Product-wise breakdown for selected date */}
                      {selectedProductDate && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-primary/10 px-4 py-2 border-b flex items-center justify-between">
                            <h5 className="font-semibold text-sm">
                              Products on {selectedProductDate}
                            </h5>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => {
                                setSelectedProductDate(null);
                                setProductDayDetails([]);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {productDayLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <RefreshCw className="animate-spin h-5 w-5 text-muted-foreground" />
                            </div>
                          ) : productDayDetails.length > 0 ? (
                            <div className={cn(
                              productDayDetails.length > 8 && "max-h-[320px] overflow-y-auto"
                            )}>
                              <Table>
                                <TableHeader className="sticky top-0 bg-muted/50 z-10">
                                  <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {productDayDetails.map((product, index) => (
                                    <TableRow key={index} className="hover:bg-muted/30">
                                      <TableCell className="max-w-[150px] truncate" title={product.product_name}>
                                        {product.product_name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {product.quantity} {product.unit}
                                      </TableCell>
                                      <TableCell className="text-right">₹{product.total.toLocaleString()}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                                <tfoot className="bg-muted/30">
                                  <TableRow>
                                    <TableCell className="font-semibold">Total</TableCell>
                                    <TableCell />
                                    <TableCell className="text-right font-bold text-primary">
                                      ₹{productDayDetails.reduce((sum, p) => sum + p.total, 0).toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                </tfoot>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              No product data found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
