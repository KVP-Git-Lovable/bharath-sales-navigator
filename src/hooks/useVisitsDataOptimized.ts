import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES, MIN_SYNC_INTERVAL_MS } from '@/lib/offlineStorage';
import { loadMyVisitsSnapshot, saveMyVisitsSnapshot, clearMyVisitsSnapshot } from '@/lib/myVisitsSnapshot';
import { getLocalTodayDate } from '@/utils/dateUtils';
import { isSlowConnection, getConnectionQuality, getManualSlowMode } from '@/utils/internetSpeedCheck';
import { getLastChangeTimestamp, clearChangeMarker } from '@/lib/visitChangeMarker';

interface UseVisitsDataOptimizedProps {
  userId: string | undefined;
  selectedDate: string;
  viewUserId?: string; // Optional: view another user's data (for managers viewing subordinates)
}

interface PointsData {
  total: number;
  byRetailer: Map<string, { name: string; points: number; visitId: string | null }>;
}

interface ProgressStats {
  planned: number; // Pending visits (not yet visited)
  productive: number;
  unproductive: number;
  totalOrders: number;
  totalOrderValue: number;
  totalPlanned: number; // Total planned visits (doesn't change when status changes)
}

// SMART SYNC: Track individual item changes by ID + timestamp
interface ItemFingerprint {
  id: string;
  updatedAt: string;
  hash: string;
}

// Generate a simple hash for an item to detect changes
const generateItemHash = (item: any): string => {
  if (!item) return '';
  // Use key fields that matter for display
  const relevantFields = {
    status: item.status,
    no_order_reason: item.no_order_reason,
    total_amount: item.total_amount,
    pending_amount: item.pending_amount,
    order_value: item.order_value,
  };
  return JSON.stringify(relevantFields);
};

// SMART COMPARE: Returns only items that actually changed
const getChangedItems = <T extends { id: string; updated_at?: string }>(
  existing: T[],
  incoming: T[]
): { changed: T[], unchanged: string[], added: T[], removed: string[] } => {
  const existingMap = new Map(existing.map(item => [item.id, item]));
  const incomingMap = new Map(incoming.map(item => [item.id, item]));
  
  const changed: T[] = [];
  const unchanged: string[] = [];
  const added: T[] = [];
  const removed: string[] = [];
  
  // Check incoming items
  for (const [id, item] of incomingMap) {
    const existingItem = existingMap.get(id);
    if (!existingItem) {
      added.push(item);
    } else {
      // Compare by updated_at and hash
      const existingHash = generateItemHash(existingItem);
      const incomingHash = generateItemHash(item);
      const existingTime = (existingItem as any).updated_at || '';
      const incomingTime = item.updated_at || '';
      
      if (incomingTime > existingTime || incomingHash !== existingHash) {
        changed.push(item);
      } else {
        unchanged.push(id);
      }
    }
  }
  
  // Check for removed items
  for (const id of existingMap.keys()) {
    if (!incomingMap.has(id)) {
      removed.push(id);
    }
  }
  
  return { changed, unchanged, added, removed };
};

// Calculate progress stats - PURE FUNCTION (no network calls)
// FIX: Added date parameter to filter visits by selectedDate to prevent stale data counts
const calculateStats = (visits: any[], orders: any[], retailers: any[], selectedDate?: string): ProgressStats => {
  // CRITICAL FIX: Filter visits to ONLY the selected date to prevent stale snapshot data from contaminating counts
  const dateFilteredVisits = selectedDate 
    ? visits.filter(v => v.planned_date === selectedDate)
    : visits;
  
  // Also filter orders by date
  const dateFilteredOrders = selectedDate
    ? orders.filter(o => o.order_date === selectedDate)
    : orders;
  
  const retailersWithOrders = new Set(dateFilteredOrders.map(o => o.retailer_id));
  const visitsByRetailer = new Map<string, any[]>();
  
  dateFilteredVisits.forEach(v => {
    if (!v?.retailer_id) return;
    const list = visitsByRetailer.get(v.retailer_id) || [];
    list.push(v);
    visitsByRetailer.set(v.retailer_id, list);
  });

  let planned = 0, productive = 0, unproductive = 0;
  const countedRetailers = new Set<string>();

  visitsByRetailer.forEach((group, retailerId) => {
    countedRetailers.add(retailerId);
    if (retailersWithOrders.has(retailerId)) productive++;
    else if (group.some(v => v.status === 'productive')) productive++;
    else if (group.some(v => v.status === 'unproductive' || !!v.no_order_reason)) unproductive++;
    else planned++;
  });

  retailersWithOrders.forEach(rid => {
    if (!countedRetailers.has(rid)) {
      productive++;
      countedRetailers.add(rid);
    }
  });

  retailers.forEach(r => {
    if (!countedRetailers.has(r.id)) planned++;
  });

  // Total planned = all retailers in the beat (doesn't change when visit status changes)
  // This is the total count of planned visits for the day
  const totalPlanned = retailers.length;

  return {
    planned,
    productive,
    unproductive,
    totalOrders: dateFilteredOrders.length,
    totalOrderValue: dateFilteredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    totalPlanned
  };
};

// Helper to fetch points for a specific date
const fetchPointsForDate = async (uid: string, date: string): Promise<PointsData> => {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  const { data: pointsRaw } = await supabase
    .from('gamification_points')
    .select('points, reference_id, metadata')
    .eq('user_id', uid)
    .gte('earned_at', dateStart.toISOString())
    .lte('earned_at', dateEnd.toISOString());

  const total = pointsRaw?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;
  const byRetailer = new Map<string, { name: string; points: number; visitId: string | null }>();
  
  // Group points by retailer from metadata
  if (pointsRaw) {
    for (const p of pointsRaw) {
      const retailerId = (p.metadata as any)?.retailer_id;
      if (retailerId) {
        const existing = byRetailer.get(retailerId) || { name: '', points: 0, visitId: null };
        byRetailer.set(retailerId, {
          ...existing,
          points: existing.points + (p.points || 0),
          visitId: p.reference_id || existing.visitId
        });
      }
    }
  }

  return { total, byRetailer };
};

