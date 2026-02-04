import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface BusinessSummary {
  totalBeats: number;
  totalRetailers: number;
  totalOrders: number;
  totalKg: number;
  totalPieces: number;
  totalRevenue: number;
  pendingPayments: number;
}

interface BeatDetail {
  beat_name: string;
  visits_count: number;
  orders_count: number;
  revenue: number;
}

interface RetailerDetail {
  id: string;
  name: string;
  beat_name: string;
  orders_count: number;
  revenue: number;
  pending_amount: number;
}

interface OrderDetail {
  id: string;
  order_date: string;
  retailer_name: string;
  total_amount: number;
  status: string;
}

interface ProductDetail {
  product_name: string;
  unit: string;
  quantity: number;
  revenue: number;
}

interface PendingPaymentDetail {
  retailer_name: string;
  order_date: string;
  order_id: string;
  pending_amount: number;
  user_id?: string;
  user_name?: string;
}

export const useBusinessMetrics = () => {
  const [summary, setSummary] = useState<BusinessSummary>({
    totalBeats: 0,
    totalRetailers: 0,
    totalOrders: 0,
    totalKg: 0,
    totalPieces: 0,
    totalRevenue: 0,
    pendingPayments: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Detail data states
  const [beatDetails, setBeatDetails] = useState<BeatDetail[]>([]);
  const [retailerDetails, setRetailerDetails] = useState<RetailerDetail[]>([]);
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [productDetails, setProductDetails] = useState<ProductDetail[]>([]);
  const [pendingPaymentDetails, setPendingPaymentDetails] = useState<PendingPaymentDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchSummary = useCallback(async (userIds: string[], dateRange: { from: Date; to: Date }, userNames?: string[]) => {
    setIsLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch confirmed orders with items
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          credit_pending_amount,
          retailer_id,
          user_id,
          order_items(quantity, unit)
        `)
        .eq('status', 'confirmed')
        .gte('order_date', fromDate)
        .lte('order_date', toDate);

      if (userIds.length > 0) {
        ordersQuery = ordersQuery.in('user_id', userIds);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      // Fetch beats created by selected users within date range
      let beatsQuery = supabase
        .from('beats')
        .select('id, created_by')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`);

      if (userIds.length > 0) {
        beatsQuery = beatsQuery.in('created_by', userIds);
      }

      const { data: beats, error: beatsError } = await beatsQuery;
      if (beatsError) throw beatsError;

      // Fetch retailers created by selected users within date range
      let retailersQuery = supabase
        .from('retailers')
        .select('id, user_id')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`);

      if (userIds.length > 0) {
        retailersQuery = retailersQuery.in('user_id', userIds);
      }

      const { data: retailers, error: retailersError } = await retailersQuery;
      if (retailersError) throw retailersError;

      const totalBeatsCount = beats?.length || 0;
      const totalRetailersCount = retailers?.length || 0;
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
      const pendingPayments = orders?.reduce((sum, o) => sum + Number(o.credit_pending_amount || 0), 0) || 0;
      
      // Calculate total KG and Revenue using the same logic as SQL Report - Product and Revenue Performance
      let totalKg = 0;
      let totalPieces = 0;
      let rpcTotalRevenue = 0;
      let useRpcRevenue = false;
      
      // If user names are provided, use the RPC to get product revenue data
      if (userNames && userNames.length > 0) {
        useRpcRevenue = true;
        for (const userName of userNames) {
          const { data: productData } = await supabase.rpc('get_product_revenue_performance', {
            user_full_name: userName,
            start_date: fromDate,
            end_date: toDate
          });
          
          if (productData) {
            productData.forEach((row: any) => {
              const qty = Number(row.quantity_sold || 0);
              const unit = (row.unit || '').toLowerCase();
              // Same logic as SQL Report: grams converted to KG, others treated as KG directly
              if (unit === 'grams') {
                totalKg += qty / 1000;
              } else {
                totalKg += qty;
              }
              // Sum revenue from RPC
              rpcTotalRevenue += Number(row.revenue || 0);
            });
          }
        }
      } else {
        // Fallback: use order_items directly
        orders?.forEach(order => {
          (order.order_items as any[])?.forEach((item: any) => {
            const unit = (item.unit || '').toLowerCase().trim();
            const qty = Number(item.quantity || 0);
            
            if (unit === 'kg' || unit.includes('kilo')) {
              totalKg += qty;
            } else if (unit === 'grams' || unit === 'g' || unit === 'gram') {
              totalKg += qty / 1000;
            } else {
              totalPieces += qty;
            }
          });
        });
      }
      
      // Use RPC revenue when available, otherwise use orders sum
      const finalRevenue = useRpcRevenue ? rpcTotalRevenue : totalRevenue;

      setSummary({
        totalBeats: totalBeatsCount,
        totalRetailers: totalRetailersCount,
        totalOrders,
        totalKg,
        totalPieces,
        totalRevenue: finalRevenue,
        pendingPayments
      });
    } catch (error) {
      console.error('Error fetching business summary:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBeatDetails = useCallback(async (userIds: string[], dateRange: { from: Date; to: Date }) => {
    setDetailsLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Get beat plans
      let beatsQuery = supabase
        .from('beat_plans')
        .select('id, beat_id, beat_name, user_id, plan_date')
        .gte('plan_date', fromDate)
        .lte('plan_date', toDate);

      if (userIds.length > 0) {
        beatsQuery = beatsQuery.in('user_id', userIds);
      }

      const { data: beatPlans } = await beatsQuery;

      // Get visits
      let visitsQuery = supabase
        .from('visits')
        .select('id, user_id, planned_date')
        .gte('planned_date', fromDate)
        .lte('planned_date', toDate);

      if (userIds.length > 0) {
        visitsQuery = visitsQuery.in('user_id', userIds);
      }

      const { data: visits } = await visitsQuery;

      // Get orders
      let ordersQuery = supabase
        .from('orders')
        .select('id, total_amount, visit_id, user_id, order_date')
        .gte('order_date', fromDate)
        .lte('order_date', toDate);

      if (userIds.length > 0) {
        ordersQuery = ordersQuery.in('user_id', userIds);
      }

      const { data: orders } = await ordersQuery;

      // Group by beat using beat_plans
      const beatMap = new Map<string, BeatDetail>();
      
      beatPlans?.forEach(plan => {
        const beatName = plan.beat_name || 'Unknown';
        if (!beatMap.has(beatName)) {
          beatMap.set(beatName, {
            beat_name: beatName,
            visits_count: 0,
            orders_count: 0,
            revenue: 0
          });
        }
        const beat = beatMap.get(beatName)!;
        
        // Count visits for this beat plan date
        const beatVisits = visits?.filter(v => 
          v.planned_date === plan.plan_date && v.user_id === plan.user_id
        ) || [];
        beat.visits_count += beatVisits.length;
        
        // Find orders for these visits
        beatVisits.forEach(visit => {
          const visitOrders = orders?.filter(o => o.visit_id === visit.id) || [];
          beat.orders_count += visitOrders.length;
          beat.revenue += visitOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        });
      });

      setBeatDetails(Array.from(beatMap.values()).sort((a, b) => b.revenue - a.revenue));
    } catch (error) {
      console.error('Error fetching beat details:', error);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const fetchRetailerDetails = useCallback(async (userIds: string[], dateRange: { from: Date; to: Date }) => {
    setDetailsLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          retailer_id,
          total_amount,
          credit_pending_amount,
          retailers(id, name, beat_name)
        `)
        .gte('order_date', fromDate)
        .lte('order_date', toDate);

      if (userIds.length > 0) {
        ordersQuery = ordersQuery.in('user_id', userIds);
      }

      const { data: orders } = await ordersQuery;

      // Group by retailer
      const retailerMap = new Map<string, RetailerDetail>();
      
      orders?.forEach(order => {
        const retailer = order.retailers as any;
        if (!retailer?.id) return;
        
        if (!retailerMap.has(retailer.id)) {
          retailerMap.set(retailer.id, {
            id: retailer.id,
            name: retailer.name || 'Unknown',
            beat_name: retailer.beat_name || '-',
            orders_count: 0,
            revenue: 0,
            pending_amount: 0
          });
        }
        const r = retailerMap.get(retailer.id)!;
        r.orders_count++;
        r.revenue += Number(order.total_amount || 0);
        r.pending_amount += Number(order.credit_pending_amount || 0);
      });

      setRetailerDetails(Array.from(retailerMap.values()).sort((a, b) => b.revenue - a.revenue));
    } catch (error) {
      console.error('Error fetching retailer details:', error);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const fetchOrderDetails = useCallback(async (userIds: string[], dateRange: { from: Date; to: Date }) => {
    setDetailsLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      let query = supabase
        .from('orders')
        .select(`
          id,
          order_date,
          total_amount,
          status,
          retailers(name)
        `)
        .gte('order_date', fromDate)
        .lte('order_date', toDate)
        .order('order_date', { ascending: false });

      if (userIds.length > 0) {
        query = query.in('user_id', userIds);
      }

      const { data } = await query;

      setOrderDetails(
        (data || []).map(order => ({
          id: order.id,
          order_date: order.order_date,
          retailer_name: (order.retailers as any)?.name || 'Unknown',
          total_amount: Number(order.total_amount || 0),
          status: order.status || 'pending'
        }))
      );
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const fetchProductDetails = useCallback(async (userIds: string[], dateRange: { from: Date; to: Date }) => {
    setDetailsLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      let ordersQuery = supabase
        .from('orders')
        .select('id, user_id')
        .gte('order_date', fromDate)
        .lte('order_date', toDate);

      if (userIds.length > 0) {
        ordersQuery = ordersQuery.in('user_id', userIds);
      }

      const { data: orders } = await ordersQuery;
      const orderIds = orders?.map(o => o.id) || [];

      if (orderIds.length === 0) {
        setProductDetails([]);
        setDetailsLoading(false);
        return;
      }

      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, unit, quantity, total')
        .in('order_id', orderIds);

      // Group by product
      const productMap = new Map<string, ProductDetail>();
      
      items?.forEach(item => {
        const key = `${item.product_name}-${item.unit || 'pcs'}`;
        if (!productMap.has(key)) {
          productMap.set(key, {
            product_name: item.product_name || 'Unknown',
            unit: item.unit || 'pcs',
            quantity: 0,
            revenue: 0
          });
        }
        const p = productMap.get(key)!;
        p.quantity += Number(item.quantity || 0);
        p.revenue += Number(item.total || 0);
      });

      setProductDetails(Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity));
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const fetchPendingPaymentDetails = useCallback(async (userIds: string[], dateRange: { from: Date; to: Date }) => {
    setDetailsLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      let query = supabase
        .from('orders')
        .select(`
          id,
          order_date,
          credit_pending_amount,
          user_id,
          retailers(name)
        `)
        .gte('order_date', fromDate)
        .lte('order_date', toDate)
        .gt('credit_pending_amount', 0)
        .order('credit_pending_amount', { ascending: false });

      if (userIds.length > 0) {
        query = query.in('user_id', userIds);
      }

      const { data } = await query;

      // Fetch profile names separately since there's no FK from orders.user_id to profiles
      const orderUserIds = [...new Set((data || []).map(o => o.user_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      
      if (orderUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', orderUserIds);
        
        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Unknown User';
          return acc;
        }, {} as Record<string, string>);
      }

      setPendingPaymentDetails(
        (data || []).map(order => ({
          retailer_name: (order.retailers as any)?.name || 'Unknown',
          order_date: order.order_date,
          order_id: order.id,
          pending_amount: Number(order.credit_pending_amount || 0),
          user_id: order.user_id || '',
          user_name: profilesMap[order.user_id || ''] || 'Unknown User'
        }))
      );
    } catch (error) {
      console.error('Error fetching pending payment details:', error);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  return {
    summary,
    isLoading,
    fetchSummary,
    beatDetails,
    retailerDetails,
    orderDetails,
    productDetails,
    pendingPaymentDetails,
    detailsLoading,
    fetchBeatDetails,
    fetchRetailerDetails,
    fetchOrderDetails,
    fetchProductDetails,
    fetchPendingPaymentDetails
  };
};
