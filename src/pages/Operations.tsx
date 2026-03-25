import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useManagedInterval } from '@/utils/intervalManager';
import { useAdminAccess } from '@/hooks/useAdminAccess';
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
import { ArrowLeft, Download, Search, Eye, RefreshCw, MapPin, Clock, Package, DollarSign, User, RotateCcw, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { downloadCSV } from '@/utils/fileDownloader';
import { PaymentProofsView } from '@/components/admin/PaymentProofsView';
import { OperationsSummaryBoxes } from '@/components/operations/OperationsSummaryBoxes';
import EditOrderDialog from '@/components/EditOrderDialog';
import { SignedImage } from '@/components/ui/signed-image';

interface CheckInOutData {
  id: string;
  user_id: string;
  user_name: string;
  retailer_name: string;
  retailer_id: string;
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
  // New fields
  time_spent_seconds?: number | null;
  location_status?: string | null;
  return_data?: {
    product_name: string;
    quantity: number;
    reason?: string;
  }[];
}

interface OrderData {
  id: string;
  user_name: string;
  retailer_name: string;
  created_at: string;
  updated_at: string;
  total_amount: number;
  status: string;
  items: any[];
  is_edited: boolean;
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
  const { hasAdminAccess, loading } = useAdminAccess();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('checkins');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [summaryDateFilter, setSummaryDateFilter] = useState<'today' | 'week' | 'month'>('today');
  
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
  const [competitorData, setCompetitorData] = useState<any[]>([]);
  const [returnStockData, setReturnStockData] = useState<any[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Loading states
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingCompetitor, setLoadingCompetitor] = useState(false);
  const [loadingReturnStock, setLoadingReturnStock] = useState(false);
  const [loadingCancelled, setLoadingCancelled] = useState(false);
  
  // Date filter for competitor and return stock
  const [competitorDateFilter, setCompetitorDateFilter] = useState('today');
  const [returnStockDateFilter, setReturnStockDateFilter] = useState('today');
  
  // Summary counters
  const [todayStats, setTodayStats] = useState({
    checkins: 0,
    orders: 0,
    stockUpdates: 0
  });
  
  // Edit order dialog state
  const [editOrderDialogOpen, setEditOrderDialogOpen] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<{ id: string; retailer_name: string } | null>(null);

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
              : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1${signedUrlData.signedUrl}`;
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
              : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1${signedUrlData.signedUrl}`;
          }
        }

        // Fetch face matching data from attendance table
        let faceMatchConfidence = null;
        let faceVerificationStatus = null;
        let attendancePhotoUrl = null;
        let profilePictureUrl = null;

        if (visit.check_in_time && visit.user_id) {
          try {
            const checkInDate = new Date(visit.check_in_time).toISOString().split('T')[0];
            const { data: attendanceData } = await supabase
              .from('attendance')
              .select('face_match_confidence, face_verification_status, check_in_photo_url')
              .eq('user_id', visit.user_id)
              .eq('date', checkInDate)
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
                    : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1${signedUrlData.signedUrl}`;
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
        
        // Fetch visit log data for time spent and location status
        // Join by retailer_id, user_id, and visit_date since visit_id may be NULL
        let timeSpentSeconds: number | null = null;
        let locationStatus: string | null = null;
        
        try {
          const { data: visitLogData } = await supabase
            .from('retailer_visit_logs')
            .select('time_spent_seconds, location_status')
            .eq('retailer_id', visit.retailer_id)
            .eq('user_id', visit.user_id)
            .eq('visit_date', visit.planned_date)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (visitLogData) {
            timeSpentSeconds = visitLogData.time_spent_seconds;
            locationStatus = visitLogData.location_status;
          }
        } catch (err) {
          console.warn('Error fetching visit log data:', err);
        }

        // Calculate time spent from check-in/check-out if not from visit log
        if (!timeSpentSeconds && visit.check_in_time && visit.check_out_time) {
          const checkIn = new Date(visit.check_in_time).getTime();
          const checkOut = new Date(visit.check_out_time).getTime();
          timeSpentSeconds = Math.round((checkOut - checkIn) / 1000);
        }

        // Return stock data - we'll display from orders with return items if available
        let returnData: { product_name: string; quantity: number; reason?: string }[] = [];
        try {
          // Check for return items in orders associated with this visit
          const { data: orderData } = await supabase
            .from('orders')
            .select('id')
            .eq('visit_id', visit.id)
            .maybeSingle();
          
          if (orderData) {
            const { data: returnItems } = await supabase
              .from('order_items')
              .select('product_name, quantity')
              .eq('order_id', orderData.id)
              .lt('quantity', 0); // Negative quantities indicate returns
            
            if (returnItems && returnItems.length > 0) {
              returnData = returnItems.map(item => ({
                product_name: item.product_name,
                quantity: Math.abs(item.quantity),
                reason: 'Return'
              }));
            }
          }
        } catch (err) {
          console.warn('Error fetching return data:', err);
        }

        return {
          id: visit.id,
          user_id: visit.user_id,
          retailer_id: visit.retailer_id,
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
          profile_picture_url: profilePictureUrl,
          time_spent_seconds: timeSpentSeconds,
          location_status: locationStatus,
          return_data: returnData
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
          updated_at,
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
        
        // Check if order was edited (updated_at differs from created_at by more than 5 seconds)
        const createdTime = new Date(order.created_at).getTime();
        const updatedTime = order.updated_at ? new Date(order.updated_at).getTime() : createdTime;
        const isEdited = Math.abs(updatedTime - createdTime) > 5000; // 5 second threshold
        
        return {
          id: order.id,
          user_name: user?.full_name || user?.username || 'Unknown',
          retailer_name: order.retailer_name || 'Unknown',
          created_at: order.created_at,
          updated_at: order.updated_at || order.created_at,
          total_amount: order.total_amount,
          status: order.status,
          items: order.order_items || [],
          is_edited: isEdited
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

  // Fetch competitor data
  const fetchCompetitorData = async () => {
    setLoadingCompetitor(true);
    try {
      const competitorToday = new Date();
      const startOfToday = new Date(competitorToday.getFullYear(), competitorToday.getMonth(), competitorToday.getDate());
      
      let query = supabase
        .from('competition_data')
        .select(`
          id,
          user_id,
          retailer_id,
          competitor_id,
          sku_id,
          stock_quantity,
          selling_price,
          insight,
          impact_level,
          created_at,
          competition_master(competitor_name),
          competition_skus(sku_name),
          retailers(name)
        `)
        .order('created_at', { ascending: false });

      if (userFilter !== 'all') {
        query = query.eq('user_id', userFilter);
      }

      // Apply date filter
      if (competitorDateFilter === 'today') {
        query = query.gte('created_at', startOfToday.toISOString());
      } else if (competitorDateFilter === 'week') {
        const weekAgo = new Date(startOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (competitorDateFilter === 'month') {
        const monthAgo = new Date(startOfToday);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get user names
      const userIds = [...new Set(data?.map(d => d.user_id).filter(Boolean) || [])];
      let usersData: any[] = [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);
        usersData = profiles || [];
      }

      const formattedData = data?.map(item => {
        const user = usersData.find(u => u.id === item.user_id);
        return {
          ...item,
          user_name: user?.full_name || user?.username || 'Unknown',
          retailer_name: (item.retailers as any)?.name || 'Unknown',
          competitor_name: (item.competition_master as any)?.competitor_name || 'Unknown',
          sku_name: (item.competition_skus as any)?.sku_name || '-'
        };
      }) || [];

      setCompetitorData(formattedData);
    } catch (error) {
      console.error('Error fetching competitor data:', error);
      toast.error('Failed to fetch competitor data');
    } finally {
      setLoadingCompetitor(false);
    }
  };

  // Fetch return stock data
  const fetchReturnStockData = async () => {
    setLoadingReturnStock(true);
    try {
      const returnToday = new Date();
      const startOfToday = new Date(returnToday.getFullYear(), returnToday.getMonth(), returnToday.getDate());
      
      let query = supabase
        .from('van_return_grn')
        .select(`
          id,
          user_id,
          retailer_id,
          van_id,
          return_date,
          return_grn_number,
          notes,
          created_at,
          retailers(name),
          vans(registration_number, make_model)
        `)
        .order('created_at', { ascending: false });

      if (userFilter !== 'all') {
        query = query.eq('user_id', userFilter);
      }

      // Apply date filter
      if (returnStockDateFilter === 'today') {
        query = query.gte('return_date', startOfToday.toISOString().split('T')[0]);
      } else if (returnStockDateFilter === 'week') {
        const weekAgo = new Date(startOfToday);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('return_date', weekAgo.toISOString().split('T')[0]);
      } else if (returnStockDateFilter === 'month') {
        const monthAgo = new Date(startOfToday);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('return_date', monthAgo.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get user names
      const userIds = [...new Set(data?.map(d => d.user_id).filter(Boolean) || [])];
      let usersData: any[] = [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);
        usersData = profiles || [];
      }

      // Get return items for each GRN
      const grnIds = data?.map(d => d.id) || [];
      let returnItemsData: any[] = [];
      if (grnIds.length > 0) {
        const { data: items } = await supabase
          .from('van_return_grn_items')
          .select(`
            id,
            return_grn_id,
            product_id,
            variant_id,
            return_quantity,
            return_reason,
            products(name, rate),
            product_variants(variant_name, price)
          `)
          .in('return_grn_id', grnIds);
        returnItemsData = items || [];
      }

      const formattedData = data?.map(item => {
        const user = usersData.find(u => u.id === item.user_id);
        const itemDetails = returnItemsData.filter(ri => ri.return_grn_id === item.id);
        const totalQuantity = itemDetails.reduce((sum, i) => sum + (i.return_quantity || 0), 0);
        const totalValue = itemDetails.reduce((sum, i) => {
          const price = i.product_variants?.price || i.products?.rate || 0;
          return sum + (price * (i.return_quantity || 0) * 1.05);
        }, 0);
        
        return {
          ...item,
          user_name: user?.full_name || user?.username || 'Unknown',
          retailer_name: (item.retailers as any)?.name || 'Unknown',
          van_name: item.vans ? `${(item.vans as any).registration_number} - ${(item.vans as any).make_model}` : '-',
          items: itemDetails,
          total_quantity: totalQuantity,
          total_value: Math.round(totalValue)
        };
      }) || [];

      setReturnStockData(formattedData);
    } catch (error) {
      console.error('Error fetching return stock data:', error);
      toast.error('Failed to fetch return stock data');
    } finally {
      setLoadingReturnStock(false);
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
  const exportToCSV = async (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const csvContent = [
      headers,
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    await downloadCSV(csvContent, `${filename}-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  // Initial data fetch (ensure users are loaded before building check-ins)
  useEffect(() => {
    (async () => {
      await fetchUsers();
      await fetchCheckInData();
      await fetchOrderData();
      await fetchStockData();
      await fetchCompetitorData();
      await fetchReturnStockData();
    })();
  }, [userFilter, checkinDateFilter, orderDateFilter, stockDateFilter, competitorDateFilter, returnStockDateFilter, checkinCustomRange, orderCustomRange, stockCustomRange]);

  // Use managed interval for auto-refresh (pauses when app is hidden)
  const refreshActiveTab = useCallback(() => {
    if (activeTab === 'checkins') fetchCheckInData();
    if (activeTab === 'orders') fetchOrderData();
    if (activeTab === 'stock') fetchStockData();
    if (activeTab === 'competitor') fetchCompetitorData();
    if (activeTab === 'returnstock') fetchReturnStockData();
  }, [activeTab]);
  
  useManagedInterval(
    `operations-refresh-${activeTab}`,
    refreshActiveTab,
    60000, // Increased from 30s to 60s
    { enabled: autoRefresh, runWhenHidden: false }
  );

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

    const returnStockChannel = supabase
      .channel('return-stock-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'van_return_grn' }, () => {
        fetchReturnStockData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(visitsChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(stockChannel);
      supabase.removeChannel(returnStockChannel);
    };
  }, [autoRefresh, userFilter, checkinDateFilter, orderDateFilter, stockDateFilter, returnStockDateFilter, checkinCustomRange, orderCustomRange, stockCustomRange]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    navigate('/dashboard');
    return null;
  }

  const filteredCheckInData = filterData(checkInData, ['user_name', 'retailer_name']);
  const filteredOrderData = filterData(orderData, ['user_name', 'retailer_name']);
  const filteredStockData = filterData(stockData, ['user_name', 'retailer_name', 'product_name']);
  const filteredCompetitorData = filterData(competitorData, ['user_name', 'retailer_name', 'competitor_name']);
  const filteredReturnStockData = filterData(returnStockData, ['user_name', 'retailer_name', 'van_name']);

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

        {/* Operations Summary Boxes */}
        <OperationsSummaryBoxes 
          dateFilter={summaryDateFilter}
          onDateFilterChange={setSummaryDateFilter}
        />

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
                  if (activeTab === 'competitor') fetchCompetitorData();
                  if (activeTab === 'returnstock') fetchReturnStockData();
                }}
              >
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="checkins">Check-in/Out</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="stock">Stock</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="competitor">Competitor</TabsTrigger>
                <TabsTrigger value="returnstock">Return Stock</TabsTrigger>
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
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead>Retailer Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Total Time Spent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location Match</TableHead>
                        <TableHead>Return</TableHead>
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
                        filteredCheckInData.map((item) => {
                          // Format time spent
                          const formatTimeSpent = (seconds: number | null | undefined) => {
                            if (!seconds) return '-';
                            const hours = Math.floor(seconds / 3600);
                            const minutes = Math.floor((seconds % 3600) / 60);
                            if (hours > 0) {
                              return `${hours}h ${minutes}m`;
                            }
                            return `${minutes}m`;
                          };

                          // Get location match display
                          const getLocationMatchDisplay = (status: string | null | undefined) => {
                            if (!status) return { text: 'N/A', color: 'bg-gray-50 text-gray-700 border-gray-200' };
                            switch (status) {
                              case 'at_store':
                                return { text: 'At Store', color: 'bg-green-50 text-green-700 border-green-200' };
                              case 'within_range':
                                return { text: '<50m', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
                              case 'out_of_range':
                                return { text: 'Not at Store', color: 'bg-red-50 text-red-700 border-red-200' };
                              default:
                                return { text: status, color: 'bg-gray-50 text-gray-700 border-gray-200' };
                            }
                          };

                          const locationDisplay = getLocationMatchDisplay(item.location_status);

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.user_name}</TableCell>
                              <TableCell>{item.retailer_name}</TableCell>
                              <TableCell>
                                {item.skip_check_in_time ? (
                                  <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {item.skip_check_in_reason === 'phone-order' ? 'Phone Order' : 'Other'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    Normal
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Clock size={14} className="text-muted-foreground" />
                                  <span className="font-medium">{formatTimeSpent(item.time_spent_seconds)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.status === 'unproductive' ? (
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
                                <Badge variant="outline" className={locationDisplay.color}>
                                  <MapPin size={12} className="mr-1" />
                                  {locationDisplay.text}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.return_data && item.return_data.length > 0 ? (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                    {item.return_data.length} item(s)
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
                                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                                          <p className="text-sm">
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
                                          <p className="text-sm">
                                            {item.status === 'unproductive' ? (
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
                                      </div>

                                      {/* Time Details Section */}
                                      <div className="p-4 rounded-lg bg-muted/50 border">
                                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                          <Clock size={16} />
                                          Time Details
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                          <div>
                                            <label className="text-xs text-muted-foreground">Check-in Time</label>
                                            <p className="text-sm font-medium">
                                              {item.check_in_time ? format(new Date(item.check_in_time), 'MMM dd, HH:mm') : 
                                               item.skip_check_in_time ? format(new Date(item.skip_check_in_time), 'MMM dd, HH:mm') : '-'}
                                            </p>
                                          </div>
                                          <div>
                                            <label className="text-xs text-muted-foreground">Check-out Time</label>
                                            <p className="text-sm font-medium">
                                              {item.check_out_time ? format(new Date(item.check_out_time), 'MMM dd, HH:mm') : 'In Progress'}
                                            </p>
                                          </div>
                                          <div>
                                            <label className="text-xs text-muted-foreground">Total Time Spent</label>
                                            <p className="text-sm font-medium text-primary">
                                              {formatTimeSpent(item.time_spent_seconds)}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Location Details Section */}
                                      <div className="p-4 rounded-lg bg-muted/50 border">
                                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                          <MapPin size={16} />
                                          Location Details
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <label className="text-xs text-muted-foreground">Location Match</label>
                                            <p className="text-sm">
                                              <Badge variant="outline" className={locationDisplay.color}>
                                                {locationDisplay.text}
                                              </Badge>
                                            </p>
                                          </div>
                                          {item.check_in_address && (
                                            <div>
                                              <label className="text-xs text-muted-foreground">Check-in Address</label>
                                              <p className="text-sm text-muted-foreground">{item.check_in_address}</p>
                                            </div>
                                          )}
                                          {item.check_out_address && (
                                            <div>
                                              <label className="text-xs text-muted-foreground">Check-out Address</label>
                                              <p className="text-sm text-muted-foreground">{item.check_out_address}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Return Data Section */}
                                      {item.return_data && item.return_data.length > 0 && (
                                        <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-orange-700">
                                            <Package size={16} />
                                            Return Stock
                                          </h4>
                                          <div className="space-y-2">
                                            {item.return_data.map((returnItem, idx) => (
                                              <div key={idx} className="flex justify-between items-center text-sm">
                                                <span>{returnItem.product_name}</span>
                                                <span className="font-medium">{returnItem.quantity} units</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Reasons Section */}
                                      {(item.skip_check_in_reason || item.no_order_reason) && (
                                        <div className="p-4 rounded-lg bg-muted/50 border">
                                          <h4 className="text-sm font-medium mb-3">Reasons</h4>
                                          {item.skip_check_in_reason && (
                                            <div className="mb-2">
                                              <label className="text-xs text-muted-foreground">Skip Check-in Reason</label>
                                              <p className="text-sm">
                                                {item.skip_check_in_reason === 'phone-order' ? 'Phone Order' : 
                                                 item.skip_check_in_reason.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                              </p>
                                            </div>
                                          )}
                                          {item.no_order_reason && (
                                            <div>
                                              <label className="text-xs text-muted-foreground">No Order Reason</label>
                                              <p className="text-sm">
                                                {item.no_order_reason.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Face Verification Section */}
                                      {item.face_match_confidence !== null && item.face_match_confidence !== undefined && (
                                        <div className={`p-4 rounded-lg border ${
                                          item.face_match_confidence >= 70 ? 'bg-green-50 border-green-200' :
                                          item.face_match_confidence >= 40 ? 'bg-amber-50 border-amber-200' :
                                          'bg-red-50 border-red-200'
                                        }`}>
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                              <span className="text-2xl">
                                                {item.face_match_confidence >= 70 ? '✅' : 
                                                 item.face_match_confidence >= 40 ? '⚠️' : '❌'}
                                              </span>
                                              <div>
                                                <p className="font-medium">Face Verification</p>
                                                <p className="text-sm text-muted-foreground">
                                                  Confidence: {item.face_match_confidence.toFixed(1)}%
                                                </p>
                                              </div>
                                            </div>
                                            <Badge 
                                              variant={item.face_match_confidence >= 70 ? 'default' : item.face_match_confidence >= 40 ? 'secondary' : 'destructive'}
                                              className={item.face_match_confidence >= 70 ? 'bg-green-500' : item.face_match_confidence >= 40 ? 'bg-amber-500' : ''}
                                            >
                                              {Math.round(item.face_match_confidence)}%
                                            </Badge>
                                          </div>
                                          {(item.profile_picture_url || item.attendance_photo_url) && (
                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                              {item.profile_picture_url && (
                                                <div className="space-y-2">
                                                  <p className="text-xs text-muted-foreground">Profile Photo</p>
                                                  <SignedImage src={item.profile_picture_url} alt="Profile" className="w-full h-32 object-cover rounded-lg border" />
                                                </div>
                                              )}
                                              {item.attendance_photo_url && (
                                                <div className="space-y-2">
                                                  <p className="text-xs text-muted-foreground">Check-in Photo</p>
                                                  <SignedImage src={item.attendance_photo_url} alt="Attendance" className="w-full h-32 object-cover rounded-lg border" />
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Visit Photos */}
                                      {(item.check_in_photo_url || item.check_out_photo_url) && (
                                        <div className="space-y-3 pt-4 border-t">
                                          <label className="text-sm font-medium">Visit Photos</label>
                                          <div className="grid grid-cols-2 gap-4">
                                            {item.check_in_photo_url && (
                                              <div className="space-y-2">
                                                <p className="text-xs text-muted-foreground">Check-in Photo</p>
                                                <img src={item.check_in_photo_url} alt="Check-in" className="w-full h-48 object-cover rounded-lg border" />
                                              </div>
                                            )}
                                            {item.check_out_photo_url && (
                                              <div className="space-y-2">
                                                <p className="text-xs text-muted-foreground">Check-out Photo</p>
                                                <img src={item.check_out_photo_url} alt="Check-out" className="w-full h-48 object-cover rounded-lg border" />
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
                          );
                        })
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
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.retailer_name}
                                {item.is_edited && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                                    Edited
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
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
                              <div className="flex items-center gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" title="View">
                                      <Eye size={16} />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        Order Details
                                        {item.is_edited && (
                                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                                            Edited
                                          </Badge>
                                        )}
                                      </DialogTitle>
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
                                        {item.is_edited && (
                                          <div className="col-span-2">
                                            <label className="text-sm font-medium">Last Modified</label>
                                            <p className="text-sm text-muted-foreground">
                                              {format(new Date(item.updated_at), 'PPpp')}
                                            </p>
                                          </div>
                                        )}
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
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="Edit Order"
                                  onClick={() => {
                                    setSelectedOrderForEdit({ id: item.id, retailer_name: item.retailer_name });
                                    setEditOrderDialogOpen(true);
                                  }}
                                >
                                  <Pencil size={16} />
                                </Button>
                              </div>
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

              {/* Competitor Tab */}
              <TabsContent value="competitor">
                <div className="flex gap-4 mb-4">
                  <Select value={competitorDateFilter} onValueChange={setCompetitorDateFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Retailer</TableHead>
                        <TableHead>Competitor</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingCompetitor ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ) : filteredCompetitorData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No competitor data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCompetitorData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.user_name}</TableCell>
                            <TableCell>{item.retailer_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                {item.competitor_name}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.sku_name}</TableCell>
                            <TableCell>₹{item.selling_price?.toLocaleString() || '-'}</TableCell>
                            <TableCell>{item.stock_quantity || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {format(new Date(item.created_at), 'MMM dd, HH:mm')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Return Stock Tab */}
              <TabsContent value="returnstock">
                <div className="flex gap-4 mb-4">
                  <Select value={returnStockDateFilter} onValueChange={setReturnStockDateFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Retailer</TableHead>
                        <TableHead>Van</TableHead>
                        <TableHead>GRN No.</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total Qty</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingReturnStock ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ) : filteredReturnStockData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No return stock data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReturnStockData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.user_name}</TableCell>
                            <TableCell>{item.retailer_name}</TableCell>
                            <TableCell>{item.van_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                {item.return_grn_number}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{item.items?.length || 0} items</Badge>
                            </TableCell>
                            <TableCell>{item.total_quantity}</TableCell>
                            <TableCell>₹{item.total_value?.toLocaleString() || 0}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {format(new Date(item.return_date), 'MMM dd, yyyy')}
                              </Badge>
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
                                    <DialogTitle>Return Stock Details - {item.return_grn_number}</DialogTitle>
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
                                        <label className="text-sm font-medium">Van</label>
                                        <p className="text-sm text-muted-foreground">{item.van_name}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Return Date</label>
                                        <p className="text-sm text-muted-foreground">
                                          {format(new Date(item.return_date), 'PPP')}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Total Quantity</label>
                                        <p className="text-sm font-medium">{item.total_quantity}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">Total Value</label>
                                        <p className="text-sm font-medium">₹{item.total_value?.toLocaleString() || 0}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Return Items</label>
                                      <div className="mt-2 border rounded-md">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Product</TableHead>
                                              <TableHead>Quantity</TableHead>
                                              <TableHead>Reason</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {item.items?.map((returnItem: any, index: number) => (
                                              <TableRow key={index}>
                                                <TableCell>
                                                  {returnItem.product_variants?.variant_name || returnItem.products?.name || 'Unknown'}
                                                </TableCell>
                                                <TableCell>{returnItem.return_quantity}</TableCell>
                                                <TableCell>{returnItem.return_reason}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                    {item.notes && (
                                      <div>
                                        <label className="text-sm font-medium">Notes</label>
                                        <p className="text-sm text-muted-foreground">{item.notes}</p>
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
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Order Dialog */}
      {selectedOrderForEdit && (
        <EditOrderDialog
          orderId={selectedOrderForEdit.id}
          retailerName={selectedOrderForEdit.retailer_name}
          open={editOrderDialogOpen}
          onOpenChange={setEditOrderDialogOpen}
          onSaved={() => {
            fetchOrderData();
            toast.success("Order updated - changes will reflect across the system");
          }}
        />
      )}
    </div>
  );
};

export default Operations;