export const useVisitsDataOptimized = ({ userId, selectedDate, viewUserId }: UseVisitsDataOptimizedProps) => {
  // The effective user ID to fetch data for:
  // - If viewUserId is provided and not 'self', use that (manager viewing subordinate)
  // - Otherwise use the authenticated user's ID
  const effectiveUserId = viewUserId && viewUserId !== 'self' ? viewUserId : userId;
  
  const [beatPlans, setBeatPlans] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pointsData, setPointsData] = useState<PointsData>({ total: 0, byRetailer: new Map() });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<any>(null);

  const lastDateRef = useRef<string>('');
  const lastUserRef = useRef<string>(''); // Track user changes for cache invalidation
  const cacheRef = useRef<Map<string, any>>(new Map());
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastSyncTimeRef = useRef<Map<string, number>>(new Map());
  const syncInProgressRef = useRef(false);
  
  // SMART SYNC: Lock to prevent multiple syncs
  const smartSyncLockRef = useRef(false);
  
  // MEMORY OPTIMIZATION: Limit cached dates to prevent unbounded growth
  const MAX_CACHED_DATES = 7;
  
  const pruneDateCache = useCallback(() => {
    if (cacheRef.current.size <= MAX_CACHED_DATES) return;
    
    const entries = Array.from(cacheRef.current.entries())
      .sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
    
    const toRemove = entries.slice(0, entries.length - MAX_CACHED_DATES);
    for (const [key] of toRemove) {
      cacheRef.current.delete(key);
    }
    console.log(`[useVisitsData] Pruned ${toRemove.length} old date caches, remaining: ${cacheRef.current.size}`);
  }, []);
  
  // STALE CLOSURE FIX: Keep refs in sync with latest values for event handlers
  const userIdRef = useRef(effectiveUserId);
  const selectedDateRef = useRef(selectedDate);
  
  // CRITICAL: Clear ALL caches when viewing different user to prevent data leakage
  useEffect(() => {
    if (effectiveUserId && lastUserRef.current && effectiveUserId !== lastUserRef.current) {
      console.log('[useVisitsDataOptimized] User changed from', lastUserRef.current, 'to', effectiveUserId, '- CLEARING ALL CACHES');
      
      // Clear in-memory caches
      cacheRef.current.clear();
      lastSyncTimeRef.current.clear();
      
      // Reset all state to prevent showing previous user's data
      setBeatPlans([]);
      setVisits([]);
      setRetailers([]);
      setOrders([]);
      setPointsData({ total: 0, byRetailer: new Map() });
      setHasLoadedOnce(false);
      setIsLoading(true);
      
      // Reset fetch flags to force fresh load
      isFetchingRef.current = false;
      lastDateRef.current = '';
    }
    lastUserRef.current = effectiveUserId || '';
  }, [effectiveUserId]);
  
  useEffect(() => {
    userIdRef.current = effectiveUserId;
    selectedDateRef.current = selectedDate;
  }, [effectiveUserId, selectedDate]);

  // Memoized progress stats - LOCAL CALCULATION ONLY
  // FIX: Pass selectedDate to calculateStats to ensure only matching visits are counted
  const progressStats = useMemo(() => {
    // Warn only if there's a data inconsistency (visits from wrong dates in state)
    const wrongDateVisits = visits.filter(v => v.planned_date !== selectedDate);
    if (wrongDateVisits.length > 0) {
      console.warn(`[ProgressStats] ⚠️ ${wrongDateVisits.length} visits with wrong dates found, expected: ${selectedDate}`);
    }
    
    return calculateStats(visits, orders, retailers, selectedDate);
  }, [visits, orders, retailers, selectedDate]);

  // Check if date is today using centralized date logic
  const isToday = useCallback((dateStr: string): boolean => {
    return dateStr === getLocalTodayDate();
  }, []);

  // Check if should sync (time-based throttling)
  const shouldSyncNow = useCallback((date: string): boolean => {
    const lastSync = lastSyncTimeRef.current.get(date);
    if (!lastSync) return true;
    return (Date.now() - lastSync) >= MIN_SYNC_INTERVAL_MS;
  }, []);

  // Load from offline storage - ALWAYS INSTANT
  // FIX: Less restrictive filtering - include ALL user's retailers that match beats
  const loadFromOfflineStorage = useCallback(async (uid: string, date: string) => {
    try {
      const [cachedBeatPlans, cachedVisits, cachedRetailers, cachedOrders, cachedBeats] = await Promise.all([
        offlineStorage.getAll<any>(STORES.BEAT_PLANS),
        offlineStorage.getAll<any>(STORES.VISITS),
        offlineStorage.getAll<any>(STORES.RETAILERS),
        offlineStorage.getAll<any>(STORES.ORDERS),
        offlineStorage.getAll<any>(STORES.BEATS)
      ]);

      const filteredBeatPlans = cachedBeatPlans.filter(bp => 
        bp.user_id === uid && bp.plan_date === date
      );
      const filteredVisits = cachedVisits.filter(v => 
        v.user_id === uid && v.planned_date === date
      );
      
      // Today's beat IDs from beat plans
      const todayBeatIds = filteredBeatPlans.map(bp => bp.beat_id);
      const visitRetailerIds = new Set(filteredVisits.map(v => v.retailer_id));
      
      // Get explicit retailer IDs from beat_data
      const explicitRetailerIds: string[] = [];
      for (const bp of filteredBeatPlans) {
        const beatData = bp.beat_data as any;
        if (beatData?.retailer_ids?.length > 0) {
          explicitRetailerIds.push(...beatData.retailer_ids);
        }
      }
      
      // FIX: STRICT filter - only include retailers from:
      // 1. Today's beat plans (todayBeatIds) - primary filter
      // 2. Visits for today (visitRetailerIds)
      // 3. Explicit retailer IDs in beat_data
      // 4. Offline-created retailers ONLY if their beat_id matches today's beats
      const filteredRetailers = cachedRetailers.filter(r => 
        r.user_id === uid && (
          todayBeatIds.includes(r.beat_id) ||                              // Today's beat plans
          visitRetailerIds.has(r.id) ||                                    // Has visit today
          explicitRetailerIds.includes(r.id) ||                            // Explicit in beat_data
          (r.id?.startsWith('offline_') && todayBeatIds.includes(r.beat_id)) // Offline + today's beat
        )
      );
      
      const retailerIds = new Set(filteredRetailers.map(r => r.id));
      const filteredOrders = cachedOrders.filter(o => 
        o.user_id === uid && o.order_date === date && 
        o.status === 'confirmed' && retailerIds.has(o.retailer_id)
      );

      console.log('[OfflineStorage] Loaded:', {
        beatPlans: filteredBeatPlans.length,
        visits: filteredVisits.length,
        retailers: filteredRetailers.length,
        orders: filteredOrders.length,
        todayBeatIds
      });

      return {
        beatPlans: filteredBeatPlans,
        visits: filteredVisits,
        retailers: filteredRetailers,
        orders: filteredOrders
      };
    } catch (e) {
      console.error('Offline storage error:', e);
      return null;
    }
  }, []);

  // GRANULAR UPDATE: Update only specific items that changed
  const applyGranularUpdate = useCallback(<T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    changes: { changed: T[], added: T[], removed: string[] }
  ) => {
    if (changes.changed.length === 0 && changes.added.length === 0 && changes.removed.length === 0) {
      return false; // No changes
    }
    
    setter(prev => {
      let updated = [...prev];
      
      // Apply changes (update existing items)
      if (changes.changed.length > 0) {
        const changedMap = new Map(changes.changed.map(item => [item.id, item]));
        updated = updated.map(item => changedMap.get(item.id) || item);
      }
      
      // Add new items
      if (changes.added.length > 0) {
        const existingIds = new Set(updated.map(item => item.id));
        const newItems = changes.added.filter(item => !existingIds.has(item.id));
        updated = [...updated, ...newItems];
      }
      
      // Remove deleted items
      if (changes.removed.length > 0) {
        const removedSet = new Set(changes.removed);
        updated = updated.filter(item => !removedSet.has(item.id));
      }
      
      return updated;
    });
    
    return true; // Changes applied
  }, []);

  // SMART DELTA SYNC: Fetch ALL visits/orders (no delta filter), fetch retailers by beat_id
  const smartDeltaSync = useCallback(async (uid: string, date: string) => {
    // Prevent concurrent syncs
    if (smartSyncLockRef.current || !navigator.onLine || !mountedRef.current) {
      return;
    }
    
    // SLOW CONNECTION CHECK: Skip network sync entirely on slow connections or manual slow mode
    // This prevents lag and ensures instant display from cache
    const connectionQuality = getConnectionQuality();
    const manualSlowMode = getManualSlowMode();
    
    if (isSlowConnection() || manualSlowMode) {
      console.log('[SmartSync] ⚡ Skipping sync - slow connection/mode detected:', {
        quality: connectionQuality,
        manualSlowMode,
        isSlowConnection: isSlowConnection()
      });
      return;
    }
    
    if (!shouldSyncNow(date)) {
      console.log('[SmartSync] Skipping - synced recently');
      return;
    }

    smartSyncLockRef.current = true;
    console.log('[SmartSync] Starting full sync for', date, '| Connection:', connectionQuality);

    try {
      // Reduce timeout for medium connections (5s), normal for fast (8s)
      const timeoutMs = connectionQuality === 'medium' ? 5000 : 8000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // FIX #1: ALWAYS fetch ALL visits and orders for the date (no delta filter)
      // This ensures unproductive visits are never missed due to stale delta timestamps
      const [bpRes, vRes, oRes, pointsFetched] = await Promise.all([
        supabase.from('beat_plans').select('*').eq('user_id', uid).eq('plan_date', date),
        supabase.from('visits').select('*').eq('user_id', uid).eq('planned_date', date),
        supabase.from('orders').select('*').eq('user_id', uid).eq('order_date', date).in('status', ['confirmed', 'delivered']),
        fetchPointsForDate(uid, date)
      ]);
      clearTimeout(timeoutId);

      if (!mountedRef.current || lastDateRef.current !== date) {
        smartSyncLockRef.current = false;
        return;
      }

      const newBeatPlans = bpRes.data || [];
      const newVisits = vRes.data || [];
      const newOrders = oRes.data || [];

      console.log(`[SmartSync] Fetched: ${newBeatPlans.length} beat plans, ${newVisits.length} visits, ${newOrders.length} orders, ${pointsFetched.total} points`);
      
      // Update points state
      setPointsData(pointsFetched);

      // Get current state from cache
      const currentCache = cacheRef.current.get(date) || { beatPlans: [], visits: [], retailers: [], orders: [] };

      // GRANULAR COMPARISON
      let uiUpdated = false;

      // Update beat plans granularly
      const bpChanges = getChangedItems(currentCache.beatPlans || [], newBeatPlans);
      const beatPlansChanged = bpChanges.changed.length > 0 || bpChanges.added.length > 0 || bpChanges.removed.length > 0;
      
      // CRITICAL FIX: Track if beats themselves changed (not just content updates)
      const oldBeatIdsFromCache = (currentCache.beatPlans || []).map((bp: any) => bp.beat_id).sort().join(',');
      const newBeatIdsFromNetwork = newBeatPlans.map((bp: any) => bp.beat_id).sort().join(',');
      const beatsSelectionChanged = oldBeatIdsFromCache !== newBeatIdsFromNetwork;
      
      if (beatPlansChanged) {
        // When beat selection changes (beats added/removed), clear snapshot to force fresh load
        if (beatsSelectionChanged && uid) {
          console.log(`[SmartSync] Beat selection changed, clearing snapshot for ${date}`);
          clearMyVisitsSnapshot(uid, date).catch(e => console.error('Failed to clear snapshot:', e));
        }
        
        applyGranularUpdate(setBeatPlans, bpChanges);
        currentCache.beatPlans = newBeatPlans;
        uiUpdated = true;
      }

      // FIX: ALWAYS replace visits with network data - visits are the source of truth for status
      // This fixes the bug where unproductive visits marked yesterday night weren't showing
      const vChanges = getChangedItems(currentCache.visits, newVisits);
      const visitsChanged = vChanges.changed.length > 0 || vChanges.added.length > 0 || vChanges.removed.length > 0;
      
      // CRITICAL: Even if getChangedItems doesn't detect changes (due to hash issues),
      // ALWAYS replace visits if network data has different count - this catches missed updates
      const visitCountDifferent = currentCache.visits?.length !== newVisits.length;
      
      if (visitsChanged || visitCountDifferent) {
        // Full replacement for visits - don't use granular update which can miss items
        setVisits(newVisits);
        currentCache.visits = newVisits;
        uiUpdated = true;
        console.log(`[SmartSync] Visits REPLACED: ${currentCache.visits?.length || 0} → ${newVisits.length}`);
      }

      // Update orders granularly - ALWAYS compare full list
      const oChanges = getChangedItems(currentCache.orders, newOrders);
      if (oChanges.changed.length > 0 || oChanges.added.length > 0 || oChanges.removed.length > 0) {
        uiUpdated = applyGranularUpdate(setOrders, oChanges) || uiUpdated;
        currentCache.orders = newOrders;
      }

      // FIX #2: ALWAYS fetch ALL retailers by beat_id (not just from visits/orders)
      // This ensures new retailers added to beats are always included
      const beatIds = newBeatPlans.map(bp => bp.beat_id);
      const visitRetailerIds = newVisits.map(v => v.retailer_id);
      const orderRetailerIds = newOrders.map(o => o.retailer_id);
      
      // Get explicit retailer IDs from beat_data
      const explicitRetailerIds: string[] = [];
      for (const bp of newBeatPlans) {
        const beatData = bp.beat_data as any;
        if (beatData?.retailer_ids?.length > 0) {
          explicitRetailerIds.push(...beatData.retailer_ids);
        }
      }
      
      // Combine all sources for retailer IDs
      const allRetailerIds = [...new Set([...visitRetailerIds, ...orderRetailerIds, ...explicitRetailerIds])];

      // Fetch retailers by beat_id AND by explicit IDs
      // FIX: Start fresh - don't keep old retailers from other beats/dates
      const retailerMap = new Map<string, any>();
      
      // Only keep offline-created retailers that match today's beats
      for (const r of currentCache.retailers) {
        if (r.id?.startsWith('offline_') && beatIds.includes(r.beat_id)) {
          retailerMap.set(r.id, r);
        }
      }
      
      if (beatIds.length > 0) {
        const { data: beatRetailers } = await supabase
          .from('retailers')
          .select('*')
          .eq('user_id', uid)
          .in('beat_id', beatIds);
        if (beatRetailers) {
          for (const r of beatRetailers) {
            retailerMap.set(r.id, r);
          }
        }
      }
      
      if (allRetailerIds.length > 0) {
        const { data: explicitRetailers } = await supabase
          .from('retailers')
          .select('*')
          .eq('user_id', uid)
          .in('id', allRetailerIds);
        if (explicitRetailers) {
          for (const r of explicitRetailers) {
            retailerMap.set(r.id, r);
          }
        }
      }

      // CRITICAL FIX: Always update retailers based on current beat plans
      // Even if retailerMap is empty (beat has no retailers), we must clear old retailers
      const allRetailers = Array.from(retailerMap.values());
      
      const rChanges = getChangedItems(currentCache.retailers || [], allRetailers);
      const retailersActuallyChanged = rChanges.changed.length > 0 || rChanges.added.length > 0 || rChanges.removed.length > 0;
      
      // FIX: Also detect if beats changed - if so, REPLACE retailers completely
      const oldBeatIds = (currentCache.beatPlans || []).map((bp: any) => bp.beat_id).sort().join(',');
      const newBeatIds = newBeatPlans.map((bp: any) => bp.beat_id).sort().join(',');
      const beatsChanged = oldBeatIds !== newBeatIds;
      
      if (retailersActuallyChanged || beatsChanged) {
        // When beats change, do a FULL REPLACEMENT instead of granular update
        // This ensures retailers from removed beats are properly cleared
        if (beatsChanged) {
          console.log(`[SmartSync] Beats changed: "${oldBeatIds}" -> "${newBeatIds}", REPLACING retailers`);
          setRetailers(allRetailers);
        } else {
          applyGranularUpdate(setRetailers, rChanges);
        }
        currentCache.retailers = allRetailers;
        uiUpdated = true;
        console.log(`[SmartSync] Retailers updated: ${allRetailers.length} total (${rChanges.added.length} added, ${rChanges.removed.length} removed)`);
      }

      // Update cache with timestamp and points
      currentCache.points = { total: pointsFetched.total, byRetailer: Array.from(pointsFetched.byRetailer.entries()) };
      currentCache.timestamp = Date.now();
      cacheRef.current.set(date, currentCache);

      // Save to offline storage (background, non-blocking)
      Promise.all([
        offlineStorage.mergeData(STORES.BEAT_PLANS, currentCache.beatPlans),
        offlineStorage.mergeData(STORES.VISITS, currentCache.visits),
        offlineStorage.mergeData(STORES.RETAILERS, currentCache.retailers),
        offlineStorage.mergeData(STORES.ORDERS, currentCache.orders)
      ]).catch(e => console.error('[SmartSync] Storage error:', e));

      // Save snapshot (background) - pass date to calculateStats for proper filtering
      // Include points for faster loading on next visit
      saveMyVisitsSnapshot(uid, date, {
        beatPlans: currentCache.beatPlans,
        visits: currentCache.visits,
        retailers: currentCache.retailers,
        orders: currentCache.orders,
        progressStats: calculateStats(currentCache.visits, currentCache.orders, currentCache.retailers, date),
        currentBeatName: currentCache.beatPlans.map((p: any) => p.beat_name).join(', '),
        pointsTotal: pointsFetched.total,
        pointsByRetailer: Array.from(pointsFetched.byRetailer.entries())
      }).catch(e => console.error('[SmartSync] Snapshot error:', e));

      // Update sync timestamp
      lastSyncTimeRef.current.set(date, Date.now());
      await offlineStorage.setSyncMetadata('visits', uid, date);
      
      console.log(`[SmartSync] Complete - UI updated: ${uiUpdated}`);

    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('[SmartSync] Timeout - continuing with cached data');
      } else {
        console.error('[SmartSync] Error:', e);
      }
    } finally {
      smartSyncLockRef.current = false;
    }
  }, [shouldSyncNow, applyGranularUpdate]);

  // INITIAL LOAD: Local-first, instant display
  const loadData = useCallback(async () => {
    if (!effectiveUserId || !selectedDate) return;
    if (isFetchingRef.current && lastDateRef.current === selectedDate) return;
    
    // CRITICAL FIX: If date changed, immediately clear visits/orders to prevent
    // showing stale data from previous date while new data loads
    const dateChanged = lastDateRef.current !== '' && lastDateRef.current !== selectedDate;
    if (dateChanged) {
      console.log('[LoadData] Date changed from', lastDateRef.current, 'to', selectedDate, '- clearing stale data');
      // Filter existing state to only keep items matching new date
      setVisits(prev => prev.filter(v => v.planned_date === selectedDate));
      setOrders(prev => prev.filter(o => o.order_date === selectedDate));
    }
    
    isFetchingRef.current = true;
    lastDateRef.current = selectedDate;

    // FIX #3: Cache staleness check - for today, if cache is old, force full sync
    const MAX_CACHE_AGE_MS = 30 * 60 * 1000; // 30 minutes
    const isTodayDate = isToday(selectedDate);

    // CRITICAL FIX: Check for changes made on other pages while this component was unmounted
    // If changes were detected, invalidate the in-memory cache to force fresh snapshot load
    const changeMarker = await getLastChangeTimestamp();
    if (changeMarker && changeMarker.date === selectedDate) {
      const cached = cacheRef.current.get(selectedDate);
      if (cached && changeMarker.timestamp > (cached.timestamp || 0)) {
        console.log('[LoadData] 🔄 Change detected while unmounted, invalidating cache for', selectedDate);
        cacheRef.current.delete(selectedDate);
        await clearChangeMarker();
      }
    }

    // 1. Try in-memory cache FIRST (instant)
    const cached = cacheRef.current.get(selectedDate);
    // Check for ANY valid data (beat plans, retailers, visits, or orders)
    const hasValidCachedData = cached && (
      cached.beatPlans?.length > 0 || 
      cached.retailers?.length > 0 || 
      cached.visits?.length > 0 || 
      cached.orders?.length > 0
    );
    
    // CRITICAL FIX: Validate that cached visits actually match the selected date
    // This prevents stale data from wrong dates contaminating the display
    const cachedVisitsMatchDate = cached?.visits?.length
      ? cached.visits.every((v: any) => v.planned_date === selectedDate)
      : true;
    const cachedOrdersMatchDate = cached?.orders?.length
      ? cached.orders.every((o: any) => o.order_date === selectedDate)
      : true;
    const isCacheDataValid = cachedVisitsMatchDate && cachedOrdersMatchDate;
    
    if (!isCacheDataValid && cached) {
      console.warn('[LoadData] ⚠️ In-memory cache has mismatched dates, clearing cache for', selectedDate);
      cacheRef.current.delete(selectedDate);
    }
    
    // Check if cache is stale (for today only)
    const cacheAge = cached?.timestamp ? Date.now() - cached.timestamp : Infinity;
    const isCacheStale = isTodayDate && cacheAge > MAX_CACHE_AGE_MS;
    
    if (hasValidCachedData && isCacheDataValid) {
      setBeatPlans(cached.beatPlans || []);
      setVisits(cached.visits || []);
      setRetailers(cached.retailers || []);
      setOrders(cached.orders || []);
      if (cached.points) {
        setPointsData({ 
          total: cached.points.total, 
          byRetailer: new Map(cached.points.byRetailer) 
        });
      }
      setIsLoading(false);
      setHasLoadedOnce(true);
      
      // Background smart sync - force if cache is stale
      // SLOW CONNECTION CHECK: Skip background sync entirely on slow connections
      const slowConnection = isSlowConnection();
      if (!slowConnection && navigator.onLine && (isCacheStale || (isTodayDate && shouldSyncNow(selectedDate)))) {
        console.log('[LoadData] Triggering sync - cache stale:', isCacheStale);
        requestIdleCallback?.(() => smartDeltaSync(effectiveUserId, selectedDate)) ||
          setTimeout(() => smartDeltaSync(effectiveUserId, selectedDate), 100);
      } else if (slowConnection) {
        console.log('[LoadData] ⚡ Skipping background sync - slow connection, using cache');
      }
      isFetchingRef.current = false;
      return;
    }

    // 2. Try persistent snapshot (fast)
    try {
      const snapshot = await loadMyVisitsSnapshot(effectiveUserId, selectedDate);
      
      // CRITICAL FIX: Validate snapshot data matches the selectedDate
      // This prevents stale visits from other dates contaminating the current view
      const snapshotVisitsMatchDate = snapshot?.visits?.length 
        ? snapshot.visits.every((v: any) => v.planned_date === selectedDate)
        : true; // No visits = passes check
      
      const snapshotOrdersMatchDate = snapshot?.orders?.length
        ? snapshot.orders.every((o: any) => o.order_date === selectedDate)
        : true; // No orders = passes check
        
      const isSnapshotValid = snapshotVisitsMatchDate && snapshotOrdersMatchDate;
      
      if (!isSnapshotValid && snapshot) {
        console.warn('[LoadData] ⚠️ Snapshot has mismatched dates, ignoring snapshot data');
        console.log('[LoadData] Expected date:', selectedDate);
        console.log('[LoadData] Sample visit dates:', snapshot.visits?.slice(0, 3).map((v: any) => v.planned_date));
      }
      
      // Check for ANY valid data (beat plans, retailers, visits, or orders)
      const hasValidSnapshotData = isSnapshotValid && snapshot && (
        snapshot.beatPlans?.length > 0 || 
        snapshot.retailers?.length > 0 || 
        snapshot.visits?.length > 0 || 
        snapshot.orders?.length > 0
      );
      if (hasValidSnapshotData) {
        // CRITICAL FIX: Filter snapshot retailers to ONLY those matching snapshot's beat plans
        // This prevents stale retailers from removed beats appearing in the UI
        const snapshotBeatIds = (snapshot.beatPlans || []).map((bp: any) => bp.beat_id);
        const snapshotVisitRetailerIds = new Set((snapshot.visits || []).map((v: any) => v.retailer_id));
        
        // Filter retailers to only those from current beat plans or with visits today
        const filteredSnapshotRetailers = (snapshot.retailers || []).filter((r: any) => 
          snapshotBeatIds.includes(r.beat_id) || snapshotVisitRetailerIds.has(r.id)
        );
        
        if (filteredSnapshotRetailers.length !== (snapshot.retailers || []).length) {
          console.log(`[LoadData] Filtered snapshot retailers: ${snapshot.retailers?.length || 0} -> ${filteredSnapshotRetailers.length} (matching beat plans)`);
        }
        
        // FIX: Also check offline storage for NEW retailers that might not be in snapshot
        const offlineData = await loadFromOfflineStorage(effectiveUserId, selectedDate);
        
        // Merge: Add any offline retailers not in snapshot (only if they match beat plans)
        let mergedRetailers = [...filteredSnapshotRetailers];
        if (offlineData?.retailers?.length) {
          const snapshotRetailerIds = new Set(mergedRetailers.map(r => r.id));
          const newRetailers = offlineData.retailers.filter(r => 
            !snapshotRetailerIds.has(r.id) && snapshotBeatIds.includes(r.beat_id)
          );
          if (newRetailers.length > 0) {
            mergedRetailers = [...mergedRetailers, ...newRetailers];
            console.log('[LoadData] Merged', newRetailers.length, 'new retailers from offline storage');
          }
        }
        
        setBeatPlans(snapshot.beatPlans || []);
        setVisits(snapshot.visits || []);
        setRetailers(mergedRetailers);
        setOrders(snapshot.orders || []);
        
        // FIX: Load points from snapshot for instant display
        if (snapshot.pointsTotal !== undefined || snapshot.pointsByRetailer) {
          const pointsFromSnapshot: PointsData = {
            total: snapshot.pointsTotal || 0,
            byRetailer: new Map(snapshot.pointsByRetailer || [])
          };
          setPointsData(pointsFromSnapshot);
          console.log('[LoadData] Loaded points from snapshot:', pointsFromSnapshot.total);
        }
        
        setIsLoading(false);
        setHasLoadedOnce(true);
        
        // Update cache with merged data
        cacheRef.current.set(selectedDate, { 
          ...snapshot, 
          retailers: mergedRetailers,
          points: snapshot.pointsByRetailer ? { total: snapshot.pointsTotal || 0, byRetailer: snapshot.pointsByRetailer } : undefined,
          timestamp: Date.now() 
        });
        
        // CRITICAL FIX: For today's date, sync after loading snapshot
        // SLOW CONNECTION CHECK: Skip all syncs on slow connections - use cached data
        const slowConnection = isSlowConnection();
        if (slowConnection) {
          console.log('[LoadData] ⚡ Using snapshot only - slow connection detected');
        } else if (navigator.onLine && isToday(selectedDate)) {
          // Skip throttle check for today - visit status must always be fresh
          requestIdleCallback?.(() => smartDeltaSync(effectiveUserId, selectedDate)) || 
            setTimeout(() => smartDeltaSync(effectiveUserId, selectedDate), 50);
        } else if (navigator.onLine && shouldSyncNow(selectedDate)) {
          requestIdleCallback?.(() => smartDeltaSync(effectiveUserId, selectedDate)) || 
            setTimeout(() => smartDeltaSync(effectiveUserId, selectedDate), 100);
        }
        isFetchingRef.current = false;
        return;
      }
    } catch (e) {
      // Continue to offline storage
    }

    // 3. Try offline storage
    const offlineData = await loadFromOfflineStorage(effectiveUserId, selectedDate);
    // Check for ANY valid offline data (beat plans, retailers, visits, or orders)
    const hasValidOfflineData = offlineData && (
      offlineData.beatPlans.length > 0 || 
      offlineData.retailers.length > 0 || 
      offlineData.visits.length > 0 || 
      offlineData.orders.length > 0
    );
    if (hasValidOfflineData) {
      setBeatPlans(offlineData.beatPlans);
      setVisits(offlineData.visits);
      setRetailers(offlineData.retailers);
      setOrders(offlineData.orders);
      setIsLoading(false);
      setHasLoadedOnce(true);
      
      cacheRef.current.set(selectedDate, offlineData);
      
      // SLOW NETWORK FIX: Check connection quality before triggering sync
      const slowConn = isSlowConnection();
      if (slowConn) {
        console.log('[LoadData] ⚡ Using offline data only - slow connection detected');
      } else if (navigator.onLine) {
        // FIX: Immediately fetch points for the selected date (not just today)
        // This ensures Points Earned updates correctly when date changes
        fetchPointsForDate(effectiveUserId, selectedDate)
          .then((pointsFetched) => {
            if (mountedRef.current && lastDateRef.current === selectedDate) {
              setPointsData(pointsFetched);
              console.log('[LoadData] Fetched points for', selectedDate, ':', pointsFetched.total);
            }
          })
          .catch((e) => console.warn('[LoadData] Points fetch failed:', e));
        
        // Background sync for other data
        if (isToday(selectedDate)) {
          // Skip throttle check for today - visit status must always be fresh
          requestIdleCallback?.(() => smartDeltaSync(effectiveUserId, selectedDate)) || 
            setTimeout(() => smartDeltaSync(effectiveUserId, selectedDate), 50);
        } else if (shouldSyncNow(selectedDate)) {
          requestIdleCallback?.(() => smartDeltaSync(effectiveUserId, selectedDate)) || 
            setTimeout(() => smartDeltaSync(effectiveUserId, selectedDate), 100);
        }
      }
      isFetchingRef.current = false;
      return;
    }

    // 4. No local data - do initial full load from network
    // SLOW NETWORK FIX: Skip network load if slow connection - show empty state instead
    const isSlowConn = isSlowConnection();
    if (navigator.onLine && !isSlowConn) {
      try {
        setIsLoading(true);
        await doFullInitialLoad(effectiveUserId, selectedDate);
      } finally {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    } else {
      // No cache, no network, or slow connection - show empty state
      if (isSlowConn) {
        console.log('[LoadData] ⚡ Skipping network load - slow connection, showing empty state');
      }
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
    
    isFetchingRef.current = false;
  }, [effectiveUserId, selectedDate, isToday, loadFromOfflineStorage, smartDeltaSync, shouldSyncNow]);

  // Full initial load - only used when no local data exists
  const doFullInitialLoad = useCallback(async (uid: string, date: string) => {
    // SLOW NETWORK FIX: Skip if slow connection detected mid-load
    if (isSlowConnection() || getManualSlowMode()) {
      console.log('[FullLoad] ⚡ Skipping - slow connection detected');
      return;
    }
    
    try {
      // SLOW NETWORK FIX: Add timeout to prevent hanging on slow networks
      const timeoutMs = 10000; // 10 second timeout for initial load
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const [bpRes, vRes, oRes, pointsFetched] = await Promise.all([
        supabase.from('beat_plans').select('*').eq('user_id', uid).eq('plan_date', date),
        supabase.from('visits').select('*').eq('user_id', uid).eq('planned_date', date),
        supabase.from('orders').select('*').eq('user_id', uid).eq('order_date', date).in('status', ['confirmed', 'delivered']),
        fetchPointsForDate(uid, date)
      ]);
      clearTimeout(timeoutId);

      const beatPlansData = bpRes.data || [];
      const visitsData = vRes.data || [];
      const ordersData = oRes.data || [];

      // Get retailer IDs
      const beatIds = beatPlansData.map(bp => bp.beat_id);
      const visitRetailerIds = visitsData.map(v => v.retailer_id);
      const orderRetailerIds = ordersData.map(o => o.retailer_id);
      
      const explicitRetailerIds: string[] = [];
      for (const bp of beatPlansData) {
        const beatData = bp.beat_data as any;
        if (beatData?.retailer_ids?.length > 0) {
          explicitRetailerIds.push(...beatData.retailer_ids);
        }
      }

      let allRetailerIds = [...new Set([...visitRetailerIds, ...orderRetailerIds, ...explicitRetailerIds])];

      if (beatIds.length > 0) {
        const { data: beatRetailers } = await supabase
          .from('retailers')
          .select('id')
          .eq('user_id', uid)
          .in('beat_id', beatIds);
        if (beatRetailers) {
          allRetailerIds = [...new Set([...allRetailerIds, ...beatRetailers.map(r => r.id)])];
        }
      }

      let retailersData: any[] = [];
      if (allRetailerIds.length > 0) {
        const { data } = await supabase
          .from('retailers')
          .select('*')
          .eq('user_id', uid)
          .in('id', allRetailerIds);
        retailersData = data || [];
      }

      if (!mountedRef.current || lastDateRef.current !== date) return;

      // Set state
      setBeatPlans(beatPlansData);
      setVisits(visitsData);
      setRetailers(retailersData);
      setOrders(ordersData);
      setPointsData(pointsFetched);

      // Update cache with timestamp for staleness check
      const cacheData = {
        beatPlans: beatPlansData,
        visits: visitsData,
        retailers: retailersData,
        orders: ordersData,
        points: { total: pointsFetched.total, byRetailer: Array.from(pointsFetched.byRetailer.entries()) },
        timestamp: Date.now()
      };
      cacheRef.current.set(date, cacheData);
      
      // MEMORY: Prune old date caches to prevent unbounded growth
      pruneDateCache();

      await Promise.all([
        offlineStorage.mergeData(STORES.BEAT_PLANS, beatPlansData),
        offlineStorage.mergeData(STORES.VISITS, visitsData),
        offlineStorage.mergeData(STORES.RETAILERS, retailersData),
        offlineStorage.mergeData(STORES.ORDERS, ordersData)
      ]);

      // Save snapshot - include points for faster loading
      await saveMyVisitsSnapshot(uid, date, {
        beatPlans: beatPlansData,
        visits: visitsData,
        retailers: retailersData,
        orders: ordersData,
        progressStats: calculateStats(visitsData, ordersData, retailersData, date),
        currentBeatName: beatPlansData.map(p => p.beat_name).join(', '),
        pointsTotal: pointsFetched.total,
        pointsByRetailer: Array.from(pointsFetched.byRetailer.entries())
      });

      // Update sync timestamp
      lastSyncTimeRef.current.set(date, Date.now());
      await offlineStorage.setSyncMetadata('visits', uid, date);

    } catch (e) {
      console.error('[FullLoad] Error:', e);
    }
  }, []);

  // Invalidate cache for date and reload from local
  const invalidateData = useCallback(async () => {
    cacheRef.current.delete(selectedDate);
    lastSyncTimeRef.current.delete(selectedDate);
    isFetchingRef.current = false;
    
    // Reload from local first
    if (effectiveUserId) {
      const offlineData = await loadFromOfflineStorage(effectiveUserId, selectedDate);
      
      // FIX: If no beat plans exist (all cleared), also clear retailers
      if (offlineData && offlineData.beatPlans.length === 0) {
        console.log('[InvalidateData] No beat plans found - clearing all data for date:', selectedDate);
        setBeatPlans([]);
        setVisits([]);
        setRetailers([]);
        setOrders([]);
        cacheRef.current.set(selectedDate, { beatPlans: [], visits: [], retailers: [], orders: [] });
      } else if (offlineData) {
        setBeatPlans(offlineData.beatPlans);
        setVisits(offlineData.visits);
        setRetailers(offlineData.retailers);
        setOrders(offlineData.orders);
        cacheRef.current.set(selectedDate, offlineData);
      }
      
      // SLOW NETWORK FIX: Only trigger background sync if connection is good
      const slowConn = isSlowConnection() || getManualSlowMode();
      if (navigator.onLine && !slowConn) {
        smartDeltaSync(effectiveUserId, selectedDate);
      } else if (slowConn) {
        console.log('[InvalidateData] ⚡ Skipping sync - slow connection, using local data');
      }
    }
  }, [selectedDate, effectiveUserId, loadFromOfflineStorage, smartDeltaSync]);

  // Load on mount and date change
  useEffect(() => {
    mountedRef.current = true;
    loadData();

    // IMPORTANT: In React 18 StrictMode (dev), effects mount/unmount twice.
    // Reset in-flight flags on cleanup so the second mount can fetch data.
    return () => {
      mountedRef.current = false;
      isFetchingRef.current = false;
      smartSyncLockRef.current = false;
    };
  }, [loadData]);

  // LOCAL-FIRST EVENT HANDLING: Update state directly without network
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      const { visitId, status, retailerId, order, orderValue, noOrderReason } = event.detail || {};
      if (!visitId && !retailerId) return;
      
      // STALE CLOSURE FIX: Use refs for current values
      const currentUserId = userIdRef.current;
      const currentDate = selectedDateRef.current;
      
      console.log('[LocalEvent] Status change:', { visitId, status, retailerId, noOrderReason, orderValue, hasOrder: !!order, currentDate });
      
      // Update visits state directly - NO NETWORK CALL
      setVisits(prev => {
        const existingVisit = prev.find(v => 
          (visitId && v.id === visitId) || (retailerId && v.retailer_id === retailerId)
        );
        
        let updated;
        if (existingVisit) {
          updated = prev.map(v => {
            if ((visitId && v.id === visitId) || (retailerId && v.retailer_id === retailerId)) {
              return { 
                ...v, 
                status: status || v.status,
                no_order_reason: noOrderReason || v.no_order_reason,
                updated_at: new Date().toISOString()
              };
            }
            return v;
          });
          console.log('[LocalEvent] Updated existing visit:', { visitId, status, noOrderReason });
        } else if (retailerId && status) {
          const newVisit = {
            id: visitId || `temp_${retailerId}_${Date.now()}`,
            retailer_id: retailerId,
            user_id: currentUserId,
            planned_date: currentDate,
            status,
            no_order_reason: noOrderReason,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          updated = [...prev, newVisit];
          console.log('[LocalEvent] Created new visit:', newVisit);
        } else {
          updated = prev;
        }
        
        // Update cache using ref value
        const cached = cacheRef.current.get(currentDate) || {
          beatPlans: [],
          visits: [],
          retailers: [],
          orders: []
        };
        const updatedCache = { ...cached, visits: updated, timestamp: Date.now() };
        cacheRef.current.set(currentDate, updatedCache);
        
        // Persist to offline storage (background)
        updated.forEach(v => {
          if ((visitId && v.id === visitId) || (retailerId && v.retailer_id === retailerId)) {
            offlineStorage.save(STORES.VISITS, v).catch(() => {});
          }
        });
        
        // FIX #4: Save snapshot for persistence across app restarts
        if (currentUserId) {
          saveMyVisitsSnapshot(currentUserId, currentDate, {
            beatPlans: updatedCache.beatPlans,
            visits: updated,
            retailers: updatedCache.retailers,
            orders: updatedCache.orders,
            progressStats: calculateStats(updated, updatedCache.orders, updatedCache.retailers, currentDate),
            currentBeatName: updatedCache.beatPlans?.map((p: any) => p.beat_name).join(', ') || ''
          }).catch(() => {});
        }
        
        return updated;
      });

      // FIX: Handle order data - either from order object or create from orderValue
      // Ensure all required fields are present for proper state updates
      const orderToProcess = order && order.id ? {
        ...order,
        retailer_id: order.retailer_id || retailerId,
        user_id: order.user_id || currentUserId,
        total_amount: Number(order.total_amount) || 0,
        order_date: order.order_date || currentDate,
        status: order.status || 'confirmed',
        visit_id: order.visit_id || visitId,
        created_at: order.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : (orderValue && retailerId && status === 'productive' ? {
        id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        retailer_id: retailerId,
        user_id: currentUserId,
        total_amount: Number(orderValue) || 0,
        order_date: currentDate,
        status: 'confirmed',
        visit_id: visitId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : null);
      
      if (orderToProcess && orderToProcess.total_amount > 0) {
        setOrders(prev => {
          // Check for existing order by ID first
          const existingById = prev.find(o => o.id === orderToProcess.id);
          let updated;
          
          if (existingById) {
            // Update existing order
            updated = prev.map(o => o.id === orderToProcess.id ? orderToProcess : o);
            console.log('[LocalEvent] Updated existing order by ID:', orderToProcess.id);
          } else {
            // Check if there's already an order for this retailer today (avoid duplicates)
            const existingRetailerOrder = prev.find(o => 
              o.retailer_id === orderToProcess.retailer_id && 
              o.order_date === currentDate &&
              Math.abs(Number(o.total_amount) - Number(orderToProcess.total_amount)) < 0.01 // Same amount = likely duplicate
            );
            
            if (existingRetailerOrder) {
              // Update existing order value instead of adding duplicate
              updated = prev.map(o => 
                o.id === existingRetailerOrder.id 
                  ? { ...o, total_amount: orderToProcess.total_amount, updated_at: new Date().toISOString() } 
                  : o
              );
              console.log('[LocalEvent] Updated existing retailer order:', existingRetailerOrder.id);
            } else {
              // Add new order
              updated = [...prev, orderToProcess];
              console.log('[LocalEvent] Added new order:', orderToProcess.id);
            }
          }
          
          // Update cache using ref value
          const cached = cacheRef.current.get(currentDate) || {
            beatPlans: [],
            visits: [],
            retailers: [],
            orders: []
          };
          const updatedCache = { ...cached, orders: updated, timestamp: Date.now() };
          cacheRef.current.set(currentDate, updatedCache);
          
          // Persist order to offline storage immediately
          offlineStorage.save(STORES.ORDERS, orderToProcess).catch(() => {});
          
          // FIX #4: Save snapshot for persistence
          if (currentUserId) {
            saveMyVisitsSnapshot(currentUserId, currentDate, {
              beatPlans: updatedCache.beatPlans,
              visits: updatedCache.visits,
              retailers: updatedCache.retailers,
              orders: updated,
              progressStats: calculateStats(updatedCache.visits, updated, updatedCache.retailers, currentDate),
              currentBeatName: updatedCache.beatPlans?.map((p: any) => p.beat_name).join(', ') || ''
            }).catch(() => {});
          }
          
          console.log('[LocalEvent] Order state updated. Total orders:', updated.length, 'Value:', orderToProcess.total_amount);
          return updated;
        });
      }
    };

    // Retailer added - add to local state immediately
    const handleRetailerAdded = (event: CustomEvent) => {
      const { retailer } = event.detail || {};
      // Use refs to avoid stale closure issues
      const currentUserId = userIdRef.current;
      const currentDate = selectedDateRef.current;
      
      if (!retailer || !currentUserId) {
        console.log('[LocalEvent] Retailer skipped - no retailer or userId');
        return;
      }
      
      if (retailer.user_id !== currentUserId) {
        console.log('[LocalEvent] Retailer skipped - user mismatch:', retailer.user_id, '!==', currentUserId);
        return;
      }
      
      console.log('[LocalEvent] Retailer added:', retailer.name, 'for date:', currentDate);
      
      setRetailers(prev => {
        if (prev.some(r => r.id === retailer.id)) {
          console.log('[LocalEvent] Retailer already exists in state:', retailer.id);
          return prev;
        }
        const updated = [...prev, retailer];
        
        // FIXED: Create cache if it doesn't exist, then update it
        const cached = cacheRef.current.get(currentDate) || {
          beatPlans: [],
          visits: [],
          retailers: [],
          orders: []
        };
        const updatedCache = { ...cached, retailers: updated, timestamp: Date.now() };
        cacheRef.current.set(currentDate, updatedCache);
        
        // FIXED: Persist retailer to offline storage for app restarts
        offlineStorage.save(STORES.RETAILERS, retailer).catch(e => {
          console.error('[LocalEvent] Failed to save retailer to offline storage:', e);
        });
        
        // FIX #4: Save snapshot for persistence across app restarts
        saveMyVisitsSnapshot(currentUserId, currentDate, {
          beatPlans: updatedCache.beatPlans,
          visits: updatedCache.visits,
          retailers: updated,
          orders: updatedCache.orders,
          progressStats: calculateStats(updatedCache.visits, updatedCache.orders, updated, currentDate),
          currentBeatName: updatedCache.beatPlans?.map((p: any) => p.beat_name).join(', ') || ''
        }).catch(() => {});
        
        console.log('[LocalEvent] Retailer added to state, cache, and snapshot. Total retailers:', updated.length);
        return updated;
      });
    };

    // Sync complete - only trigger delta sync if needed
    const handleSyncComplete = () => {
      const currentDate = selectedDateRef.current;
      const currentUserId = userIdRef.current;
      if (currentUserId && isToday(currentDate) && navigator.onLine && shouldSyncNow(currentDate)) {
        // Delayed to avoid rapid-fire
        setTimeout(() => smartDeltaSync(currentUserId, currentDate), 1000);
      }
    };

    // FIX: Listen to visitDataChanged - force local reload for progress stats refresh
    // This is critical for offline No Order submissions to reflect in Today's Progress
    const handleVisitDataChanged = async () => {
      const currentDate = selectedDateRef.current;
      const currentUserId = userIdRef.current;
      
      if (!currentUserId) return;
      
      console.log('[LocalEvent] visitDataChanged - reloading from local cache/storage');
      
      // Reload from snapshot first (most up-to-date for offline changes)
      try {
        const snapshot = await loadMyVisitsSnapshot(currentUserId, currentDate);
        if (snapshot) {
          console.log('[LocalEvent] Reloaded from snapshot:', {
            beatPlans: snapshot.beatPlans?.length || 0,
            visits: snapshot.visits?.length || 0,
            retailers: snapshot.retailers?.length || 0,
            progressStats: snapshot.progressStats
          });
          
          // CRITICAL FIX: Filter retailers to only those matching snapshot's beat plans
          // This prevents stale retailers from removed beats
          const snapshotBeatIds = (snapshot.beatPlans || []).map((bp: any) => bp.beat_id);
          const snapshotVisitRetailerIds = new Set((snapshot.visits || []).map((v: any) => v.retailer_id));
          const filteredRetailers = (snapshot.retailers || []).filter((r: any) => 
            snapshotBeatIds.includes(r.beat_id) || snapshotVisitRetailerIds.has(r.id)
          );
          
          // Update state from snapshot - REPLACE instead of fallback to prev
          // When beat plans change, we MUST use the new data, not keep old
          setBeatPlans(snapshot.beatPlans || []);
          setVisits(snapshot.visits || []);
          setRetailers(filteredRetailers);
          setOrders(snapshot.orders || []);
          
          // Update cache
          cacheRef.current.set(currentDate, {
            beatPlans: snapshot.beatPlans || [],
            visits: snapshot.visits || [],
            retailers: filteredRetailers,
            orders: snapshot.orders || [],
            timestamp: Date.now()
          });
          return;
        } else {
          console.log('[LocalEvent] No snapshot found - will trigger network sync');
        }
      } catch (e) {
        console.error('[LocalEvent] Snapshot load failed:', e);
      }
      
      // Fallback: reload from offline storage (properly filtered by beat)
      const offlineData = await loadFromOfflineStorage(currentUserId, currentDate);
      if (offlineData) {
        console.log('[LocalEvent] Reloaded from offline storage:', {
          beatPlans: offlineData.beatPlans.length,
          visits: offlineData.visits.length,
          retailers: offlineData.retailers.length
        });
        // CRITICAL: Use ALL offline data, not just visits/orders
        // This ensures beat plan changes are reflected
        setBeatPlans(offlineData.beatPlans);
        setVisits(offlineData.visits);
        setRetailers(offlineData.retailers);
        setOrders(offlineData.orders);
        
        cacheRef.current.set(currentDate, {
          beatPlans: offlineData.beatPlans,
          visits: offlineData.visits,
          retailers: offlineData.retailers,
          orders: offlineData.orders,
          timestamp: Date.now()
        });
      } else {
        console.log('[LocalEvent] No offline data - clearing state and triggering network sync');
        // No local data exists - clear state to show empty and trigger sync
        setBeatPlans([]);
        setVisits([]);
        setRetailers([]);
        setOrders([]);
        cacheRef.current.delete(currentDate);
        
        // Trigger network sync to get fresh data
        if (navigator.onLine && !isSlowConnection()) {
          smartDeltaSync(currentUserId, currentDate);
        }
      }
    };

    // Visibility change - sync when app comes to foreground
    const handleVisibility = () => {
      const currentDate = selectedDateRef.current;
      const currentUserId = userIdRef.current;
      if (document.visibilityState === 'visible' && navigator.onLine && currentUserId && isToday(currentDate) && shouldSyncNow(currentDate)) {
        setTimeout(() => smartDeltaSync(currentUserId, currentDate), 500);
      }
    };

    // Handle beat deletion - remove retailers whose beat was deleted
    const handleBeatDeleted = (event: CustomEvent) => {
      const { beatId } = event.detail || {};
      if (!beatId) return;
      
      console.log('[LocalEvent] beatDeleted - removing retailers for beat:', beatId);
      
      // Remove retailers that belong to the deleted beat
      setRetailers(prev => {
        const filtered = prev.filter(r => r.beat_id !== beatId);
        console.log('[LocalEvent] Removed', prev.length - filtered.length, 'retailers from deleted beat');
        return filtered;
      });
      
      // Remove beat plans for deleted beat
      setBeatPlans(prev => prev.filter(bp => bp.beat_id !== beatId));
      
      // Clear cache for current date to force fresh load
      const currentDate = selectedDateRef.current;
      cacheRef.current.delete(currentDate);
    };

    // Force full refresh - clear all caches and reload from network
    const handleForceRefresh = async () => {
      const currentDate = selectedDateRef.current;
      const currentUserId = userIdRef.current;
      
      if (!currentUserId) return;
      
      console.log('[LocalEvent] forceVisitsRefresh - clearing all caches and reloading');
      
      // Clear all in-memory caches
      cacheRef.current.clear();
      lastSyncTimeRef.current.clear();
      
      // Clear offline storage for beat plans
      try {
        const cachedPlans = await offlineStorage.getAll(STORES.BEAT_PLANS);
        for (const plan of cachedPlans) {
          if ((plan as any).plan_date === currentDate && (plan as any).user_id === currentUserId) {
            await offlineStorage.delete(STORES.BEAT_PLANS, (plan as any).id);
          }
        }
      } catch (e) {
        console.error('[LocalEvent] Failed to clear beat plan cache:', e);
      }
      
      // Force fresh network load
      if (navigator.onLine) {
        setIsLoading(true);
        try {
          await doFullInitialLoad(currentUserId, currentDate);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Offline - just reload from storage
        const offlineData = await loadFromOfflineStorage(currentUserId, currentDate);
        if (offlineData) {
          setBeatPlans(offlineData.beatPlans);
          setVisits(offlineData.visits);
          setRetailers(offlineData.retailers);
          setOrders(offlineData.orders);
        }
      }
    };

    // Handle points earned - immediately refresh points data for instant UI update
    const handlePointsEarned = async (event: CustomEvent) => {
      const currentDate = selectedDateRef.current;
      const currentUserId = userIdRef.current;
      
      if (!currentUserId) return;
      
      // Only refresh if the points are for today (the date we're viewing)
      const eventDate = (event.detail?.date || new Date().toISOString().split('T')[0]);
      if (eventDate !== currentDate) {
        console.log('[LocalEvent] pointsEarned for different date, skipping:', eventDate, '!=', currentDate);
        return;
      }
      
      console.log('[LocalEvent] pointsEarned - refreshing points immediately');
      
      try {
        const freshPoints = await fetchPointsForDate(currentUserId, currentDate);
        setPointsData(freshPoints);
        
        // Update cache with new points
        const cached = cacheRef.current.get(currentDate);
        if (cached) {
          cached.points = { 
            total: freshPoints.total, 
            byRetailer: Array.from(freshPoints.byRetailer.entries()) 
          };
          cached.timestamp = Date.now();
          cacheRef.current.set(currentDate, cached);
        }
        
        console.log('[LocalEvent] Points refreshed:', freshPoints.total);
      } catch (e) {
        console.error('[LocalEvent] Failed to refresh points:', e);
      }
    };

    window.addEventListener('visitStatusChanged', handleStatusChange as EventListener);
    window.addEventListener('retailerAdded', handleRetailerAdded as EventListener);
    window.addEventListener('visitDataChanged', handleVisitDataChanged);
    window.addEventListener('syncComplete', handleSyncComplete);
    window.addEventListener('beatDeleted', handleBeatDeleted as EventListener);
    window.addEventListener('forceVisitsRefresh', handleForceRefresh);
    window.addEventListener('globalDataRefresh', handleForceRefresh);
    window.addEventListener('pointsEarned', handlePointsEarned as EventListener);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('visitStatusChanged', handleStatusChange as EventListener);
      window.removeEventListener('retailerAdded', handleRetailerAdded as EventListener);
      window.removeEventListener('visitDataChanged', handleVisitDataChanged);
      window.removeEventListener('syncComplete', handleSyncComplete);
      window.removeEventListener('beatDeleted', handleBeatDeleted as EventListener);
      window.removeEventListener('forceVisitsRefresh', handleForceRefresh);
      window.removeEventListener('globalDataRefresh', handleForceRefresh);
      window.removeEventListener('pointsEarned', handlePointsEarned as EventListener);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [selectedDate, isToday, userId, smartDeltaSync, shouldSyncNow, loadFromOfflineStorage, doFullInitialLoad]);

  return {
    beatPlans,
    visits,
    retailers,
    orders,
    pointsData,
    progressStats,
    isLoading,
    hasLoadedOnce,
    error,
    invalidateData,
  };
};
