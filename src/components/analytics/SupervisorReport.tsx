import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { RefreshCw, X, Store, MapPin, Package, Scale, PieChartIcon, BarChart3, Sparkles, TrendingUp, AlertTriangle, Target, CheckCircle2, ChevronDown, Users, Download, Loader2, Activity, Volume2, ShoppingCart, IndianRupee, CreditCard, Eye, EyeOff, FileText } from 'lucide-react';
import { fetchAndGenerateInvoice } from '@/utils/invoiceGenerator';
import { downloadPDF } from '@/utils/fileDownloader';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RevenueBySKUSection } from './RevenueBySKUSection';
import { ProductivitySummarySection } from './ProductivitySummarySection';
import { AttendanceMarketHoursSection } from './AttendanceMarketHoursSection';
import { OrderDetailsAIInsights } from './OrderDetailsAIInsights';
import { Badge } from '@/components/ui/badge';
import { ReportSummaryDialog } from './ReportSummaryDialog';
import { BusinessSummaryCard, BeatDetailsDialog, RetailerDetailsDialog, OrderDetailsDialog, ProductBreakdownDialog, PendingPaymentsDialog, useBusinessMetrics } from '.';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
 import { useHindiToEnglish } from '@/hooks/useHindiToEnglish';
 import { RetailerSummarySection } from './RetailerSummarySection';
 import { LeaderboardSection } from './LeaderboardSection';
interface UserOrderSummary {
  full_name: string;
  total_order_value: number;
  total_kg: number;
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

interface SupervisorReportProps {
  users: UserProfile[];
  selectedUserIds: string[];
  dateRange: { from: Date; to: Date };
  isScopeReady?: boolean;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'];

export const SupervisorReport = ({ users, selectedUserIds, dateRange, isScopeReady = true }: SupervisorReportProps) => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  
  // Refs to track previous values and prevent duplicate fetches
  const prevFetchKeyRef = useRef<string>('');
  const isFetchingRef = useRef(false);
  const prevScopeReadyRef = useRef(isScopeReady);
  
  const [downloadingPDF, setDownloadingPDF] = useState(false);
   
   // Hindi to English translation for retailer/beat names in Productivity section
   const { translateTexts, getTranslated } = useHindiToEnglish();

  // Memoize stable keys to prevent unnecessary re-fetches
  const userIdsKey = useMemo(() => selectedUserIds.slice().sort().join(','), [selectedUserIds]);
  const dateRangeKey = useMemo(() => `${dateRange.from.getTime()}-${dateRange.to.getTime()}`, [dateRange.from, dateRange.to]);
  const usersKey = useMemo(() => users.length.toString(), [users.length]);

  // Derive selected user names from IDs for filtering
  const selectedUsers = useMemo(() => {
    if (selectedUserIds.length === 0) return [];
    return selectedUserIds
      .map(id => users.find(u => u.id === id)?.full_name)
      .filter((name): name is string => !!name);
  }, [selectedUserIds, users]);

  // Derived value for backward compatibility with single-user components
  const selectedUser = useMemo(() => {
    if (selectedUsers.length === 0) return 'all';
    if (selectedUsers.length === 1) return selectedUsers[0];
    return 'all'; // Multiple users = show all of them
  }, [selectedUsers]);
  const [summaryData, setSummaryData] = useState<UserOrderSummary[]>([]);
  const [selectedUserDetails, setSelectedUserDetails] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserOrderDetails[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSummary, setDetailsSummary] = useState<{
    retailers: number;
    beats: number;
    products: number;
    totalKg: number;
    productivityPercent: number | null;
  } | null>(null);
  const [allUsersSummary, setAllUsersSummary] = useState<{
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
  
  // State for order details beat breakdown (retailers/beats boxes)
  const [orderDetailsBeatBreakdown, setOrderDetailsBeatBreakdown] = useState<{
    beat_name: string;
    order_count: number;
    total_retailers: number;
    total_value: number;
  }[]>([]);
  const [orderDetailsBeatLoading, setOrderDetailsBeatLoading] = useState(false);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [hideOrderChart, setHideOrderChart] = useState(false);
  const [orderUserFilter, setOrderUserFilter] = useState<'all' | 'top5' | 'bottom5'>('all');

  // State for beat-wise split view in User Order Summary
  const [selectedSummaryUser, setSelectedSummaryUser] = useState<string | null>(null);
  const [beatBreakdownData, setBeatBreakdownData] = useState<{
    beat_name: string;
    total_value: number;
    order_count: number;
  }[]>([]);
  const [beatBreakdownLoading, setBeatBreakdownLoading] = useState(false);

  // State for retailer details popup (drill-down from beat)
  const [retailerDetailsOpen, setRetailerDetailsOpen] = useState(false);
  const [selectedBeatForDetails, setSelectedBeatForDetails] = useState<string | null>(null);
  const [retailerDetailsData, setRetailerDetailsData] = useState<{
    retailer_name: string;
    order_count: number;
    total_value: number;
    order_ids: string[];
  }[]>([]);
  const [retailerDetailsLoading, setRetailerDetailsLoading] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [loadingInvoiceView, setLoadingInvoiceView] = useState<string | null>(null);

  // State for SKU filter from chart clicks - when a user is clicked in Order Summary charts
  const [skuFilterUser, setSkuFilterUser] = useState<string | null>(null);
  
  // State for productivity drilldown from Order Details card
  const [productivityDrilldownUser, setProductivityDrilldownUser] = useState<string | null>(null);
  const [productivityDrilldownData, setProductivityDrilldownData] = useState<{
    planned_date: string;
    productive_visits: number;
    unproductive_visits: number;
    total_visits: number;
    productivity_percentage: number;
  }[]>([]);
  const [productivityDrilldownLoading, setProductivityDrilldownLoading] = useState(false);

  // State for report summary dialog
  const [reportSummaryOpen, setReportSummaryOpen] = useState(false);
  const [skuDataForSummary, setSkuDataForSummary] = useState<{
    product_name: string;
    quantity_sold: number;
    revenue: number;
    unit: string;
  }[]>([]);
  const [productivityDataForSummary, setProductivityDataForSummary] = useState<{
    full_name: string;
    productivity_percentage: number;
    productive_visits: number;
    total_visits: number;
  }[]>([]);

  // Business metrics hook for dashboard summary
  const {
    summary: businessSummary,
    isLoading: businessLoading,
    fetchSummary: fetchBusinessSummary,
    beatDetails,
    retailerDetails: businessRetailerDetails,
    orderDetails: businessOrderDetails,
    productDetails,
    pendingPaymentDetails,
    detailsLoading: businessDetailsLoading,
    fetchBeatDetails,
    fetchRetailerDetails: fetchBusinessRetailerDetails,
    fetchOrderDetails: fetchBusinessOrderDetails,
    fetchProductDetails,
    fetchPendingPaymentDetails
  } = useBusinessMetrics();

  // Dialog states for business summary cards
  const [showBeatDetails, setShowBeatDetails] = useState(false);
  const [showRetailerDetailsDialog, setShowRetailerDetailsDialog] = useState(false);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);
  const [showProductBreakdown, setShowProductBreakdown] = useState(false);
  const [showPendingPayments, setShowPendingPayments] = useState(false);

  // Memoized callbacks to prevent infinite loops in child components
  const handleSkuDataLoaded = useCallback((data: typeof skuDataForSummary) => {
    setSkuDataForSummary(data);
  }, []);

  const handleProductivityDataLoaded = useCallback((data: typeof productivityDataForSummary) => {
    setProductivityDataForSummary(data);
  }, []);

  const handleClearSkuFilter = useCallback(() => {
    setSkuFilterUser(null);
  }, []);

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

  // Auto-fetch data when props change
  useEffect(() => {
    // Reset fetch key when scope transitions from not ready to ready
    if (isScopeReady && !prevScopeReadyRef.current) {
      prevFetchKeyRef.current = '';
    }
    prevScopeReadyRef.current = isScopeReady;
    
    const fetchKey = `${userIdsKey}-${dateRangeKey}-${usersKey}`;
    
    // Skip if already fetching, if the key hasn't changed, if users not loaded, or if scope not ready
    if (isFetchingRef.current || fetchKey === prevFetchKeyRef.current || users.length === 0 || !isScopeReady) {
      return;
    }
    
    prevFetchKeyRef.current = fetchKey;
    isFetchingRef.current = true;
    
    const doFetch = async () => {
      fetchSummaryData();
      // Also fetch business summary metrics
      fetchBusinessSummary(selectedUserIds, dateRange);
      isFetchingRef.current = false;
    };
    
    doFetch();
  }, [userIdsKey, dateRangeKey, usersKey, selectedUserIds, dateRange, fetchBusinessSummary, isScopeReady]);

  // Fetch productivity data for drilldown
  useEffect(() => {
    const fetchProductivityDrilldown = async () => {
      if (!productivityDrilldownUser) {
        setProductivityDrilldownData([]);
        return;
      }

      setProductivityDrilldownLoading(true);
      try {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');

        const { data, error } = await supabase.rpc('get_productivity_summary', {
          user_full_name: productivityDrilldownUser,
          start_date: fromDate,
          end_date: toDate
        });

        if (error) {
          console.error('Error fetching productivity drilldown:', error);
          setProductivityDrilldownData([]);
        } else {
          setProductivityDrilldownData(data || []);
        }
      } catch (err) {
        console.error('Error in productivity drilldown:', err);
        setProductivityDrilldownData([]);
      } finally {
        setProductivityDrilldownLoading(false);
      }
    };

    fetchProductivityDrilldown();
  }, [productivityDrilldownUser, dateRange]);

