import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';

interface UseVisitsDataOptimizedProps {
  userId: string | undefined;
  selectedDate: string;
}

interface PointsData {
  total: number;
  byRetailer: Map<string, { name: string; points: number; visitId: string | null }>;
}

interface ProgressStats {
  planned: number;
  productive: number;
  unproductive: number;
  totalOrders: number;
  totalOrderValue: number;
}

export const useVisitsDataOptimized = ({ userId, selectedDate }: UseVisitsDataOptimizedProps) => {
  const [beatPlans, setBeatPlans] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pointsData, setPointsData] = useState<PointsData>({ total: 0, byRetailer: new Map() });
  const [progressStats, setProgressStats] = useState<ProgressStats>({ 
    planned: 0, 
    productive: 0, 
    unproductive: 0, 
    totalOrders: 0,
    totalOrderValue: 0 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // CACHE-FIRST LOADING: Load from cache immediately, sync in background
  const loadData = useCallback(async () => {
    if (!userId || !selectedDate) return;

    setIsLoading(true);
    let hasLoadedFromCache = false;

    try {
      // STEP 1: Load from IndexedDB immediately (instant)
      const cachedBeatPlans = await offlineStorage.getAll<any>(STORES.BEAT_PLANS);
      const cachedVisits = await offlineStorage.getAll<any>(STORES.VISITS);
      const cachedRetailers = await offlineStorage.getAll<any>(STORES.RETAILERS);
      const cachedOrders = await offlineStorage.getAll<any>(STORES.ORDERS);

      // Filter beat plans by user and date only
      // Don't filter by beat ownership - allow any beat that's referenced in beat_plans
      const filteredBeatPlans = cachedBeatPlans.filter(
        (plan: any) => 
          plan.user_id === userId && 
          plan.plan_date === selectedDate
      );
      const filteredVisits = cachedVisits.filter(
        (v: any) => v.user_id === userId && v.planned_date === selectedDate
      );

      // Filter orders by date first
      const dateStart = new Date(selectedDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(selectedDate);
      dateEnd.setHours(23, 59, 59, 999);

      const filteredOrders = cachedOrders.filter((o: any) => {
        const orderDate = new Date(o.created_at);
        return o.user_id === userId && o.status === 'confirmed' && orderDate >= dateStart && orderDate <= dateEnd;
      });

      // Get retailer IDs from visits, planned beats, AND orders
      const visitRetailerIds = filteredVisits.map((v: any) => v.retailer_id);

      // Extract retailer IDs from beat_data.retailer_ids if specified
      let plannedRetailerIds: string[] = [];
      let hasBeatDataWithRetailerIdsDefined = false;
      for (const beatPlan of filteredBeatPlans) {
        const beatData = (beatPlan as any).beat_data as any;
        if (beatData && Array.isArray(beatData.retailer_ids)) {
          hasBeatDataWithRetailerIdsDefined = true;
          plannedRetailerIds.push(...beatData.retailer_ids);
        }
      }

      // If no specific retailer IDs are defined in beat_data for any plan, fall back to beat_id mapping
      if (!hasBeatDataWithRetailerIdsDefined) {
        const plannedBeatIds = filteredBeatPlans.map((bp: any) => bp.beat_id);
        plannedRetailerIds = cachedRetailers
          .filter((r: any) => r.user_id === userId && plannedBeatIds.includes(r.beat_id))
          .map((r: any) => r.id);
      }

      const orderRetailerIds = filteredOrders.map((o: any) => o.retailer_id);
      
      // Combine all retailer IDs: from visits, planned beats, AND orders
      const allRetailerIds = Array.from(new Set([...visitRetailerIds, ...plannedRetailerIds, ...orderRetailerIds]));
      
      // NEW OFFLINE FEATURE: Include offline retailers for planned beats
      const plannedBeatIds = filteredBeatPlans.map((bp: any) => bp.beat_id);
      const filteredRetailers = cachedRetailers.filter((r: any) => 
        allRetailerIds.includes(r.id) || (r.beat_id && plannedBeatIds.includes(r.beat_id))
      );

      // Display cached data immediately
      if (
        filteredBeatPlans.length > 0 ||
        filteredVisits.length > 0 ||
        filteredRetailers.length > 0
      ) {
        // Set state immediately with cached data
        setBeatPlans(filteredBeatPlans);
        setVisits(filteredVisits);
        setRetailers(filteredRetailers);
        setOrders(filteredOrders);
        hasLoadedFromCache = true;
        setIsLoading(false);
        
        console.log('📦 [CACHE] Loaded from cache:', {
          beatPlans: filteredBeatPlans.length,
          visits: filteredVisits.length,
          retailers: filteredRetailers.length,
          orders: filteredOrders.length,
          selectedDate
        });

        // Calculate progress stats from cached data immediately
        const ordersByRetailer = new Map<string, number>();
        filteredOrders.forEach((o: any) => {
          ordersByRetailer.set(o.retailer_id, (ordersByRetailer.get(o.retailer_id) || 0) + Number(o.total_amount || 0));
        });

        // Use the same plannedRetailerIds logic as network to ensure consistency
        const progressPlannedRetailerIds: string[] = [];
        for (const beatPlan of filteredBeatPlans) {
          const beatData = beatPlan.beat_data as any;
          if (beatData && Array.isArray(beatData.retailer_ids)) {
            progressPlannedRetailerIds.push(...beatData.retailer_ids);
          }
        }

        let totalOrders = filteredOrders.length;
        let totalOrderValue = filteredOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0);

        // Match home dashboard logic: simply count visits by status
        const planned = filteredVisits.filter((v: any) => v.status === 'planned').length;
        const productive = filteredVisits.filter((v: any) => v.status === 'productive').length;
        const unproductive = filteredVisits.filter((v: any) => v.status === 'unproductive').length;

        setProgressStats({ planned, productive, unproductive, totalOrders, totalOrderValue });
        console.log('📊 [CACHE] Progress stats calculated from cache:', { 
          planned, 
          productive, 
          unproductive, 
          totalOrders, 
          totalOrderValue,
          selectedDate,
          visitsCount: filteredVisits.length,
          ordersCount: filteredOrders.length,
          timestamp: new Date().toISOString()
        });
      }
    } catch (cacheError) {
      console.log('Cache read error (non-critical):', cacheError);
    }

  // STEP 2: Background sync from network if online
    if (navigator.onLine) {
      console.log('🌐 [VisitsData] Device is online, fetching fresh data from network...');
      try {
        // Calculate date range for queries
        const dateStart = new Date(selectedDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(selectedDate);
        dateEnd.setHours(23, 59, 59, 999);

        // Fetch all initial data in parallel for maximum speed
        const [beatPlansResult, visitsResult, pointsResult] = await Promise.all([
          supabase
            .from('beat_plans')
            .select('*')
            .eq('user_id', userId)
            .eq('plan_date', selectedDate),
          supabase
            .from('visits')
            .select('id, retailer_id, status, no_order_reason, planned_date, user_id, check_in_time, check_out_time')
            .eq('user_id', userId)
            .eq('planned_date', selectedDate),
          supabase
            .from('gamification_points')
            .select('points, reference_id, reference_type')
            .eq('user_id', userId)
            .eq('reference_type', 'order')
            .gte('earned_at', dateStart.toISOString())
            .lte('earned_at', dateEnd.toISOString())
        ]);

        console.log('✅ [VisitsData] Network fetch successful:', {
          beatPlans: beatPlansResult.data?.length || 0,
          visits: visitsResult.data?.length || 0,
          points: pointsResult.data?.length || 0
        });

        if (beatPlansResult.error) throw beatPlansResult.error;
        if (visitsResult.error) throw visitsResult.error;
        if (pointsResult.error) throw pointsResult.error;

        const beatPlansData = beatPlansResult.data || [];
        const visitsData = visitsResult.data || [];
        const pointsRawData = pointsResult.data || [];

        // Get all retailer IDs we need
        const visitRetailerIds = (visitsData || []).map((v: any) => v.retailer_id);
        
        // Extract retailer IDs from beat_data.retailer_ids if specified
        let plannedRetailerIds: string[] = [];
        let hasBeatDataWithRetailerIdsDefined = false;
        for (const beatPlan of beatPlansData) {
          const beatData = beatPlan.beat_data as any;
          if (beatData && Array.isArray(beatData.retailer_ids)) {
            hasBeatDataWithRetailerIdsDefined = true;
            plannedRetailerIds.push(...beatData.retailer_ids);
          }
        }
        
        console.log('📋 Planned retailer IDs from beat_data:', plannedRetailerIds);
        
        // If no specific retailer IDs are defined in beat_data for any plan, fall back to fetching by beat_id
        if (!hasBeatDataWithRetailerIdsDefined) {
          const plannedBeatIds = (beatPlansData || []).map((bp: any) => bp.beat_id);
          if (plannedBeatIds.length > 0) {
            const { data: plannedRetailers, error: retailersError } = await supabase
              .from('retailers')
              .select('id')
              .eq('user_id', userId)
              .in('beat_id', plannedBeatIds);

            if (retailersError) {
              console.error('Error fetching planned retailers:', retailersError);
            } else {
              plannedRetailerIds = (plannedRetailers || []).map((r: any) => r.id);
              console.log('📋 Found', plannedRetailerIds.length, 'retailers for', plannedBeatIds.length, 'planned beats (fallback by beat_id)');
            }
          }
        } else {
          console.log('📋 Using', plannedRetailerIds.length, 'specific retailers from beat plan data');
        }

        // IMPORTANT: Also fetch orders for today to get retailer IDs from orders
        // This ensures retailers with orders show up even if not in planned beats or visits
        const { data: ordersForToday } = await supabase
          .from('orders')
          .select('retailer_id')
          .eq('user_id', userId)
          .eq('status', 'confirmed')
          .gte('created_at', `${selectedDate}T00:00:00.000Z`)
          .lte('created_at', `${selectedDate}T23:59:59.999Z`);

        const orderRetailerIds = (ordersForToday || []).map((o: any) => o.retailer_id);

        // Combine all retailer IDs: from visits, planned beats, AND orders
        const allRetailerIds = Array.from(new Set([...visitRetailerIds, ...plannedRetailerIds, ...orderRetailerIds]));

        let retailersData: any[] = [];
        let ordersData: any[] = [];

        if (allRetailerIds.length > 0) {
          // Fetch retailers and full order details in parallel
          const [retailersResult, ordersResult] = await Promise.all([
            supabase
              .from('retailers')
              .select('id, name, address, phone, category, parent_name, potential, user_id, beat_id, pending_amount')
              .in('id', allRetailerIds),
            supabase
              .from('orders')
              .select('id, retailer_id, total_amount, status, created_at, user_id')
              .eq('user_id', userId)
              .eq('status', 'confirmed')
              .in('retailer_id', allRetailerIds)
              .gte('created_at', `${selectedDate}T00:00:00.000Z`)
              .lte('created_at', `${selectedDate}T23:59:59.999Z`)
          ]);

          if (retailersResult.error) throw retailersResult.error;
          if (ordersResult.error) throw ordersResult.error;

          retailersData = retailersResult.data || [];
          ordersData = ordersResult.data || [];
        }

        // NEW OFFLINE FEATURE: Merge offline retailers for planned beats
        const plannedBeatIds = (beatPlansData || []).map((bp: any) => bp.beat_id);
        const cachedRetailersAll = await offlineStorage.getAll<any>(STORES.RETAILERS);
        const offlineRetailersForBeats = cachedRetailersAll.filter((r: any) => 
          r.beat_id && plannedBeatIds.includes(r.beat_id) && 
          !retailersData.some((onlineR: any) => onlineR.id === r.id)
        );
        retailersData = [...retailersData, ...offlineRetailersForBeats];

        // Process points data into efficient structure
        const totalPoints = pointsRawData.reduce((sum, item) => sum + item.points, 0);
        const retailerPointsMap = new Map<string, { name: string; points: number; visitId: string | null }>();
        
        // Create a map of retailer IDs to names for quick lookup
        const retailerNamesMap = new Map<string, string>();
        retailersData.forEach((r: any) => {
          retailerNamesMap.set(r.id, r.name);
        });
        
        visitsData.forEach((visit: any) => {
          const retailerId = visit.retailer_id;
          const retailerPoints = pointsRawData
            .filter((p: any) => p.reference_id === retailerId)
            .reduce((sum, p) => sum + p.points, 0);
          
          if (retailerPoints > 0) {
            retailerPointsMap.set(retailerId, {
              name: retailerNamesMap.get(retailerId) || 'Unknown Retailer',
              points: retailerPoints,
              visitId: visit.id
            });
          }
        });

        setPointsData({ total: totalPoints, byRetailer: retailerPointsMap });

        // Calculate progress stats immediately for instant display
        // Iterate over visits to ensure all visits are counted
        const ordersMap = new Map<string, boolean>();
        const ordersByRetailer = new Map<string, number>();
        ordersData.forEach(o => {
          ordersMap.set(o.retailer_id, true);
          ordersByRetailer.set(o.retailer_id, (ordersByRetailer.get(o.retailer_id) || 0) + Number(o.total_amount || 0));
        });

        let totalOrders = ordersData.length;
        let totalOrderValue = ordersData.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

        // Match home dashboard logic: simply count visits by status
        const planned = visitsData.filter((v: any) => v.status === 'planned').length;
        const productive = visitsData.filter((v: any) => v.status === 'productive').length;
        const unproductive = visitsData.filter((v: any) => v.status === 'unproductive').length;

        setProgressStats({ planned, productive, unproductive, totalOrders, totalOrderValue });
        console.log('📊 [NETWORK] Progress stats calculated from network:', { 
          planned, 
          productive, 
          unproductive, 
          totalOrders, 
          totalOrderValue,
          selectedDate,
          visitsCount: visitsData.length,
          ordersCount: ordersData.length,
          timestamp: new Date().toISOString()
        });

        // Cache current date data for offline access
        // Beat plans, visits, retailers, and orders are cached for immediate display
        await Promise.all([
          ...beatPlansData.map(plan => offlineStorage.save(STORES.BEAT_PLANS, plan)),
          ...visitsData.map(visit => offlineStorage.save(STORES.VISITS, visit)),
          ...retailersData.map(retailer => offlineStorage.save(STORES.RETAILERS, retailer)),
          ...ordersData.map(order => offlineStorage.save(STORES.ORDERS, order))
        ]);
        
        console.log('💾 [CACHE] Saved to offline storage:', {
          beatPlans: beatPlansData.length,
          visits: visitsData.length,
          retailers: retailersData.length,
          orders: ordersData.length
        });
        
        console.log('[VisitsData] ✅ Cached beat plans and visits for current date');

        // Update state with fresh data
      setBeatPlans(beatPlansData);
      setVisits(visitsData);
      setRetailers(retailersData);
      setOrders(ordersData);
        
        console.log('🔄 [NETWORK] State updated with fresh data:', {
          beatPlans: beatPlansData.length,
          visits: visitsData.length,
          retailers: retailersData.length,
          orders: ordersData.length,
          selectedDate
        });
        
        if (!hasLoadedFromCache) {
          setIsLoading(false);
        }
        
        setError(null);
        console.log('🔄 Updated with fresh data from network');
      } catch (networkError) {
        console.log('Network sync failed, using cached data:', networkError);
        if (!hasLoadedFromCache) {
          setError(networkError);
          setIsLoading(false);
        }
      }
    } else {
      // Offline mode
      if (!hasLoadedFromCache) {
        console.log('📴 Offline and no cache available');
        setIsLoading(false);
      }
    }
  }, [userId, selectedDate]);

  useEffect(() => {
    console.log('🔄 useVisitsDataOptimized: Setting up data loading for date:', selectedDate);
    
    // Clear existing data immediately when date changes for instant UI feedback
    setBeatPlans([]);
    setVisits([]);
    setRetailers([]);
    setOrders([]);
    setPointsData({ total: 0, byRetailer: new Map() });
    setProgressStats({ planned: 0, productive: 0, unproductive: 0, totalOrders: 0, totalOrderValue: 0 });
    
    // Then load new data
    loadData();

    // Listen for manual refresh events with reduced delay for faster updates
    const handleRefresh = () => {
      console.log('🔄 visitDataChanged event received! Refreshing data for date:', selectedDate);
      // Reduced delay for faster status updates (300ms is enough for database consistency)
      setTimeout(() => {
        loadData();
      }, 300);
    };
    
    // Listen for online/offline changes to refresh data
    const handleOnline = () => {
      console.log('🌐 Connection restored! Refreshing data to pick up synced changes...');
      setTimeout(() => {
        loadData();
      }, 1000); // Give sync a moment to complete
    };
    
    window.addEventListener('visitDataChanged', handleRefresh);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('visitDataChanged', handleRefresh);
      window.removeEventListener('online', handleOnline);
    };
  }, [loadData, selectedDate]);

  const invalidateData = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    beatPlans,
    visits,
    retailers,
    orders,
    pointsData,
    progressStats,
    isLoading,
    error,
    invalidateData,
  };
};
