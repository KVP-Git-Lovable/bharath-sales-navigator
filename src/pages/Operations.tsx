import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Download, Search, Eye, RefreshCw, MapPin, Clock, Package, DollarSign, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PaymentProofsView } from '@/components/admin/PaymentProofsView';

interface CheckInOutData {
  id: string;
  user_id: string;
  user_name: string;
  retailer_name: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_location: any;
  check_out_location: any;
  check_in_address: string | null;
  check_out_address: string | null;
  check_in_photo_url: string | null;
  check_out_photo_url: string | null;
  planned_date: string;
  skip_check_in_time?: string | null;
  skip_check_in_reason?: string | null;
  no_order_reason?: string | null;
  status?: string;
  face_match_confidence?: number | null;
  face_verification_status?: string | null;
  attendance_photo_url?: string | null;
  profile_picture_url?: string | null;
}

interface OrderData {
  id: string;
  user_name: string;
  retailer_name: string;
  created_at: string;
  total_amount: number;
  status: string;
  items: any[];
}

interface StockData {
  id: string;
  user_name: string;
  retailer_name: string;
  created_at: string;
  product_name: string;
  stock_quantity: number;
}

const Operations = () => {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('checkins');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  
  // Separate date filters for each section
  const [checkinDateFilter, setCheckinDateFilter] = useState('today');
  const [orderDateFilter, setOrderDateFilter] = useState('today');
  const [stockDateFilter, setStockDateFilter] = useState('today');
  
  // Custom date ranges
  const [checkinCustomRange, setCheckinCustomRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [orderCustomRange, setOrderCustomRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [stockCustomRange, setStockCustomRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  
  // Data states
  const [checkInData, setCheckInData] = useState<CheckInOutData[]>([]);
  const [orderData, setOrderData] = useState<OrderData[]>([]);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Loading states
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  
  // Summary counters
  const [todayStats, setTodayStats] = useState({
    checkins: 0,
    orders: 0,
    stockUpdates: 0
  });

  // Fetch users for filter (via Edge Function to bypass RLS logging issue)
  const fetchUsers = async () => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-get-users');
      if (fnError) throw fnError;

      // Normalize to expected shape
      const list = (fnData?.users || fnData || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name ?? u.fullName ?? u.username ?? '—',
        username: u.username ?? null,
        profile_picture_url: u.profile_picture_url ?? u.profilePictureUrl ?? null,
      }));
      setUsers(list);
    } catch (e1) {
      // Fallback to direct select (works for admins or self)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, profile_picture_url')
          .order('full_name');
        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.warn('Could not fetch users list:', (error as any)?.message || error);
        setUsers([]);
      }
    }
  };
  // Fetch check-in/check-out data
  const fetchCheckInData = async () => {
    setLoadingCheckins(true);
    try {
      let query = supabase
        .from('visits')
        .select(`
          id,
          user_id,
          retailer_id,
          check_in_time,
          check_out_time,
          check_in_location,
          check_out_location,
          check_in_address,
          check_out_address,
          check_in_photo_url,
          check_out_photo_url,
          planned_date,
          skip_check_in_time,
          skip_check_in_reason,
          no_order_reason,
          status
        `)
        .or('check_in_time.not.is.null,skip_check_in_time.not.is.null');

      if (userFilter !== 'all') {
        query = query.eq('user_id', userFilter);
      }

      // Apply date filter for check-ins
      const checkInToday = new Date();
      const checkInStartOfToday = new Date(checkInToday.getFullYear(), checkInToday.getMonth(), checkInToday.getDate());
      
      if (checkinDateFilter === 'today') {
        query = query.gte('planned_date', checkInStartOfToday.toISOString().split('T')[0]);
      } else if (checkinDateFilter === 'week') {
        const weekAgo = new Date(checkInStartOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('planned_date', weekAgo.toISOString().split('T')[0]);
      } else if (checkinDateFilter === 'month') {
        const monthAgo = new Date(checkInStartOfToday);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('planned_date', monthAgo.toISOString().split('T')[0]);
      } else if (checkinDateFilter === 'custom' && checkinCustomRange.from) {
        query = query.gte('planned_date', checkinCustomRange.from.toISOString().split('T')[0]);
        if (checkinCustomRange.to) {
          query = query.lte('planned_date', checkinCustomRange.to.toISOString().split('T')[0]);
        }
      }

      const { data: visitsData, error } = await query;
      if (error) throw error;

      // Get user and retailer data separately with proper error handling
      const userIds = [...new Set(visitsData?.map(v => v.user_id).filter(Boolean) || [])];
      const retailerIds = [...new Set(visitsData?.map(v => v.retailer_id).filter(Boolean) || [])];

      let usersData: any[] = [];
      let retailersData: any[] = [];

      // Fetch users if we have user IDs
      if (userIds.length > 0) {
        try {
          const { data, error: usersError } = await supabase
            .from('profiles')
            .select('id, full_name, username, profile_picture_url')
            .in('id', userIds);
          
          if (!usersError && data) {
            usersData = data;
          } else if (usersError) {
            console.warn('Could not fetch user profiles:', usersError.message);
            // Set basic fallback data for users we couldn't fetch
            usersData = userIds.map(id => ({
              id,
              full_name: 'Unknown User',
              username: 'user',
              profile_picture_url: null
            }));
          }
        } catch (err) {
          console.error('Error fetching user profiles:', err);
          // Set basic fallback data
          usersData = userIds.map(id => ({
            id,
            full_name: 'Unknown User',
            username: 'user',
            profile_picture_url: null
          }));
        }
      }

      // Fetch retailers if we have retailer IDs
      if (retailerIds.length > 0) {
        const { data, error: retailersError } = await supabase
          .from('retailers')
          .select('id, name')
          .in('id', retailerIds);
        
        if (!retailersError && data) {
          retailersData = data;
        } else if (retailersError) {
          console.warn('Could not fetch retailers:', retailersError.message);
        }
      }

      const formattedData = await Promise.all(visitsData?.map(async (visit) => {
        const user = (usersData?.find(u => u.id === visit.user_id)) || (users.find(u => u.id === visit.user_id));
        const retailer = retailersData?.find(r => r.id === visit.retailer_id);
        
        // Get signed URLs for photos if they exist
        let checkInPhotoUrl = null;
        let checkOutPhotoUrl = null;

        if (visit.check_in_photo_url) {
          const { data: signedUrlData } = await supabase.storage
            .from('visit-photos')
            .createSignedUrl(visit.check_in_photo_url, 3600);
          if (signedUrlData?.signedUrl) {
            // Handle relative signed URLs
            checkInPhotoUrl = signedUrlData.signedUrl.startsWith('http') 
              ? signedUrlData.signedUrl 
              : `https://etabpbfokzhhfuybeieu.supabase.co/storage/v1${signedUrlData.signedUrl}`;
          }
        }

        if (visit.check_out_photo_url) {
          const { data: signedUrlData } = await supabase.storage
            .from('visit-photos')
            .createSignedUrl(visit.check_out_photo_url, 3600);
          if (signedUrlData?.signedUrl) {
            // Handle relative signed URLs
            checkOutPhotoUrl = signedUrlData.signedUrl.startsWith('http')
              ? signedUrlData.signedUrl
              : `https://etabpbfokzhhfuybeieu.supabase.co/storage/v1${signedUrlData.signedUrl}`;
          }
        }

        // Fetch face matching data from attendance table
        let faceMatchConfidence = null;
        let faceVerificationStatus = null;
        let attendancePhotoUrl = null;
        let profilePictureUrl = null;

        if (visit.user_id) {
          try {
            // Use planned_date from visit to match with attendance date
            const { data: attendanceData } = await supabase
              .from('attendance')
              .select('face_match_confidence, face_verification_status, check_in_photo_url')
              .eq('user_id', visit.user_id)
              .eq('date', visit.planned_date)
              .maybeSingle();

            if (attendanceData) {
              faceMatchConfidence = attendanceData.face_match_confidence;
              faceVerificationStatus = attendanceData.face_verification_status;
              
              // Get signed URL for attendance photo (bucket is private)
              if (attendanceData.check_in_photo_url) {
                const { data: signedUrlData } = await supabase.storage
                  .from('attendance-photos')
                  .createSignedUrl(attendanceData.check_in_photo_url, 3600);
                if (signedUrlData?.signedUrl) {
                  attendancePhotoUrl = signedUrlData.signedUrl.startsWith('http') 
                    ? signedUrlData.signedUrl 
                    : `https://etabpbfokzhhfuybeieu.supabase.co/storage/v1${signedUrlData.signedUrl}`;
                }
              }
            }

            // Get user's profile picture - use data from already fetched users
            const userProfile = (usersData?.find(u => u.id === visit.user_id)) || (users.find(u => u.id === visit.user_id));
            if (userProfile && (userProfile as any).profile_picture_url) {
              profilePictureUrl = (userProfile as any).profile_picture_url;
            }
          } catch (err) {
            console.warn('Error fetching face match data:', err);
          }
        }
        
        return {
          id: visit.id,
          user_id: visit.user_id,
          user_name: user?.full_name || user?.username || 'Unknown',
          retailer_name: retailer?.name || 'Unknown',
          check_in_time: visit.check_in_time,
          check_out_time: visit.check_out_time,
          check_in_location: visit.check_in_location,
          check_out_location: visit.check_out_location,
          check_in_address: visit.check_in_address,
          check_out_address: visit.check_out_address,
          check_in_photo_url: checkInPhotoUrl,
          check_out_photo_url: checkOutPhotoUrl,
          planned_date: visit.planned_date,
          skip_check_in_time: visit.skip_check_in_time,
          skip_check_in_reason: visit.skip_check_in_reason,
          no_order_reason: visit.no_order_reason,
          status: visit.status,
          face_match_confidence: faceMatchConfidence,
          face_verification_status: faceVerificationStatus,
          attendance_photo_url: attendancePhotoUrl,
          profile_picture_url: profilePictureUrl
        };
      }) || []);

      // Sort by the most recent check-in or skip check-in time
      formattedData.sort((a, b) => {
        const timeA = a.check_in_time || a.skip_check_in_time;
        const timeB = b.check_in_time || b.skip_check_in_time;
        
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;
        
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });

      setCheckInData(formattedData);

      // Calculate today's check-ins (including phone orders and skip check-ins)
      const today = new Date().toISOString().split('T')[0];
      const todayCheckins = formattedData.filter(item => 
        (item.check_in_time && item.check_in_time.startsWith(today)) ||
        (item.skip_check_in_time && item.skip_check_in_time.startsWith(today))
      ).length;
      
      setTodayStats(prev => ({ ...prev, checkins: todayCheckins }));
    } catch (error) {
      console.error('Error fetching check-in data:', error);
      toast.error('Failed to fetch check-in data');
    } finally {
      setLoadingCheckins(false);
    }
  };

  // Fetch order data
  const fetchOrderData = async () => {
    setLoadingOrders(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          user_id,
          created_at,
          total_amount,
          status,
          retailer_name,
          order_items(product_name, quantity, rate, total)
        `)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (userFilter !== 'all') {
        query = query.eq('user_id', userFilter);
      }

      // Apply date filter for orders
      const orderToday = new Date();
      const orderStartOfToday = new Date(orderToday.getFullYear(), orderToday.getMonth(), orderToday.getDate());
      
      if (orderDateFilter === 'today') {
        query = query.gte('created_at', orderStartOfToday.toISOString());
      } else if (orderDateFilter === 'week') {
        const weekAgo = new Date(orderStartOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (orderDateFilter === 'month') {
        const monthAgo = new Date(orderStartOfToday);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      } else if (orderDateFilter === 'custom' && orderCustomRange.from) {
        query = query.gte('created_at', orderCustomRange.from.toISOString());
        if (orderCustomRange.to) {
          const endOfDay = new Date(orderCustomRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }
      }

      const { data: ordersData, error } = await query;
      if (error) throw error;

      // Get user data separately
      const userIds = [...new Set(ordersData?.map(o => o.user_id) || [])];
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);

      const formattedData = ordersData?.map(order => {
        const user = usersData?.find(u => u.id === order.user_id);
        
        return {
          id: order.id,
          user_name: user?.full_name || user?.username || 'Unknown',
          retailer_name: order.retailer_name || 'Unknown',
          created_at: order.created_at,
          total_amount: order.total_amount,
          status: order.status,
          items: order.order_items || []
        };
      }) || [];

      setOrderData(formattedData);

      // Calculate today's orders
      const todayOrders = formattedData.filter(item => 
        item.created_at.startsWith(orderToday.toISOString().split('T')[0])
      ).length;
      
      setTodayStats(prev => ({ ...prev, orders: todayOrders }));
    } catch (error) {
      console.error('Error fetching order data:', error);
      toast.error('Failed to fetch order data');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch stock data
  const fetchStockData = async () => {
    setLoadingStock(true);
    try {
      let query = supabase
        .from('stock')
        .select(`
          id,
          user_id,
          retailer_id,
          created_at,
          product_name,
          stock_quantity
        `)
        .order('created_at', { ascending: false });

      if (userFilter !== 'all') {
        query = query.eq('user_id', userFilter);
      }

      // Apply date filter for stock
      const stockToday = new Date();
      const stockStartOfToday = new Date(stockToday.getFullYear(), stockToday.getMonth(), stockToday.getDate());
      
      if (stockDateFilter === 'today') {
        query = query.gte('created_at', stockStartOfToday.toISOString());
      } else if (stockDateFilter === 'week') {
        const weekAgo = new Date(stockStartOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (stockDateFilter === 'month') {
        const monthAgo = new Date(stockStartOfToday);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      } else if (stockDateFilter === 'custom' && stockCustomRange.from) {
        query = query.gte('created_at', stockCustomRange.from.toISOString());
        if (stockCustomRange.to) {
          const endOfDay = new Date(stockCustomRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }
      }

      const { data: stockData, error } = await query;
      if (error) throw error;

      // Get user and retailer data separately
      const userIds = [...new Set(stockData?.map(s => s.user_id) || [])];
      const retailerIds = [...new Set(stockData?.map(s => s.retailer_id) || [])];

      const [{ data: usersData }, { data: retailersData }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, username').in('id', userIds),
        supabase.from('retailers').select('id, name').in('id', retailerIds)
      ]);

      const formattedData = stockData?.map(stock => {
        const user = usersData?.find(u => u.id === stock.user_id);
        const retailer = retailersData?.find(r => r.id === stock.retailer_id);
        
        return {
          id: stock.id,
          user_name: user?.full_name || user?.username || 'Unknown',
          retailer_name: retailer?.name || 'Unknown',
          created_at: stock.created_at,
          product_name: stock.product_name,
          stock_quantity: stock.stock_quantity
        };
      }) || [];

      setStockData(formattedData);

      // Calculate today's stock updates
      const todayStock = formattedData.filter(item => 
        item.created_at.startsWith(stockToday.toISOString().split('T')[0])
      ).length;
      
      setTodayStats(prev => ({ ...prev, stockUpdates: todayStock }));
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast.error('Failed to fetch stock data');
    } finally {
      setLoadingStock(false);
    }
  };

  // Filter data based on search term
  const filterData = (data: any[], searchFields: string[]) => {
    if (!searchTerm) return data;
    return data.filter(item =>
      searchFields.some(field =>
        item[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  // Export to CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const csvContent = [
      headers,
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Initial data fetch (ensure users are loaded before building check-ins)
  useEffect(() => {
    (async () => {
      await fetchUsers();
      await fetchCheckInData();
      await fetchOrderData();
      await fetchStockData();
    })();
  }, [userFilter, checkinDateFilter, orderDateFilter, stockDateFilter, checkinCustomRange, orderCustomRange, stockCustomRange]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (activeTab === 'checkins') fetchCheckInData();
      if (activeTab === 'orders') fetchOrderData();
      if (activeTab === 'stock') fetchStockData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [activeTab, autoRefresh, userFilter, checkinDateFilter, orderDateFilter, stockDateFilter, checkinCustomRange, orderCustomRange, stockCustomRange]);

  // Real-time subscriptions
  useEffect(() => {
    if (!autoRefresh) return;

    const visitsChannel = supabase
      .channel('visits-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => {
        fetchCheckInData();
      })
      .subscribe();

    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrderData();
      })
      .subscribe();

    const stockChannel = supabase
      .channel('stock-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, () => {
        fetchStockData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(visitsChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(stockChannel);
    };
  }, [autoRefresh, userFilter, checkinDateFilter, orderDateFilter, stockDateFilter, checkinCustomRange, orderCustomRange, stockCustomRange]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    navigate('/dashboard');
    return null;
  }

  const filteredCheckInData = filterData(checkInData, ['user_name', 'retailer_name']);
  const filteredOrderData = filterData(orderData, ['user_name', 'retailer_name']);
  const filteredStockData = filterData(stockData, ['user_name', 'retailer_name', 'product_name']);

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate('/admin-controls')} 
              variant="ghost" 
              size="sm"
              className="p-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Operations Dashboard</h1>
              <p className="text-muted-foreground">Monitor real-time operations and data</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Auto-refresh</span>
              <Switch 
                checked={autoRefresh} 
                onCheckedChange={setAutoRefresh}
              />
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Check-ins Today</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{todayStats.checkins}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{todayStats.orders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Updates Today</CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{todayStats.stockUpdates}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Operations Monitor</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === 'checkins') fetchCheckInData();
                  if (activeTab === 'orders') fetchOrderData();
                  if (activeTab === 'stock') fetchStockData();
                }}
              >
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="checkins">Check-in & Check-out</TabsTrigger>
                <TabsTrigger value="orders">Order Data</TabsTrigger>
                <TabsTrigger value="stock">Stock Data</TabsTrigger>
                <TabsTrigger value="payments">Payment Proofs</TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 mt-4 mb-6">
                <div className="flex items-center gap-2">
                  <Search size={16} />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Date Filter for Check-ins */}
                {activeTab === 'checkins' && (
                  <>
                    <Select value={checkinDateFilter} onValueChange={(val) => {
                      setCheckinDateFilter(val);
                      if (val !== 'custom') {
                        setCheckinCustomRange({ from: null, to: null });
                      }
                    }}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                    {checkinDateFilter === 'custom' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={checkinCustomRange.from ? checkinCustomRange.from.toISOString().split('T')[0] : ''}
                          onChange={(e) => setCheckinCustomRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : null }))}
                          className="w-40"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="date"
                          value={checkinCustomRange.to ? checkinCustomRange.to.toISOString().split('T')[0] : ''}
                          onChange={(e) => setCheckinCustomRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : null }))}
                          className="w-40"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Date Filter for Orders */}
                {activeTab === 'orders' && (
                  <>
                    <Select value={orderDateFilter} onValueChange={(val) => {
                      setOrderDateFilter(val);
                      if (val !== 'custom') {
                        setOrderCustomRange({ from: null, to: null });
                      }
                    }}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                    {orderDateFilter === 'custom' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={orderCustomRange.from ? orderCustomRange.from.toISOString().split('T')[0] : ''}
                          onChange={(e) => setOrderCustomRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : null }))}
                          className="w-40"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="date"
                          value={orderCustomRange.to ? orderCustomRange.to.toISOString().split('T')[0] : ''}
                          onChange={(e) => setOrderCustomRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : null }))}
                          className="w-40"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Date Filter for Stock */}
                {activeTab === 'stock' && (
                  <>
                    <Select value={stockDateFilter} onValueChange={(val) => {
                      setStockDateFilter(val);
                      if (val !== 'custom') {
                        setStockCustomRange({ from: null, to: null });
                      }
                    }}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                    {stockDateFilter === 'custom' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={stockCustomRange.from ? stockCustomRange.from.toISOString().split('T')[0] : ''}
                          onChange={(e) => setStockCustomRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : null }))}
                          className="w-40"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="date"
                          value={stockCustomRange.to ? stockCustomRange.to.toISOString().split('T')[0] : ''}
                          onChange={(e) => setStockCustomRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : null }))}
                          className="w-40"
                        />
                      </div>
                    )}
                  </>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => {
                    if (activeTab === 'checkins') exportToCSV(filteredCheckInData, 'checkin-data');
                    if (activeTab === 'orders') exportToCSV(filteredOrderData, 'order-data');
                    if (activeTab === 'stock') exportToCSV(filteredStockData, 'stock-data');
                  }}
                >
                  <Download size={16} className="mr-2" />
                  Export CSV
                </Button>
              </div>

              {/* Check-in/Check-out Tab */}
              <TabsContent value="checkins">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead>Retailer Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Check-in Time</TableHead>
                        <TableHead>Check-out Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Face Match</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingCheckins ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ) : filteredCheckInData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No check-in data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCheckInData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.user_name}</TableCell>
                            <TableCell>{item.retailer_name}</TableCell>
                            <TableCell>
                              {item.skip_check_in_time ? (
                                <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                                  {item.skip_check_in_reason === 'phone-order' ? 'Phone Order' : 'Other Reason'}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Normal Visit
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.check_in_time ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {format(new Date(item.check_in_time), 'MMM dd, HH:mm')}
                                  </Badge>
                                </div>
                              ) : item.skip_check_in_time ? (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  {format(new Date(item.skip_check_in_time), 'MMM dd, HH:mm')}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.check_out_time ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  {format(new Date(item.check_out_time), 'MMM dd, HH:mm')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  In Progress
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.status === 'unproductive' && item.no_order_reason ? (
                                <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
                                  Unproductive
                                </Badge>
                              ) : item.status === 'productive' ? (
                                <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
                                  Productive
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  {item.status || 'Pending'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.face_match_confidence !== null && item.face_match_confidence !== undefined ? (
                                <Badge 
                                  variant={
                                    item.face_match_confidence >= 70 ? 'default' : 
                                    item.face_match_confidence >= 40 ? 'secondary' : 
                                    'destructive'
                                  }
                                  className={cn(
                                    item.face_match_confidence >= 70 && "bg-green-500 hover:bg-green-600",
                                    item.face_match_confidence >= 40 && item.face_match_confidence < 70 && "bg-amber-500 hover:bg-amber-600"
                                  )}
                                >
                                  {item.face_match_confidence >= 70 ? '✅' : 
                                   item.face_match_confidence >= 40 ? '⚠️' : '❌'}
                                  {' '}
                                  {Math.round(item.face_match_confidence)}%
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye size={16} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Visit Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium">User</label>
                                        <p className="text-sm text-muted-foreground">{item.user_name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Retailer</label>
                                        <p className="text-sm text-muted-foreground">{item.retailer_name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Visit Type</label>
                                        <p className="text-sm text-muted-foreground">
                                          {item.skip_check_in_time ? (
                                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                                              {item.skip_check_in_reason === 'phone-order' ? 'Phone Order' : 'Other Reason'}
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                              Normal Visit
                                            </Badge>
                                          )}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Status</label>
                                        <p className="text-sm text-muted-foreground">
                                          {item.status === 'unproductive' && item.no_order_reason ? (
                                            <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
                                              Unproductive
                                            </Badge>
                                          ) : item.status === 'productive' ? (
                                            <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
                                              Productive
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary">{item.status || 'Pending'}</Badge>
                                          )}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Check-in Time</label>
                                        <p className="text-sm text-muted-foreground">
                                          {item.check_in_time ? format(new Date(item.check_in_time), 'PPpp') : 
                                           item.skip_check_in_time ? format(new Date(item.skip_check_in_time), 'PPpp') : '-'}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Check-out Time</label>
                                        <p className="text-sm text-muted-foreground">
                                          {item.check_out_time ? format(new Date(item.check_out_time), 'PPpp') : 'Still in progress'}
                                        </p>
                                      </div>
                                      {item.check_in_address && (
                                        <div>
                                          <label className="text-sm font-medium">Check-in Address</label>
                                          <p className="text-sm text-muted-foreground">{item.check_in_address}</p>
                                        </div>
                                      )}
                                      {item.check_out_address && (
                                        <div>
                                          <label className="text-sm font-medium">Check-out Address</label>
                                          <p className="text-sm text-muted-foreground">{item.check_out_address}</p>
                                        </div>
                                      )}
                                      {item.skip_check_in_reason && (
                                        <div className="col-span-2">
                                          <label className="text-sm font-medium">Skip Check-in Reason</label>
                                          <p className="text-sm text-muted-foreground">
                                            {item.skip_check_in_reason === 'phone-order' ? 'Phone Order' : 
                                             item.skip_check_in_reason.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                          </p>
                                        </div>
                                      )}
                                       {item.no_order_reason && (
                                        <div className="col-span-2">
                                          <label className="text-sm font-medium">No Order Reason</label>
                                          <p className="text-sm text-muted-foreground">
                                            {item.no_order_reason.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                          </p>
                                        </div>
                                      )}
                                     </div>
                                     
                                     {/* Face Verification Section */}
                                     {item.face_match_confidence !== null && item.face_match_confidence !== undefined && (
                                       <div className="space-y-3 pt-4 border-t">
                                         <label className="text-sm font-medium">Face Verification</label>
                                         <div className={`p-4 rounded-lg ${
                                           item.face_match_confidence >= 70 ? 'bg-green-50 border-green-200' :
                                           item.face_match_confidence >= 40 ? 'bg-amber-50 border-amber-200' :
                                           'bg-red-50 border-red-200'
                                         } border`}>
                                           <div className="flex items-center justify-between mb-3">
                                             <div className="flex items-center gap-3">
                                               <span className="text-2xl">
                                                 {item.face_match_confidence >= 70 ? '✅' : 
                                                  item.face_match_confidence >= 40 ? '⚠️' : '❌'}
                                               </span>
                                               <div>
                                                 <p className="font-medium">
                                                   {item.face_match_confidence >= 70 ? 'Match Verified' :
                                                    item.face_match_confidence >= 40 ? 'Partial Match' :
                                                    'Match Failed'}
                                                 </p>
                                                 <p className="text-sm text-muted-foreground">
                                                   Confidence: {item.face_match_confidence.toFixed(1)}%
                                                 </p>
                                               </div>
                                             </div>
                                             <Badge 
                                               variant={
                                                 item.face_match_confidence >= 70 ? 'default' : 
                                                 item.face_match_confidence >= 40 ? 'secondary' : 
                                                 'destructive'
                                               }
                                               className={`${
                                                 item.face_match_confidence >= 70 ? 'bg-green-500' :
                                                 item.face_match_confidence >= 40 ? 'bg-amber-500' : ''
                                               }`}
                                             >
                                               {Math.round(item.face_match_confidence)}%
                                             </Badge>
                                           </div>
                                           
                                           {/* Display both photos for comparison */}
                                           {(item.profile_picture_url || item.attendance_photo_url) && (
                                             <div className="grid grid-cols-2 gap-4 mt-3">
                                               {item.profile_picture_url && (
                                                 <div className="space-y-2">
                                                   <p className="text-xs text-muted-foreground">Profile Photo</p>
                                                   <img 
                                                     src={item.profile_picture_url} 
                                                     alt="Profile" 
                                                     className="w-full h-32 object-cover rounded-lg border"
                                                   />
                                                 </div>
                                               )}
                                               {item.attendance_photo_url && (
                                                 <div className="space-y-2">
                                                   <p className="text-xs text-muted-foreground">Check-in Photo</p>
                                                   <img 
                                                     src={item.attendance_photo_url} 
                                                     alt="Attendance" 
                                                     className="w-full h-32 object-cover rounded-lg border"
                                                   />
                                                 </div>
                                               )}
                                             </div>
                                           )}
                                         </div>
                                       </div>
                                     )}

                                     {(item.check_in_photo_url || item.check_out_photo_url) && (
                                       <div className="space-y-3 pt-4 border-t">
                                         <label className="text-sm font-medium">Visit Photos</label>
                                         <div className="grid grid-cols-2 gap-4">
                                           {item.check_in_photo_url && (
                                             <div className="space-y-2">
                                               <p className="text-xs text-muted-foreground">Check-in Photo</p>
                                               <img 
                                                 src={item.check_in_photo_url} 
                                                 alt="Check-in" 
                                                 className="w-full h-48 object-cover rounded-lg border"
                                               />
                                             </div>
                                           )}
                                           {item.check_out_photo_url && (
                                             <div className="space-y-2">
                                               <p className="text-xs text-muted-foreground">Check-out Photo</p>
                                               <img 
                                                 src={item.check_out_photo_url}
                                                alt="Check-out" 
                                                className="w-full h-48 object-cover rounded-lg border"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead>Retailer Name</TableHead>
                        <TableHead>Order Date & Time</TableHead>
                        <TableHead>Order Value</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingOrders ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ) : filteredOrderData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No order data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrderData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.user_name}</TableCell>
                            <TableCell>{item.retailer_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {format(new Date(item.created_at), 'MMM dd, HH:mm')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">₹{item.total_amount.toLocaleString()}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{item.items.length} items</Badge>
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye size={16} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>Order Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium">User</label>
                                        <p className="text-sm text-muted-foreground">{item.user_name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Retailer</label>
                                        <p className="text-sm text-muted-foreground">{item.retailer_name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Order Date & Time</label>
                                        <p className="text-sm text-muted-foreground">
                                          {format(new Date(item.created_at), 'PPpp')}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Total Amount</label>
                                        <p className="text-sm font-medium">₹{item.total_amount.toLocaleString()}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Order Items</label>
                                      <div className="mt-2 border rounded-md">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Product</TableHead>
                                              <TableHead>Quantity</TableHead>
                                              <TableHead>Rate</TableHead>
                                              <TableHead>Total</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {item.items.map((orderItem, index) => (
                                              <TableRow key={index}>
                                                <TableCell>{orderItem.product_name}</TableCell>
                                                <TableCell>{orderItem.quantity}</TableCell>
                                                <TableCell>₹{orderItem.rate}</TableCell>
                                                <TableCell>₹{orderItem.total}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Stock Tab */}
              <TabsContent value="stock">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead>Retailer Name</TableHead>
                        <TableHead>Update Date & Time</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Stock Quantity</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingStock ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ) : filteredStockData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No stock data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStockData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.user_name}</TableCell>
                            <TableCell>{item.retailer_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                {format(new Date(item.created_at), 'MMM dd, HH:mm')}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{item.stock_quantity} units</Badge>
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye size={16} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Stock Update Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium">User</label>
                                        <p className="text-sm text-muted-foreground">{item.user_name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Retailer</label>
                                        <p className="text-sm text-muted-foreground">{item.retailer_name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Update Date & Time</label>
                                        <p className="text-sm text-muted-foreground">
                                          {format(new Date(item.created_at), 'PPpp')}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Product Name</label>
                                        <p className="text-sm text-muted-foreground">{item.product_name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Stock Quantity</label>
                                        <p className="text-sm font-medium">{item.stock_quantity} units</p>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Payment Proofs Tab */}
              <TabsContent value="payments">
                <PaymentProofsView />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Operations;