  // Fetch summary data - uses order_items.total for accurate revenue calculation
  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Build query with optional user filtering at database level - include order_items for KG calculation
      let query = supabase
        .from('orders')
        .select(`
          id,
          user_id,
          total_amount,
          order_items(quantity, unit)
        `)
        .eq('status', 'confirmed')
        .gte('order_date', fromDate)
        .lte('order_date', toDate);
      
      // Filter by user IDs if specific users are selected
      if (selectedUserIds.length > 0) {
        query = query.in('user_id', selectedUserIds);
      }

      const { data: ordersData, error: ordersError } = await query;

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

      // Fetch profiles for these users - use the selector RPC that works for all authenticated users
      let profilesData: { id: string; full_name: string | null }[] = [];
      
      // Use the selector RPC (works for all authenticated users)
      const { data: selectorProfiles, error: selectorError } = await supabase.rpc('get_profiles_for_selector');
      
      if (!selectorError && selectorProfiles) {
        // Filter to only the user IDs we need
        profilesData = selectorProfiles.filter((p: any) => userIds.includes(p.id));
      } else {
        // Fallback to admin function if selector fails
        const { data: adminProfiles, error: adminError } = await supabase.rpc('get_basic_profiles_for_admin');
        
        if (!adminError && adminProfiles) {
          profilesData = adminProfiles.filter((p: any) => userIds.includes(p.id));
        }
      }

      // Create a map of user_id to full_name
      const userNameMap: Record<string, string> = {};
      profilesData?.forEach(p => {
        userNameMap[p.id] = p.full_name || 'Unknown';
      });

      // Group by user and calculate totals (total_amount and total_kg)
      const userTotals: Record<string, { total_order_value: number; total_kg: number }> = {};
      ordersData.forEach((order) => {
        const userName = userNameMap[order.user_id] || 'Unknown';
        
        // Use total_amount directly (includes taxes and charges)
        const orderRevenue = Number(order.total_amount || 0);
        
        // Calculate KG from order_items
        let orderKg = 0;
        (order.order_items as any[])?.forEach((item: any) => {
          const qty = Number(item.quantity || 0);
          const unit = (item.unit || '').toLowerCase().trim();
          
          if (unit === 'kg' || unit.includes('kilo')) {
            orderKg += qty;
          } else if (unit === 'grams' || unit === 'gram' || unit === 'g') {
            orderKg += qty / 1000;
          }
          // Ignore pieces/pcs - not included in KG
        });
        
        if (!userTotals[userName]) {
          userTotals[userName] = { total_order_value: 0, total_kg: 0 };
        }
        userTotals[userName].total_order_value += orderRevenue;
        userTotals[userName].total_kg += orderKg;
      });

      // Convert to array and sort by total_kg (for ranking by quantity)
      const summaryArray = Object.entries(userTotals)
        .map(([full_name, data]) => ({ 
          full_name, 
          total_order_value: data.total_order_value,
          total_kg: Math.round(data.total_kg * 100) / 100 
        }))
        .sort((a, b) => b.total_kg - a.total_kg);

      setSummaryData(summaryArray);
      setSelectedUserDetails(null);
      setUserDetails([]);
      setDetailsSummary(null);

      // Fetch all-users summary when loading data
      await fetchAllUsersSummary(fromDate, toDate);
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
    setOrderDetailsBeatBreakdown([]);
    
    // Immediately start fetching beat breakdown for retailers/beats counts
    fetchOrderDetailsBeatBreakdownForUser(userName);
    
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
      const [retailersResult, beatsResult, ordersResult, productRevenueResult, productivityResult] = await Promise.all([
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
        }),
        
