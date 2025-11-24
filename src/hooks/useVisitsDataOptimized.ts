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

      const filteredBeatPlans = cachedBeatPlans.filter(
        (plan: any) => plan.user_id === userId && plan.plan_date === selectedDate
      );
      const filteredVisits = cachedVisits.filter(
        (v: any) => v.user_id === userId && v.planned_date === selectedDate
      );

      // Get retailer IDs from visits and planned beats only
      const visitRetailerIds = filteredVisits.map((v: any) => v.retailer_id);
      const plannedBeatIds = filteredBeatPlans.map((bp: any) => bp.beat_id);
      const plannedRetailerIds = cachedRetailers
        .filter((r: any) => r.user_id === userId && plannedBeatIds.includes(r.beat_id))
        .map((r: any) => r.id);
      
      const allRetailerIds = Array.from(new Set([...visitRetailerIds, ...plannedRetailerIds]));
      
      const filteredRetailers = cachedRetailers.filter(
        (r: any) => allRetailerIds.includes(r.id)
      );

      // Filter orders by date
      const dateStart = new Date(selectedDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(selectedDate);
      dateEnd.setHours(23, 59, 59, 999);

      const filteredOrders = cachedOrders.filter((o: any) => {
        const orderDate = new Date(o.created_at);
        return o.user_id === userId && orderDate >= dateStart && orderDate <= dateEnd;
      });

      // Display cached data immediately
      if (
        filteredBeatPlans.length > 0 ||
        filteredVisits.length > 0
      ) {
        // Calculate progress stats from cached data immediately
        const ordersByRetailer = new Map<string, number>();
        filteredOrders.forEach((o: any) => {
          ordersByRetailer.set(o.retailer_id, (ordersByRetailer.get(o.retailer_id) || 0) + Number(o.total_amount || 0));
        });

        const progressPlannedBeatIds = filteredBeatPlans.map((bp: any) => bp.beat_id);

        let planned = 0;
        let productive = 0;
        let unproductive = 0;
        let totalOrders = 0;
        let totalOrderValue = 0;

        filteredRetailers.forEach((retailer: any) => {
          const visit = filteredVisits.find((v: any) => v.retailer_id === retailer.id);
          const isPlanned = progressPlannedBeatIds.includes(retailer.beat_id);
          
          if (!visit && !isPlanned) return;

          const orderValue = ordersByRetailer.get(retailer.id) || 0;
          const hasOrder = orderValue > 0;
          
          // Determine status: check order first, then no_order_reason, then check_in, then planned
          const status = hasOrder ? 'productive' : 
                        (visit?.no_order_reason || visit?.status === 'unproductive') ? 'unproductive' : 
                        visit?.check_in_time ? 'in-progress' : 
                        'planned';

          if (status === 'productive') {
            productive++;
            totalOrders++;
            totalOrderValue += orderValue;
          } else if (status === 'unproductive') {
            unproductive++;
          } else if (status === 'planned' || status === 'in-progress' || status === 'cancelled') {
            planned++;
          }
        });

        setProgressStats({ planned, productive, unproductive, totalOrders, totalOrderValue });
        console.log('📊 Progress stats calculated (network):', { planned, productive, unproductive, totalOrders, totalOrderValue });

        // Cache ONLY current date data (don't bloat storage with historical data)
        // Beat plans and retailers are already cached by useMasterDataCache
        // Only cache visits for current date
        await Promise.all([
          ...visitsData.map(visit => offlineStorage.save(STORES.VISITS, visit))
        ]);
        
        console.log('[VisitsData] ✅ Cached current date visits only (not storing orders/beat plans to save storage)');

        // Update state with fresh data
        setBeatPlans(beatPlansData);
        setVisits(visitsData);
        setRetailers(retailersData);
        setOrders(ordersData);
        
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
    loadData();

    // Listen for manual refresh events
    const handleRefresh = () => {
      console.log('🔄 Manual refresh triggered');
      loadData();
    };
    
    window.addEventListener('visitDataChanged', handleRefresh);
    
    return () => {
      window.removeEventListener('visitDataChanged', handleRefresh);
    };
  }, [loadData]);

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