        // Get productivity summary using the RPC
        supabase.rpc('get_productivity_summary', {
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

      // Calculate Overall Productivity % (productive / planned) using beat_plans
      const productivityData = productivityResult.data || [];
      let productivityPercent: number | null = null;
      
      const totalProductive = productivityData.reduce((sum: number, row: any) => 
        sum + Number(row.productive_visits || 0), 0);

      // Fetch beat_plans for this user in the date range to compute planned visits
      const { data: userBeatPlans } = await supabase
        .from('beat_plans')
        .select('beat_id, plan_date')
        .eq('user_id', userId)
        .gte('plan_date', fromDate)
        .lte('plan_date', toDate);

      if (userBeatPlans && userBeatPlans.length > 0) {
        const uniqueBeatIds = [...new Set(userBeatPlans.map(bp => bp.beat_id))];
        
        // Fetch retailers assigned to these beats
        const { data: beatRetailers } = await supabase
          .from('retailers')
          .select('id, beat_id')
          .in('beat_id', uniqueBeatIds);

        if (beatRetailers && beatRetailers.length > 0) {
          // Group retailers by beat
          const retailersByBeat = new Map<string, string[]>();
          beatRetailers.forEach(r => {
            if (!retailersByBeat.has(r.beat_id)) retailersByBeat.set(r.beat_id, []);
            retailersByBeat.get(r.beat_id)!.push(r.id);
          });

          // Count planned visits: for each plan_date, count retailers in that beat
          let totalPlanned = 0;
          userBeatPlans.forEach(bp => {
            const retailers = retailersByBeat.get(bp.beat_id) || [];
            totalPlanned += retailers.length;
          });

          if (totalPlanned > 0) {
            productivityPercent = Math.round((totalProductive / totalPlanned) * 100 * 100) / 100;
          }
        }
      }

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
        totalKg: Math.round(totalQuantityKgFromRpc * 100) / 100, // Use RPC calculated KG, round to 2 decimals
        productivityPercent
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      setUserDetails([]);
      setDetailsSummary(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Fetch summary for all users combined (no user selected)
  const fetchAllUsersSummary = async (fromDate: string, toDate: string) => {
    try {
      // Use selectedUserIds to filter data - if empty, we still show aggregated data for all visible users
      const userIdsToFilter = selectedUserIds.length > 0 ? selectedUserIds : [];
      
      // Fetch retailers created in date range (filtered by selected users if any)
      let retailersQuery = supabase
        .from('retailers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`);
      
      if (userIdsToFilter.length > 0) {
        retailersQuery = retailersQuery.in('user_id', userIdsToFilter);
      }
      
      const { count: retailersCount } = await retailersQuery;

      // Fetch beats created in date range (filtered by selected users if any)
      let beatsQuery = supabase
        .from('beats')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`);
      
      if (userIdsToFilter.length > 0) {
        beatsQuery = beatsQuery.in('created_by', userIdsToFilter);
      }
      
      const { count: beatsCount } = await beatsQuery;

      // Fetch confirmed orders in date range (filtered by selected users if any)
      let ordersQuery = supabase
        .from('orders')
        .select('id')
        .eq('status', 'confirmed')
        .gte('order_date', fromDate)
        .lte('order_date', toDate);
      
      if (userIdsToFilter.length > 0) {
        ordersQuery = ordersQuery.in('user_id', userIdsToFilter);
      }
      
      const { data: orders } = await ordersQuery;

      if (!orders || orders.length === 0) {
        setAllUsersSummary({
          retailers: retailersCount || 0,
          beats: beatsCount || 0,
          products: 0,
          totalKg: 0
        });
        return;
      }
      const orderIds = orders.map(o => o.id);

      // Fetch order items in batches to avoid URL length limits
      const BATCH_SIZE = 200;
      const productSet = new Set<string>();
      let totalKg = 0;

      for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
        const batchIds = orderIds.slice(i, i + BATCH_SIZE);
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('product_name, quantity, unit')
          .in('order_id', batchIds);

        if (itemsError) {
          console.error('Error fetching order items batch:', itemsError);
          continue;
        }

        (orderItems || []).forEach((item: any) => {
          if (item.product_name) {
            productSet.add(item.product_name);
          }
          const qty = Number(item.quantity || 0);
          const unit = (item.unit || '').toLowerCase().trim();
          if (unit === 'kg' || unit.includes('kilo')) {
            totalKg += qty;
          } else if (unit === 'grams' || unit === 'gram' || unit === 'g') {
            totalKg += qty / 1000;
          }
          // Ignore pieces/pcs - not included in KG calculation
        });
      }

      setAllUsersSummary({
        retailers: retailersCount || 0,
        beats: beatsCount || 0,
        products: productSet.size,
        totalKg: Math.round(totalKg * 100) / 100
      });
    } catch (error) {
      console.error('Error fetching all users summary:', error);
      setAllUsersSummary(null);
    }
  };


  const totalOrderValue = summaryData.reduce((sum, item) => sum + item.total_order_value, 0);
  const totalKgAll = summaryData.reduce((sum, item) => sum + item.total_kg, 0);

  // State for "Others" dialog
  const [othersDialogOpen, setOthersDialogOpen] = useState(false);
  const [othersData, setOthersData] = useState<{ name: string; value: number; kg: number; percentage: string }[]>([]);

  // Raw pie chart data (all users) - now ranked by total_kg
  const rawPieChartData = summaryData.map((item, index) => ({
    name: item.full_name,
    value: item.total_kg, // Use KG as the chart value for ranking
    orderValue: item.total_order_value,
    kg: item.total_kg,
    percentage: totalKgAll > 0 ? ((item.total_kg / totalKgAll) * 100).toFixed(0) : '0',
    color: COLORS[index % COLORS.length]
  }));

  // Apply filtering and "Others" grouping
  const pieChartData = useMemo(() => {
    // Apply top 5 / bottom 5 filter first
    let filteredData = [...rawPieChartData];
    if (orderUserFilter === 'top5' && rawPieChartData.length > 5) {
      filteredData = rawPieChartData.slice(0, 5);
    } else if (orderUserFilter === 'bottom5' && rawPieChartData.length > 5) {
      filteredData = rawPieChartData.slice(-5);
    }
    
    // Apply "Others" grouping when more than 8 users (only in 'all' mode)
    if (orderUserFilter === 'all' && filteredData.length > 8) {
      const topCount = filteredData.length - 5;
      const topUsers = filteredData.slice(0, topCount);
      const bottomUsers = filteredData.slice(topCount);
      
      const othersValue = bottomUsers.reduce((sum, u) => sum + u.value, 0);
      const othersKg = bottomUsers.reduce((sum, u) => sum + u.kg, 0);
      const othersPercentage = totalKgAll > 0 ? ((othersKg / totalKgAll) * 100).toFixed(0) : '0';
      
      return [
        ...topUsers,
        {
          name: 'Others',
          value: othersValue,
          orderValue: bottomUsers.reduce((sum, u) => sum + u.orderValue, 0),
          kg: othersKg,
          percentage: othersPercentage,
          color: '#9ca3af', // gray-400 for "Others"
          isOthers: true,
          othersDetails: bottomUsers
        }
      ];
    }
    
    return filteredData;
  }, [rawPieChartData, totalKgAll, orderUserFilter]);

  // Filtered summary data for the table - sorted by total_kg and filtered by Top 5 / Bottom 5
  const filteredSummaryData = useMemo(() => {
    // summaryData is already sorted by total_kg descending
    const sortedData = [...summaryData].sort((a, b) => b.total_kg - a.total_kg);
    
    if (orderUserFilter === 'top5' && sortedData.length > 5) {
      return sortedData.slice(0, 5);
    } else if (orderUserFilter === 'bottom5' && sortedData.length > 5) {
      return sortedData.slice(-5);
    }
    return sortedData;
  }, [summaryData, orderUserFilter]);

  const handlePieClick = (data: any) => {
    if (data && data.name) {
      // Check if this is the "Others" segment
      if (data.name === 'Others' || data.isOthers) {
        // Show "Others" dialog instead of drilling down
        const othersItem = pieChartData.find(d => d.name === 'Others');
        if (othersItem && (othersItem as any).othersDetails) {
          setOthersData((othersItem as any).othersDetails);
          setOthersDialogOpen(true);
        }
        return;
      }
      
      // For regular users, show beat breakdown like handleSummaryRowClick
      // Toggle off if same user clicked
      if (selectedSummaryUser === data.name) {
        setSelectedSummaryUser(null);
        setBeatBreakdownData([]);
      } else {
        setSelectedSummaryUser(data.name);
        fetchBeatBreakdown(data.name);
      }
      // Also show detailed section below and set SKU filter
      fetchUserDetails(data.name);
      setSkuFilterUser(data.name);
    }
  };

  const handleRowClick = (userName: string) => {
    fetchUserDetails(userName);
    // Also set SKU filter to show this user's data in Revenue Summary by SKU
    setSkuFilterUser(userName);
  };

  // Handle click on a user from "Others" dialog
  const handleOthersUserClick = (userName: string) => {
    setOthersDialogOpen(false);
    // Show beat breakdown
    setSelectedSummaryUser(userName);
    fetchBeatBreakdown(userName);
    // Show detailed section
    fetchUserDetails(userName);
    setSkuFilterUser(userName);
  };

  // Fetch beat breakdown with retailers and beats count for Order Details
  // Can optionally pass userName directly for immediate fetch before state updates
  const fetchOrderDetailsBeatBreakdownForUser = async (userName?: string) => {
    const targetUser = userName || selectedUserDetails;
    if (!targetUser) return;
    
    setOrderDetailsBeatLoading(true);
    setOrderDetailsBeatBreakdown([]);
    
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');
      const nextDay = format(new Date(new Date(toDate).getTime() + 86400000), 'yyyy-MM-dd');

      // Get user ID from profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `${targetUser}%`)
        .limit(1)
        .maybeSingle();

      if (!userProfile) {
        setOrderDetailsBeatBreakdown([]);
        setOrderDetailsBeatLoading(false);
        return;
      }

      // Fetch orders with retailer info and total_amount (confirmed orders in date range)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          retailer_id,
          total_amount,
          retailers!inner(id, beat_name)
        `)
        .eq('user_id', userProfile.id)
        .eq('status', 'confirmed')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lt('created_at', `${nextDay}T00:00:00`);

      if (ordersError || !orders || orders.length === 0) {
        setOrderDetailsBeatBreakdown([]);
        setOrderDetailsBeatLoading(false);
        return;
      }

      // Group by beat_name and calculate: order_count, total_retailers, total_value
      const beatGroups: Record<string, { 
        order_ids: Set<string>; 
        retailer_ids: Set<string>; 
        total_value: number;
      }> = {};
      
      orders.forEach((order: any) => {
        const beatName = order.retailers?.beat_name || 'Unassigned';
        const retailerId = order.retailers?.id || order.retailer_id;
        // Use total_amount directly (includes taxes and charges)
        const orderTotal = Number(order.total_amount || 0);
        
        if (!beatGroups[beatName]) {
          beatGroups[beatName] = { order_ids: new Set(), retailer_ids: new Set(), total_value: 0 };
        }
        
        beatGroups[beatName].order_ids.add(order.id);
        beatGroups[beatName].retailer_ids.add(retailerId);
        beatGroups[beatName].total_value += orderTotal;
      });

      // Convert to array and sort by total_value descending
      const breakdownData = Object.entries(beatGroups)
        .map(([beat_name, data]) => ({
          beat_name,
          order_count: data.order_ids.size,
          total_retailers: data.retailer_ids.size,
          total_value: data.total_value
        }))
        .sort((a, b) => b.total_value - a.total_value);

      setOrderDetailsBeatBreakdown(breakdownData);
       
       // Trigger translation for Hindi beat names
       translateTexts(breakdownData.map(b => b.beat_name));
    } catch (error) {
      console.error('Error fetching order details beat breakdown:', error);
      setOrderDetailsBeatBreakdown([]);
    } finally {
      setOrderDetailsBeatLoading(false);
    }
  };

  // Handle click on Retailers or Beats box - show beat breakdown table
  // Don't clear orderDetailsBeatBreakdown when toggling - keep counts stable
  const handleRetailersBeatsBoxClick = async () => {
    if (!selectedUserDetails) return;
    
    if (expandedBox === 'retailersBeats') {
      setExpandedBox(null);
      // Don't clear orderDetailsBeatBreakdown - keep the data for stable counts
      return;
    }

    setExpandedBox('retailersBeats');
    // Only fetch if not already loaded
    if (orderDetailsBeatBreakdown.length === 0) {
      await fetchOrderDetailsBeatBreakdownForUser();
    }
  };

  // Fetch retailers list when clicking on Retailers box (legacy - now redirects to beat breakdown)
  const handleRetailersBoxClick = async () => {
    await handleRetailersBeatsBoxClick();
  };

  // Fetch beats list when clicking on Beats box (legacy - now redirects to beat breakdown)
  const handleBeatsBoxClick = async () => {
    await handleRetailersBeatsBoxClick();
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
        order_date: format(new Date(date), 'dd MMM yy'),
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

  // Fetch beat-wise breakdown for a selected user in the summary table
  const fetchBeatBreakdown = async (userName: string) => {
    setBeatBreakdownLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Get user ID from profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `${userName}%`)
        .limit(1)
        .maybeSingle();

      if (!userProfile) {
        setBeatBreakdownData([]);
        return;
      }

      // Calculate next day for date range query
      const nextDay = format(new Date(new Date(toDate).getTime() + 86400000), 'yyyy-MM-dd');

      // Fetch orders with retailer beat info and total_amount
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          retailer_id,
          total_amount,
          retailers!inner(beat_name, beat_id)
        `)
        .eq('user_id', userProfile.id)
        .eq('status', 'confirmed')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lt('created_at', `${nextDay}T00:00:00`);

      if (ordersError || !orders || orders.length === 0) {
        setBeatBreakdownData([]);
        return;
      }

      // Group by beat_name and calculate totals using total_amount directly
      const beatTotals: Record<string, { total_value: number; order_count: number }> = {};
      
      orders.forEach((order: any) => {
        const beatName = order.retailers?.beat_name || 'Unassigned';
        // Use total_amount directly (includes taxes and charges)
        const orderTotal = Number(order.total_amount || 0);
        
        if (!beatTotals[beatName]) {
          beatTotals[beatName] = { total_value: 0, order_count: 0 };
        }
        beatTotals[beatName].total_value += orderTotal;
        beatTotals[beatName].order_count += 1;
      });

      // Convert to array and sort by total_value descending
      const breakdown = Object.entries(beatTotals)
        .map(([beat_name, data]) => ({
          beat_name,
          total_value: data.total_value,
          order_count: data.order_count
        }))
        .sort((a, b) => b.total_value - a.total_value);

      setBeatBreakdownData(breakdown);
       
       // Trigger translation for Hindi beat names
       translateTexts(breakdown.map(b => b.beat_name));
    } catch (error) {
      console.error('Error fetching beat breakdown:', error);
      setBeatBreakdownData([]);
    } finally {
      setBeatBreakdownLoading(false);
    }
  };

  // Handle click on user row in summary table to show beat split
  const handleSummaryRowClick = (userName: string) => {
    // Toggle off if same user clicked
    if (selectedSummaryUser === userName) {
      setSelectedSummaryUser(null);
      setBeatBreakdownData([]);
    } else {
      setSelectedSummaryUser(userName);
      fetchBeatBreakdown(userName);
    }
    // Also show detailed section below
    handleRowClick(userName);
  };

  // Fetch retailer details for a specific beat (drill-down from beat-wise split)
  const fetchRetailerDetailsForBeat = async (beatName: string) => {
    if (!selectedSummaryUser) return;
    
    setRetailerDetailsLoading(true);
    setSelectedBeatForDetails(beatName);
    setRetailerDetailsOpen(true);
    
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Get user ID from profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `${selectedSummaryUser}%`)
        .limit(1)
        .maybeSingle();

      if (!userProfile) {
        setRetailerDetailsData([]);
        return;
      }

      // Calculate next day for date range query
      const nextDay = format(new Date(new Date(toDate).getTime() + 86400000), 'yyyy-MM-dd');

      // Fetch orders with retailer info and total_amount for this beat
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          retailer_id,
          total_amount,
          retailers!inner(id, name, beat_name)
        `)
        .eq('user_id', userProfile.id)
        .eq('status', 'confirmed')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lt('created_at', `${nextDay}T00:00:00`);

      if (ordersError || !orders || orders.length === 0) {
        setRetailerDetailsData([]);
        return;
      }

      // Filter orders for this specific beat
      const beatOrders = orders.filter((order: any) => {
        const orderBeatName = order.retailers?.beat_name || 'Unassigned';
        return orderBeatName === beatName;
      });

      if (beatOrders.length === 0) {
        setRetailerDetailsData([]);
        return;
      }

      // Group by retailer and calculate totals using total_amount directly
      const retailerTotals: Record<string, { name: string; total_value: number; order_count: number; order_ids: string[] }> = {};
      
      beatOrders.forEach((order: any) => {
        const retailerId = order.retailer_id;
        const retailerName = order.retailers?.name || 'Unknown Retailer';
        // Use total_amount directly (includes taxes and charges)
        const orderTotal = Number(order.total_amount || 0);
        
        if (!retailerTotals[retailerId]) {
          retailerTotals[retailerId] = { name: retailerName, total_value: 0, order_count: 0, order_ids: [] };
        }
        retailerTotals[retailerId].total_value += orderTotal;
        retailerTotals[retailerId].order_count += 1;
        retailerTotals[retailerId].order_ids.push(order.id);
      });

      // Convert to array and sort by total_value descending
      const details = Object.values(retailerTotals)
        .map(data => ({
          retailer_name: data.name,
          total_value: data.total_value,
          order_count: data.order_count,
          order_ids: data.order_ids
        }))
        .sort((a, b) => b.total_value - a.total_value);

      setRetailerDetailsData(details);
       
       // Trigger translation for Hindi retailer names  
       translateTexts(details.map(r => r.retailer_name));
    } catch (error) {
      console.error('Error fetching retailer details:', error);
      setRetailerDetailsData([]);
    } finally {
      setRetailerDetailsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      // --- Color Palette ---
      const COLORS = {
        primary: [31, 78, 121] as [number, number, number],
        secondary: [46, 134, 193] as [number, number, number],
        accent: [39, 174, 96] as [number, number, number],
        warning: [243, 156, 18] as [number, number, number],
        danger: [231, 76, 60] as [number, number, number],
        lightBg: [241, 245, 249] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        darkText: [30, 41, 59] as [number, number, number],
        mutedText: [100, 116, 139] as [number, number, number],
        cardBorder: [226, 232, 240] as [number, number, number],
      };

      const CHART_COLORS: [number, number, number][] = [
        [31, 78, 121], [46, 134, 193], [39, 174, 96], [243, 156, 18],
        [231, 76, 60], [142, 68, 173], [41, 128, 185], [22, 160, 133],
        [211, 84, 0], [44, 62, 80],
      ];

      const doc = new jsPDF('l', 'pt', 'a4');

      // Fetch and register static Noto Sans font for ₹ symbol support
      const [regularRes, boldRes] = await Promise.all([
        fetch('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-400-normal.ttf'),
        fetch('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-700-normal.ttf'),
      ]);
      const [regularBuf, boldBuf] = await Promise.all([regularRes.arrayBuffer(), boldRes.arrayBuffer()]);
      const toBase64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      };
      doc.addFileToVFS('NotoSans-Regular.ttf', toBase64(regularBuf));
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      doc.addFileToVFS('NotoSans-Bold.ttf', toBase64(boldBuf));
      doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
      doc.setFont('NotoSans', 'normal');

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 30;
      const contentWidth = pageWidth - margin * 2;
      let y = 0;

      const fmtCurrency = (v: number) => '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      const fmtKG = (kg: number) => kg.toFixed(1) + ' KG';

      const checkPageBreak = (needed: number) => {
        if (y + needed > pageHeight - 40) {
          doc.addPage();
          y = margin;
        }
      };

      const drawSectionTitle = (title: string) => {
        checkPageBreak(40);
        doc.setFillColor(...COLORS.primary);
        doc.rect(margin, y, 4, 16, 'F');
        doc.setFontSize(13);
        doc.setFont('NotoSans', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text(title, margin + 12, y + 12);
        doc.setTextColor(...COLORS.darkText);
        y += 24;
      };

      // ==================== HEADER BANNER ====================
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, 0, pageWidth, 70, 'F');
      // Subtle secondary stripe
      doc.setFillColor(...COLORS.secondary);
      doc.rect(0, 64, pageWidth, 6, 'F');

      doc.setTextColor(...COLORS.white);
      doc.setFontSize(22);
      doc.setFont('NotoSans', 'bold');
      doc.text('Sales Analytics Report', margin, 32);

      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      const periodText = `${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`;
      const filterLabel = selectedUsers.length === 0 ? 'All Users' : selectedUsers.length <= 3 ? selectedUsers.join(', ') : `${selectedUsers.length} users selected`;
      doc.text(`Period: ${periodText}   |   Filter: ${filterLabel}`, margin, 52);
      doc.setTextColor(...COLORS.darkText);
      y = 90;

      // ==================== KPI CARDS ====================
      const kpiData = [
        { label: 'Total Revenue', value: fmtCurrency(businessSummary.totalRevenue), color: COLORS.primary },
        { label: 'Total Quantity', value: businessSummary.totalKg.toFixed(1) + ' KG', color: COLORS.secondary },
        { label: 'Orders', value: String(businessSummary.totalOrders), color: COLORS.accent },
        { label: 'Retailers', value: String(businessSummary.totalRetailers), color: COLORS.warning },
        { label: 'Pending Payments', value: fmtCurrency(businessSummary.pendingPayments), color: COLORS.danger },
      ];

      const cardWidth = (contentWidth - 4 * 12) / 5;
      const cardHeight = 58;
      kpiData.forEach((kpi, i) => {
        const cx = margin + i * (cardWidth + 12);
        // Card background
        doc.setFillColor(...COLORS.white);
        doc.setDrawColor(...COLORS.cardBorder);
        doc.roundedRect(cx, y, cardWidth, cardHeight, 4, 4, 'FD');
        // Color top accent
        doc.setFillColor(...(kpi.color as [number, number, number]));
        doc.rect(cx, y, cardWidth, 3, 'F');
        // Label
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(...COLORS.mutedText);
        doc.text(kpi.label, cx + 10, y + 20);
        // Value
        doc.setFontSize(16);
        doc.setFont('NotoSans', 'bold');
        doc.setTextColor(...COLORS.darkText);
        doc.text(kpi.value, cx + 10, y + 42);
      });
      doc.setTextColor(...COLORS.darkText);
      y += cardHeight + 24;

      // ==================== SALES LEADERBOARD ====================
      drawSectionTitle('Sales Leaderboard');

      const totalRevenue = summaryData.reduce((s, u) => s + u.total_order_value, 0);
      if (summaryData.length > 0) {
        const medalColors: Record<number, [number, number, number]> = {
          0: [255, 215, 0],   // Gold
          1: [192, 192, 192], // Silver
          2: [205, 127, 50],  // Bronze
        };

        const leaderRows = summaryData.map((u, i) => [
          String(i + 1),
          u.full_name,
          fmtKG(u.total_kg),
          fmtCurrency(u.total_order_value),
          totalRevenue > 0 ? (u.total_order_value / totalRevenue * 100).toFixed(1) + '%' : '0%',
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Rank', 'User', 'Total KG', 'Revenue', 'Share %']],
          body: leaderRows,
          theme: 'plain',
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 6, lineColor: [226, 232, 240], lineWidth: 0.5 },
          headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          willDrawCell: (data: any) => {
            if (data.section === 'body' && data.row.index < 3) {
              const rowColor = data.row.index === 0 ? [255, 251, 235] : data.row.index === 1 ? [248, 250, 252] : [255, 247, 237];
              doc.setFillColor(...(rowColor as [number, number, number]));
            }
          },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 0 && data.row.index < 3) {
              const color = medalColors[data.row.index];
              if (color) {
                doc.setFillColor(...color);
                doc.circle(data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, 5, 'F');
                doc.setFontSize(7);
                doc.setTextColor(50, 50, 50);
                doc.text(String(data.row.index + 1), data.cell.x + data.cell.width / 2 - 2, data.cell.y + data.cell.height / 2 + 2.5);
                doc.setTextColor(...COLORS.darkText);
              }
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 16;
      }

      // ==================== REVENUE DISTRIBUTION CHART ====================
      if (summaryData.length > 0 && totalRevenue > 0) {
        checkPageBreak(100);
        drawSectionTitle('Revenue Distribution by User');

        const barY = y;
        const barHeight = 22;
        const barWidth = contentWidth - 160;
        const legendX = margin + barWidth + 16;
        let barX = margin;

        // Draw stacked horizontal bar
        const topUsers = summaryData.slice(0, 10);
        topUsers.forEach((u, i) => {
          const share = u.total_order_value / totalRevenue;
          const segW = share * barWidth;
          if (segW > 1) {
            const color = CHART_COLORS[i % CHART_COLORS.length];
            doc.setFillColor(...color);
            doc.rect(barX, barY, segW, barHeight, 'F');
            barX += segW;
          }
        });

        // Legend
        let ly = barY;
        topUsers.forEach((u, i) => {
          if (ly > barY + 120) return;
          const color = CHART_COLORS[i % CHART_COLORS.length];
          doc.setFillColor(...color);
          doc.rect(legendX, ly + 1, 8, 8, 'F');
          doc.setFontSize(7);
          doc.setFont('NotoSans', 'bold');
          doc.setTextColor(...COLORS.darkText);
          const nameShort = u.full_name.length > 14 ? u.full_name.substring(0, 12) + '…' : u.full_name;
          doc.text(`${nameShort} (${(u.total_order_value / totalRevenue * 100).toFixed(1)}%)`, legendX + 12, ly + 8);
          doc.setFont('NotoSans', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(...COLORS.mutedText);
          const kgVal = u.total_kg >= 1 ? u.total_kg.toFixed(1) + ' KG' : (u.total_kg * 1000).toFixed(0) + ' gm';
          doc.text(`${kgVal} | ${fmtCurrency(u.total_order_value)}`, legendX + 12, ly + 16);
          ly += 22;
        });

        y = Math.max(barY + barHeight, ly) + 20;
      }

      // ==================== REVENUE BY SKU ====================
      if (skuDataForSummary.length > 0) {
        checkPageBreak(60);
        drawSectionTitle('Revenue by SKU');

        const sortedSkus = [...skuDataForSummary].sort((a, b) => b.revenue - a.revenue);
        const totalSkuRevenue = sortedSkus.reduce((s, sk) => s + sk.revenue, 0);

        const skuRows = sortedSkus.map(s => [
          s.product_name,
          s.unit || '-',
          s.unit?.toLowerCase().includes('gm') || s.unit?.toLowerCase().includes('gram')
            ? fmtKG(s.quantity_sold) : String(s.quantity_sold),
          fmtCurrency(s.revenue),
          totalSkuRevenue > 0 ? (s.revenue / totalSkuRevenue * 100).toFixed(1) + '%' : '0%',
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Product', 'Unit', 'Qty Sold', 'Revenue', '% Contribution']],
          body: skuRows,
          theme: 'plain',
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.5 },
          headStyles: { fillColor: COLORS.accent, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        y = (doc as any).lastAutoTable.finalY + 16;

        // --- Top 10 SKU Bar Chart ---
        const top10 = sortedSkus.slice(0, 10);
        if (top10.length > 0) {
          checkPageBreak(top10.length * 18 + 40);
          drawSectionTitle('Top SKU Revenue');

          const maxRev = top10[0].revenue;
          const chartBarMaxW = contentWidth * 0.5;
          const labelW = 180;

          top10.forEach((sku, i) => {
            const bw = maxRev > 0 ? (sku.revenue / maxRev) * chartBarMaxW : 0;
            doc.setFontSize(7);
            doc.setFont('NotoSans', 'normal');
            doc.setTextColor(...COLORS.darkText);
            const skuLabel = sku.product_name.length > 30 ? sku.product_name.substring(0, 28) + '…' : sku.product_name;
            doc.text(skuLabel, margin, y + 10);
            doc.setFillColor(...COLORS.secondary);
            doc.rect(margin + labelW, y + 2, bw, 12, 'F');
            doc.setFontSize(7);
            doc.setTextColor(...COLORS.mutedText);
            doc.text(fmtCurrency(sku.revenue), margin + labelW + bw + 6, y + 11);
            doc.setTextColor(...COLORS.darkText);
            y += 18;
          });
          y += 12;
        }
      }

      // ==================== PRODUCTIVITY SUMMARY ====================
      if (productivityDataForSummary.length > 0) {
        checkPageBreak(60);
        drawSectionTitle('Productivity Summary');

        const prodRows = productivityDataForSummary.map(p => [
          p.full_name,
          String(p.productive_visits),
          String(p.total_visits),
          p.productivity_percentage.toFixed(1) + '%',
          '', // placeholder for visual bar
        ]);

        autoTable(doc, {
          startY: y,
          head: [['User', 'Productive', 'Total', '%', 'Performance']],
          body: prodRows,
          theme: 'plain',
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 6, lineColor: [226, 232, 240], lineWidth: 0.5 },
          headStyles: { fillColor: COLORS.warning, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 4: { cellWidth: 100 } },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4) {
              const pct = productivityDataForSummary[data.row.index]?.productivity_percentage || 0;
              const barMaxW = 80;
              const barW = (pct / 100) * barMaxW;
              const bx = data.cell.x + 6;
              const by = data.cell.y + data.cell.height / 2 - 4;
              // Background bar
              doc.setFillColor(226, 232, 240);
              doc.roundedRect(bx, by, barMaxW, 8, 2, 2, 'F');
              // Fill bar
              const barColor = pct >= 80 ? COLORS.accent : pct >= 50 ? COLORS.warning : COLORS.danger;
              doc.setFillColor(...barColor);
              doc.roundedRect(bx, by, Math.max(barW, 2), 8, 2, 2, 'F');
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 16;
      }

      // ==================== ATTENDANCE & WORKING HOURS ====================
      try {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        const userIds = selectedUserIds.length > 0 ? selectedUserIds : users.map(u => u.id);

        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('user_id, total_hours, date')
          .in('user_id', userIds)
          .gte('date', fromDate)
          .lte('date', toDate)
          .in('status', ['present', 'half_day_leave']);

        if (attendanceData && attendanceData.length > 0) {
          const userAttendance: Record<string, { totalHours: number; days: number }> = {};
          attendanceData.forEach(a => {
            if (!userAttendance[a.user_id]) userAttendance[a.user_id] = { totalHours: 0, days: 0 };
            userAttendance[a.user_id].totalHours += (a.total_hours || 0);
            userAttendance[a.user_id].days += 1;
          });

          const attendanceRows = Object.entries(userAttendance).map(([uid, data]) => {
            const userName = users.find(u => u.id === uid)?.full_name || 'Unknown';
            const avgHours = data.days > 0 ? (data.totalHours / data.days).toFixed(1) : '0';
            return [userName, avgHours, String(data.days)];
          }).sort((a, b) => Number(b[2]) - Number(a[2]));

          if (attendanceRows.length > 0) {
            checkPageBreak(60);
            drawSectionTitle('Attendance & Working Hours');

            autoTable(doc, {
              startY: y,
              head: [['User', 'Avg Working Hours', 'Days Present']],
              body: attendanceRows,
              theme: 'plain',
              margin: { left: margin, right: margin },
              styles: { fontSize: 8, cellPadding: 6, lineColor: [226, 232, 240], lineWidth: 0.5 },
              headStyles: { fillColor: COLORS.secondary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
              alternateRowStyles: { fillColor: [248, 250, 252] },
            });
            y = (doc as any).lastAutoTable.finalY + 16;
          }
        }
      } catch (err) {
        console.error('Attendance fetch for PDF failed:', err);
      }

      // ==================== AI INSIGHTS ====================
      if (aiInsights.length > 0) {
        checkPageBreak(60);
        drawSectionTitle('AI Insights & Recommendations');

        const typeColors: Record<string, [number, number, number]> = {
          opportunity: COLORS.accent,
          success: COLORS.accent,
          info: COLORS.secondary,
          warning: COLORS.warning,
          alert: COLORS.danger,
          critical: COLORS.danger,
        };

        aiInsights.forEach(insight => {
          const boxHeight = 40;
          checkPageBreak(boxHeight + 8);

          const borderColor = typeColors[insight.type] || COLORS.secondary;

          // Card background
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(...COLORS.cardBorder);
          doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'FD');

          // Left color accent bar
          doc.setFillColor(...borderColor);
          doc.rect(margin, y, 4, boxHeight, 'F');

          // Type badge
          doc.setFillColor(...borderColor);
          doc.roundedRect(margin + 14, y + 6, 50, 12, 2, 2, 'F');
          doc.setFontSize(6);
          doc.setFont('NotoSans', 'bold');
          doc.setTextColor(...COLORS.white);
          doc.text(insight.type.toUpperCase(), margin + 18, y + 14);

          // Title
          doc.setFontSize(9);
          doc.setFont('NotoSans', 'bold');
          doc.setTextColor(...COLORS.darkText);
          doc.text(insight.title, margin + 70, y + 16);

          // Description
          doc.setFontSize(7.5);
          doc.setFont('NotoSans', 'normal');
          doc.setTextColor(...COLORS.mutedText);
          const descText = insight.description.length > 120 ? insight.description.substring(0, 118) + '…' : insight.description;
          doc.text(descText, margin + 14, y + 32);

          doc.setTextColor(...COLORS.darkText);
          y += boxHeight + 6;
        });
        y += 8;
      }

      // ==================== FOOTER ON ALL PAGES ====================
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const footerY = pageHeight - 20;
        doc.setDrawColor(...COLORS.cardBorder);
        doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
        doc.setFontSize(7);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(...COLORS.mutedText);
        doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, margin, footerY);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 50, footerY);
      }

      const pdfBlob = doc.output('blob');
      await downloadPDF(pdfBlob, `Sales_Report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.pdf`);
      toast.success('Executive report downloaded');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Show loading while scope is being determined */}
      {!isScopeReady ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin h-6 w-6 text-primary" />
              <span className="text-muted-foreground">Loading team data...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
      <>
      {/* Summarize Report & Download PDF Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          disabled={downloadingPDF}
          className="gap-2"
        >
          {downloadingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloadingPDF ? 'Generating...' : 'Download PDF'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReportSummaryOpen(true)}
          className="gap-2"
        >
          <Volume2 className="h-4 w-4" />
          Summarize Report
        </Button>
      </div>

      <div className="space-y-4">
      {/* Total Order Value Banner - Dashboard visualization */}
       <div className="grid grid-cols-2 gap-2 md:gap-4">
         {/* Total Order Value Banner */}
         <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg cursor-pointer hover:shadow-xl transition-shadow border-2 border-yellow-400/70" onClick={() => { fetchBusinessOrderDetails(selectedUserIds, dateRange); setShowOrderDetailsDialog(true); }}>
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] md:text-sm opacity-90">Total Order Value</p>
              <p className="text-xl md:text-3xl lg:text-4xl font-bold">
                ₹{(businessSummary.totalRevenue / 100000).toFixed(2)} Lac
              </p>
              <p className="text-[8px] md:text-xs opacity-75 mt-0.5 md:mt-1">
                {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
              </p>
            </div>
            <div className="md:text-right space-y-0.5 md:space-y-1 mt-1 md:mt-0">
              <p className="text-[9px] md:text-sm opacity-90">{businessSummary.totalOrders} Orders</p>
              <p className="text-[9px] md:text-sm opacity-90">{businessSummary.totalRetailers} Retailers</p>
            </div>
          </div>
        </CardContent>
      </Card>

         {/* Total Quantity Banner - Matching prominent style */}
         <Card className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow border-2 border-yellow-400/70" onClick={() => { fetchProductDetails(selectedUserIds, dateRange); setShowProductBreakdown(true); }}>
           <CardContent className="p-3 md:p-6">
             <div className="flex flex-col md:flex-row md:items-center md:justify-between">
               <div>
                 <p className="text-[10px] md:text-sm opacity-90">Total Quantity</p>
                 <p className="text-xl md:text-3xl lg:text-4xl font-bold">
                   {businessSummary.totalKg.toFixed(1)} KG
                 </p>
                 <p className="text-[8px] md:text-xs opacity-75 mt-0.5 md:mt-1">
                   {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                 </p>
               </div>
               <div className="md:text-right space-y-0.5 md:space-y-1 mt-1 md:mt-0">
                 {businessSummary.totalPieces > 0 && (
                   <p className="text-[9px] md:text-sm opacity-90">+ {businessSummary.totalPieces} pcs</p>
                 )}
                 <p className="text-[9px] md:text-sm opacity-90">{businessSummary.totalBeats} Beats</p>
               </div>
             </div>
           </CardContent>
         </Card>
       </div>

      {/* Business Summary Cards */}
       <div className="space-y-2">
         {/* Row 1: Total Beats, Total Retailers, Total Orders */}
         <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
           <BusinessSummaryCard
             title="Total Beats"
             value={businessSummary.totalBeats}
             icon={<MapPin size={14} className="text-primary md:w-[18px] md:h-[18px]" />}
             onClick={() => { fetchBeatDetails(selectedUserIds, dateRange); setShowBeatDetails(true); }}
             isLoading={businessLoading}
             className="md:col-span-1"
           />
           <BusinessSummaryCard
             title="Total Retailers"
             value={businessSummary.totalRetailers}
             icon={<Store size={14} className="text-blue-600 md:w-[18px] md:h-[18px]" />}
             iconBgClass="bg-blue-500/10"
             onClick={() => { fetchBusinessRetailerDetails(selectedUserIds, dateRange); setShowRetailerDetailsDialog(true); }}
             isLoading={businessLoading}
             className="md:col-span-1"
           />
           <BusinessSummaryCard
             title="Total Orders"
             value={businessSummary.totalOrders}
             icon={<ShoppingCart size={14} className="text-green-600 md:w-[18px] md:h-[18px]" />}
             iconBgClass="bg-green-500/10"
             onClick={() => { fetchBusinessOrderDetails(selectedUserIds, dateRange); setShowOrderDetailsDialog(true); }}
             isLoading={businessLoading}
             className="md:col-span-1"
           />
           {/* These two are hidden on mobile, shown on md+ */}
           <BusinessSummaryCard
             title="Total Revenue"
             value={`₹${(businessSummary.totalRevenue / 1000).toFixed(0)}K`}
             icon={<IndianRupee size={14} className="text-purple-600 md:w-[18px] md:h-[18px]" />}
             iconBgClass="bg-purple-500/10"
             onClick={() => { fetchBusinessOrderDetails(selectedUserIds, dateRange); setShowOrderDetailsDialog(true); }}
             isLoading={businessLoading}
             className="hidden md:block"
           />
           <BusinessSummaryCard
             title="Pending Payments"
             value={`₹${(businessSummary.pendingPayments / 1000).toFixed(0)}K`}
             icon={<CreditCard size={14} className="text-red-600 md:w-[18px] md:h-[18px]" />}
             iconBgClass="bg-red-500/10"
             onClick={() => { fetchPendingPaymentDetails(selectedUserIds, dateRange); setShowPendingPayments(true); }}
             isLoading={businessLoading}
             className="hidden md:block"
           />
         </div>
         {/* Row 2: Total Revenue, Pending Payments (mobile only) */}
         <div className="grid grid-cols-2 gap-2 md:hidden">
           <BusinessSummaryCard
             title="Total Revenue"
             value={`₹${(businessSummary.totalRevenue / 1000).toFixed(0)}K`}
             icon={<IndianRupee size={14} className="text-purple-600" />}
             iconBgClass="bg-purple-500/10"
             onClick={() => { fetchBusinessOrderDetails(selectedUserIds, dateRange); setShowOrderDetailsDialog(true); }}
             isLoading={businessLoading}
           />
           <BusinessSummaryCard
             title="Pending Payments"
             value={`₹${(businessSummary.pendingPayments / 1000).toFixed(0)}K`}
             icon={<CreditCard size={14} className="text-red-600" />}
             iconBgClass="bg-red-500/10"
             onClick={() => { fetchPendingPaymentDetails(selectedUserIds, dateRange); setShowPendingPayments(true); }}
             isLoading={businessLoading}
           />
         </div>
       </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg md:text-xl">Order Summary by User</CardTitle>
          <p className="text-sm text-muted-foreground">
            View confirmed order totals grouped by user
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Results */}
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : summaryData.length > 0 ? (
            <>
              {/* Filter Buttons - Always visible */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant={orderUserFilter === 'top5' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setOrderUserFilter(orderUserFilter === 'top5' ? 'all' : 'top5')}
                  >
                    Top 5
                  </Button>
                  <Button
                    variant={orderUserFilter === 'bottom5' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setOrderUserFilter(orderUserFilter === 'bottom5' ? 'all' : 'bottom5')}
                  >
                    Bottom 5
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  {!hideOrderChart && (
                    <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v as 'pie' | 'bar')}>
                      <ToggleGroupItem value="pie" aria-label="Pie Chart" className="h-8 w-8 p-0">
                        <PieChartIcon className="h-4 w-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="bar" aria-label="Bar Chart" className="h-8 w-8 p-0">
                        <BarChart3 className="h-4 w-4" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setHideOrderChart(!hideOrderChart)}
                    title={hideOrderChart ? "Show Visual" : "Hide Visual"}
                  >
                    {hideOrderChart ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className={cn(
                "grid grid-cols-1 gap-6 transition-all duration-300",
                hideOrderChart ? "" : (selectedSummaryUser ? "lg:grid-cols-5" : "lg:grid-cols-2")
              )}>
              {/* Chart Section - shrinks when beat split is open, hidden when hideOrderChart is true */}
              {!hideOrderChart && (
              <div className={cn(
                "space-y-2 transition-all duration-300",
                selectedSummaryUser ? "lg:col-span-2" : "lg:col-span-1"
              )}>
                <ResponsiveContainer width="100%" height={isMobile ? 280 : (selectedSummaryUser ? 280 : 350)}>
                  {chartType === 'pie' ? (
                    <PieChart margin={isMobile ? { top: 20, right: 20, bottom: 20, left: 20 } : undefined}>
                      <Pie
                        data={pieChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 70 : (selectedSummaryUser ? 90 : 120)}
                        label={false}
                        labelLine={false}
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
                        formatter={(value: number, name: string, props: any) => {
                          const entry = props.payload;
                          return [`${value.toLocaleString()} KG`, name];
                        }}
                        labelFormatter={() => ''}
                      />
                      <Legend wrapperStyle={{ fontSize: isMobile ? '6px' : (selectedSummaryUser ? '10px' : '12px') }} />
                    </PieChart>
                  ) : (
                    <BarChart data={pieChartData} layout="vertical" margin={{ left: isMobile ? 10 : 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tickFormatter={(value) => `${value.toLocaleString()} KG`} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={isMobile ? 70 : (selectedSummaryUser ? 60 : 80)} 
                        tick={{ fontSize: isMobile ? 9 : (selectedSummaryUser ? 10 : 12) }}
                        tickFormatter={(value) => {
                          if (isMobile && value.length > 10) {
                            return value.substring(0, 10) + '...';
                          }
                          return value;
                        }}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [`${value.toLocaleString()} KG`, name]}
                        labelFormatter={() => ''}
                      />
                      <Bar 
                        dataKey="value" 
                        onClick={(data) => handlePieClick(data)}
                        style={{ cursor: 'pointer' }}
                        label={isMobile ? undefined : undefined}
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
              )}

              {/* Summary Table with Beat-wise Split View - expands when beat split is open or chart is hidden */}
              <div className={cn(
                "transition-all duration-300",
                hideOrderChart ? "" : (selectedSummaryUser ? "lg:col-span-3" : "lg:col-span-1")
              )}>
                <h3 className="font-semibold mb-2">User Order Summary</h3>
                <p className="text-xs text-muted-foreground mb-3">Click a row to see beat-wise breakdown</p>
                <div className={cn(
                  "grid gap-4 transition-all duration-300",
                  selectedSummaryUser ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                )}>
                  {/* Left: User Summary Table */}
                  <div className={cn(
                    "border rounded-lg scrollbar-always-visible",
                    filteredSummaryData.length > 6 && "max-h-[320px]"
                  )}>
                    <div className="min-w-max">
                      <table className={cn("w-full caption-bottom", isMobile ? "text-[9px]" : "text-sm")}>
                        <thead className="sticky top-0 bg-muted/50 z-10">
                          <tr className="bg-muted/50 border-b">
                            <th className={cn("text-left font-medium text-muted-foreground whitespace-nowrap", isMobile ? "py-1 px-2" : "h-12 px-4")}>Full Name</th>
                            <th className={cn("text-right font-medium text-muted-foreground whitespace-nowrap", isMobile ? "py-1 px-2" : "h-12 px-4")}>Qty (KG)</th>
                            <th className={cn("text-right font-medium text-muted-foreground whitespace-nowrap", isMobile ? "py-1 px-2" : "h-12 px-4")}>Total Order Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSummaryData.map((row, index) => (
                            <tr 
                              key={index} 
                              className={cn(
                                "cursor-pointer hover:bg-muted/50 transition-colors border-b",
                                selectedSummaryUser === row.full_name && "bg-primary/10 border-l-2 border-l-primary"
                              )}
                              onClick={() => handleSummaryRowClick(row.full_name)}
                            >
                              <td className={cn("align-middle whitespace-nowrap", isMobile ? "py-0.5 px-2" : "p-4")}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className={cn(isMobile ? "w-2 h-2" : "w-3 h-3", "rounded-full shrink-0")}
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  {row.full_name}
                                </div>
                              </td>
                              <td className={cn("text-right font-semibold text-primary align-middle whitespace-nowrap", isMobile ? "py-0.5 px-2" : "p-4")}>
                                {row.total_kg.toLocaleString()}
                              </td>
                              <td className={cn("text-right font-semibold align-middle whitespace-nowrap", isMobile ? "py-0.5 px-2" : "p-4")}>
                                ₹{row.total_order_value.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-background sticky bottom-0 z-10">
                          <tr className="border-t">
                            <td className={cn("font-semibold align-middle whitespace-nowrap", isMobile ? "py-1 px-2" : "p-4")}>
                              Total{orderUserFilter !== 'all' ? ` (${filteredSummaryData.length})` : ''}
                            </td>
                            <td className={cn("text-right font-bold text-primary align-middle whitespace-nowrap", isMobile ? "py-1 px-2" : "p-4")}>
                              {filteredSummaryData.reduce((sum, r) => sum + r.total_kg, 0).toLocaleString()}
                            </td>
                            <td className={cn("text-right font-bold align-middle whitespace-nowrap", isMobile ? "py-1 px-2" : "p-4")}>
                              ₹{filteredSummaryData.reduce((sum, r) => sum + r.total_order_value, 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Right: Beat-wise Breakdown Panel */}
                  {selectedSummaryUser && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-primary/10 px-4 py-2 border-b flex items-center justify-between">
                        <h5 className="font-semibold text-sm">
                          Beat-wise Split - {selectedSummaryUser}
                        </h5>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSummaryUser(null);
                            setBeatBreakdownData([]);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {beatBreakdownLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="animate-spin h-5 w-5" />
                        </div>
                      ) : beatBreakdownData.length > 0 ? (
                        <div className="max-h-[300px] overflow-auto">
                          <p className="text-xs text-muted-foreground px-4 py-1">Click a beat to see retailer details</p>
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="text-xs py-1.5 px-2">Beat Name</TableHead>
                                <TableHead className="text-xs py-1.5 px-2 text-right w-[60px]">Orders</TableHead>
                                <TableHead className="text-xs py-1.5 px-2 text-right w-[80px]">Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {beatBreakdownData.map((beat, index) => (
                                <TableRow 
                                  key={index}
                                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => fetchRetailerDetailsForBeat(beat.beat_name)}
                                >
                                   <TableCell className="text-xs py-1.5 px-2 text-primary underline-offset-2 hover:underline">{getTranslated(beat.beat_name)}</TableCell>
                                  <TableCell className="text-xs py-1.5 px-2 text-right">{beat.order_count}</TableCell>
                                  <TableCell className="text-xs py-1.5 px-2 text-right font-semibold">
                                    ₹{beat.total_value.toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <tfoot className="bg-muted/30 sticky bottom-0">
                              <TableRow>
                                <TableCell className="text-xs py-1.5 px-2 font-semibold">Total</TableCell>
                                <TableCell className="text-xs py-1.5 px-2 text-right font-semibold">
                                  {beatBreakdownData.reduce((s, b) => s + b.order_count, 0)}
                                </TableCell>
                                <TableCell className="text-xs py-1.5 px-2 text-right font-bold text-primary">
                                  ₹{beatBreakdownData.reduce((s, b) => s + b.total_value, 0).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            </tfoot>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No beat data found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No data found for the selected filters
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retailer Details Dialog (drill-down from beat row) */}
      <Dialog open={retailerDetailsOpen} onOpenChange={setRetailerDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Retailer Details - {selectedBeatForDetails}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {selectedSummaryUser} • {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {retailerDetailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="animate-spin h-6 w-6" />
              </div>
            ) : retailerDetailsData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Retailer Name</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-center">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retailerDetailsData.map((retailer, index) => {
                    const isLoading = retailer.order_ids.some(id => loadingInvoiceView === id);
                    
                    const handleShowInvoice = async () => {
                      if (retailer.order_ids.length === 0) return;
                      
                      try {
                        const orderId = retailer.order_ids[0];
                        setLoadingInvoiceView(orderId);
                        const { blob, invoiceNumber } = await fetchAndGenerateInvoice(orderId);
                        const url = URL.createObjectURL(blob);
                        // Open PDF in new tab instead of iframe (Chrome blocks blob iframes)
                        const newTab = window.open(url, '_blank', 'noopener,noreferrer');
                        if (!newTab) {
                          // Fallback: download directly
                          await downloadPDF(blob, `Invoice-${invoiceNumber}.pdf`);
                          toast.success('Invoice downloaded');
                        }
                        // Clean up blob URL after a delay
                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                      } catch (error) {
                        console.error('Error generating invoice:', error);
                        toast.error('Failed to generate invoice');
                      } finally {
                        setLoadingInvoiceView(null);
                      }
                    };
                    
                    return (
                      <TableRow key={index}>
                         <TableCell>{getTranslated(retailer.retailer_name)}</TableCell>
                        <TableCell className="text-right">{retailer.order_count}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{retailer.total_value.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={handleShowInvoice}
                            disabled={isLoading}
                            title={`Show invoice`}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <tfoot className="bg-muted/30">
                  <TableRow>
                    <TableCell className="font-semibold">Total ({retailerDetailsData.length} retailers)</TableCell>
                    <TableCell className="text-right font-semibold">
                      {retailerDetailsData.reduce((s, r) => s + r.order_count, 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      ₹{retailerDetailsData.reduce((s, r) => s + r.total_value, 0).toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No retailer data found for this beat
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>





      <Dialog open={othersDialogOpen} onOpenChange={setOthersDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Others - {othersData.length} Users
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Click a user to view their details
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>User Name</TableHead>
                  <TableHead className="text-right">Order Value</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {othersData.map((user, index) => (
                  <TableRow 
                    key={index}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleOthersUserClick(user.name)}
                  >
                    <TableCell className="text-primary hover:underline">{user.name}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{user.value.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {user.percentage}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot className="bg-muted/30">
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    ₹{othersData.reduce((s, u) => s + u.value, 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground font-semibold">
                    {othersData.length > 0 && totalOrderValue > 0 
                      ? ((othersData.reduce((s, u) => s + u.value, 0) / totalOrderValue) * 100).toFixed(0)
                      : 0}%
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </DialogContent>
      </Dialog>


      {/* User Details Section */}
      {selectedUserDetails && (
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base sm:text-lg md:text-xl">Order Details - {selectedUserDetails}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => {
              setSelectedUserDetails(null);
              setUserDetails([]);
              setDetailsSummary(null);
              setOrderDetailsBeatBreakdown([]);
              setExpandedBox(null);
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
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-4 mb-4 sm:mb-6">
                    <Card 
                      className={cn(
                        "p-1.5 sm:p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        expandedBox === 'retailersBeats' && "ring-2 ring-primary"
                      )}
                      onClick={handleRetailersBoxClick}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground text-[10px] sm:text-sm mb-0.5 sm:mb-1">
                        <Store className="h-3 w-3 sm:h-4 sm:w-4" />
                        Retailers
                      </div>
                      <div className="text-sm sm:text-2xl font-bold">
                        {orderDetailsBeatBreakdown.length > 0 
                          ? orderDetailsBeatBreakdown.reduce((sum, b) => sum + b.total_retailers, 0)
                          : detailsSummary.retailers}
                      </div>
                    </Card>
                    <Card 
                      className={cn(
                        "p-1.5 sm:p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        expandedBox === 'retailersBeats' && "ring-2 ring-primary"
                      )}
                      onClick={handleBeatsBoxClick}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground text-[10px] sm:text-sm mb-0.5 sm:mb-1">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                        Beats
                      </div>
                      <div className="text-sm sm:text-2xl font-bold">
                        {orderDetailsBeatBreakdown.length > 0 
                          ? orderDetailsBeatBreakdown.length
                          : detailsSummary.beats}
                      </div>
                    </Card>
                    <Card 
                      className={cn(
                        "p-1.5 sm:p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        expandedBox === 'productsKg' && "ring-2 ring-primary"
                      )}
                      onClick={handleProductsKgBoxClick}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground text-[10px] sm:text-sm mb-0.5 sm:mb-1">
                        <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                        Products
                      </div>
                      <div className="text-sm sm:text-2xl font-bold">{detailsSummary.products}</div>
                    </Card>
                    <Card 
                      className={cn(
                        "p-1.5 sm:p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        expandedBox === 'productsKg' && "ring-2 ring-primary"
                      )}
                      onClick={handleProductsKgBoxClick}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground text-[10px] sm:text-sm mb-0.5 sm:mb-1">
                        <Scale className="h-3 w-3 sm:h-4 sm:w-4" />
                        Total KG
                      </div>
                      <div className="text-sm sm:text-2xl font-bold">{detailsSummary.totalKg.toFixed(1)}</div>
                    </Card>
                    <Card 
                      className="p-1.5 sm:p-4 cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => setProductivityDrilldownUser(selectedUserDetails)}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground text-[10px] sm:text-sm mb-0.5 sm:mb-1">
                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        Productivity
                      </div>
                      <div className="text-sm sm:text-2xl font-bold">
                        {detailsSummary.productivityPercent !== null 
                          ? `${detailsSummary.productivityPercent}%` 
                          : 'N/A'}
                      </div>
                    </Card>
                  </div>
                )}

                {/* AI Insights */}
                <OrderDetailsAIInsights userName={selectedUserDetails} dateRange={dateRange} />

                {/* Beat-wise Breakdown Subtable (for Retailers/Beats boxes) */}
                {expandedBox === 'retailersBeats' && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                      Beat-wise Breakdown
                      {orderDetailsBeatBreakdown.length > 8 && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </h4>
                    {orderDetailsBeatLoading ? (
                      <div className="flex items-center justify-center py-8 border rounded-lg">
                        <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : orderDetailsBeatBreakdown.length > 0 ? (
                      <div className={cn(
                        "border rounded-lg overflow-hidden",
                        orderDetailsBeatBreakdown.length > 8 && "max-h-[360px] overflow-y-auto"
                      )}>
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/50 z-10">
                            <TableRow>
                              <TableHead>Beat Name</TableHead>
                              <TableHead className="text-right">Orders</TableHead>
                              <TableHead className="text-right">Retailers</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orderDetailsBeatBreakdown.map((beat, index) => (
                              <TableRow key={index} className="hover:bg-muted/30">
                                 <TableCell className="font-medium">{getTranslated(beat.beat_name)}</TableCell>
                                <TableCell className="text-right">{beat.order_count}</TableCell>
                                <TableCell className="text-right">{beat.total_retailers}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  ₹{beat.total_value.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <tfoot className="bg-muted/30 sticky bottom-0">
                            <TableRow>
                              <TableCell className="font-semibold">TOTAL</TableCell>
                              <TableCell className="text-right font-semibold">
                                {orderDetailsBeatBreakdown.reduce((s, b) => s + b.order_count, 0)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {orderDetailsBeatBreakdown.reduce((s, b) => s + b.total_retailers, 0)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-primary">
                                ₹{orderDetailsBeatBreakdown.reduce((s, b) => s + b.total_value, 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          </tfoot>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg text-sm">
                        No beat data found for this period
                      </div>
                    )}
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
                              <TableHead className="text-xs py-1.5 px-2 whitespace-nowrap">Date</TableHead>
                              <TableHead className="text-xs py-1.5 px-2 text-right whitespace-nowrap">Qty (KG)</TableHead>
                              <TableHead className="text-xs py-1.5 px-2 text-right whitespace-nowrap">Revenue</TableHead>
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
                                <TableCell className={cn("text-xs py-1.5 px-2 whitespace-nowrap", row.order_date === 'TOTAL' ? 'font-bold' : '')}>
                                  {row.order_date}
                                </TableCell>
                                <TableCell className="text-xs py-1.5 px-2 text-right">{row.quantity_kg.toFixed(2)}</TableCell>
                                <TableCell className="text-xs py-1.5 px-2 text-right">₹{row.revenue.toLocaleString()}</TableCell>
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

      {/* Revenue Summary by SKU Section */}
      <RevenueBySKUSection 
        selectedUsers={skuFilterUser ? [skuFilterUser] : selectedUsers} 
        dateRange={dateRange}
        filteredUserName={skuFilterUser}
        onClearFilter={handleClearSkuFilter}
        onDataLoaded={handleSkuDataLoaded}
        allUsers={users}
      />

      {/* Attendance & Market Hours Section */}
      <AttendanceMarketHoursSection 
        selectedUsers={selectedUserIds} 
        dateRange={dateRange}
        allUsers={users}
      />

      {/* Productivity Summary Section */}
      <ProductivitySummarySection 
        selectedUsers={selectedUsers} 
        selectedUserIds={selectedUserIds}
        dateRange={dateRange}
        allUsers={users}
        onDataLoaded={handleProductivityDataLoaded}
      />

      {/* Leaderboard Section */}
      <LeaderboardSection
        selectedUserIds={selectedUserIds}
        dateRange={dateRange}
        allUsers={users}
      />

       {/* Retailer Summary Section - Hidden
       <RetailerSummarySection 
         selectedUsers={selectedUsers} 
         dateRange={dateRange}
         allUsers={users}
       />
       */}

      {/* AI Insights Section - Moved to bottom */}
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
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

      {/* Day-wise Productivity Drilldown Dialog (from Order Details Productivity card) */}
      <Dialog open={!!productivityDrilldownUser} onOpenChange={() => setProductivityDrilldownUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Day-wise Productivity - {productivityDrilldownUser}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg">
            {productivityDrilldownLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : productivityDrilldownData.length > 0 ? (
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
                  {productivityDrilldownData.map((row, index) => (
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
                        <span className={cn(
                          row.productivity_percentage >= 70 ? 'text-green-600' :
                          row.productivity_percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                        )}>
                          {row.productivity_percentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot className="bg-muted/30 sticky bottom-0">
                  <TableRow>
                    <TableCell className="font-semibold">Total ({productivityDrilldownData.length} days)</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {productivityDrilldownData.reduce((sum, row) => sum + row.productive_visits, 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-orange-600">
                      {productivityDrilldownData.reduce((sum, row) => sum + row.unproductive_visits, 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {productivityDrilldownData.reduce((sum, row) => sum + row.total_visits, 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {(() => {
                        const totalProd = productivityDrilldownData.reduce((s, r) => s + r.productive_visits, 0);
                        const totalVisits = productivityDrilldownData.reduce((s, r) => s + r.total_visits, 0);
                        return totalVisits > 0 ? Math.round((totalProd / totalVisits) * 100 * 100) / 100 : 0;
                      })()}%
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No productivity data found for this user
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      </div>

      {/* Report Summary Dialog */}
      <ReportSummaryDialog
        open={reportSummaryOpen}
        onClose={() => setReportSummaryOpen(false)}
        dateRange={dateRange}
        allUsersSummary={allUsersSummary}
        orderSummaryData={summaryData}
        skuData={skuDataForSummary}
        productivityData={productivityDataForSummary}
      />

      {/* Business Summary Dialogs */}
      <BeatDetailsDialog
        open={showBeatDetails}
        onOpenChange={setShowBeatDetails}
        data={beatDetails}
        isLoading={businessDetailsLoading}
        selectedUsers={selectedUsers}
        dateRange={dateRange}
      />
      <RetailerDetailsDialog
        open={showRetailerDetailsDialog}
        onOpenChange={setShowRetailerDetailsDialog}
        data={businessRetailerDetails}
        isLoading={businessDetailsLoading}
        selectedUsers={selectedUsers}
        dateRange={dateRange}
      />
      <OrderDetailsDialog
        open={showOrderDetailsDialog}
        onOpenChange={setShowOrderDetailsDialog}
        data={businessOrderDetails}
        isLoading={businessDetailsLoading}
        selectedUsers={selectedUsers}
        dateRange={dateRange}
      />
      <ProductBreakdownDialog
        open={showProductBreakdown}
        onOpenChange={setShowProductBreakdown}
        data={productDetails}
        isLoading={businessDetailsLoading}
        selectedUsers={selectedUsers}
        dateRange={dateRange}
      />
      <PendingPaymentsDialog
        open={showPendingPayments}
        onOpenChange={setShowPendingPayments}
        data={pendingPaymentDetails}
        isLoading={businessDetailsLoading}
        selectedUsers={selectedUsers}
        dateRange={dateRange}
      />
      </>
      )}
    </div>
  );
};
