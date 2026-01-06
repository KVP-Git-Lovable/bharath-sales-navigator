import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { loadMyVisitsSnapshot } from '@/lib/myVisitsSnapshot';
import { format } from 'date-fns';
import { getLocalTodayDate, toLocalISODate } from '@/utils/dateUtils';
import { useManagedInterval, useVisibility } from '@/utils/intervalManager';
import { isSlowConnection } from '@/utils/internetSpeedCheck';

interface HomeDashboardData {
  todayData: {
    beatPlan: any | null;
    beatName: string | null;
    visits: any[];
    nextVisit: any | null;
    attendance: any | null;
    beatProgress: {
      total: number;
      completed: number;
      remaining: number;
      planned: number;
      productive: number;
      unproductive: number;
    };
    revenueTarget: number;
    revenueAchieved: number;
    newRetailers: number;
    potentialRevenue: number;
    points: number;
  };
  performance: {
    visitsCount: number;
    salesAmount: number;
    pointsEarned: number;
    leaderboardPosition: number | null;
    dailyProgress: number;
  };
  urgentItems: {
    pendingPayments: Array<{
      id: string;
      name: string;
      amount: number;
      phone: string;
    }>;
    priorityRetailers: Array<{
      id: string;
      name: string;
      daysSinceVisit: number;
      priority: string;
    }>;
    lowStock: any[];
  };
  isLoading: boolean;
  error: any;
  lastUpdated?: string;
}

const getDefaultState = (): HomeDashboardData => ({
  todayData: {
    beatPlan: null,
    beatName: null,
    visits: [],
    nextVisit: null,
    attendance: null,
    beatProgress: { total: 0, completed: 0, remaining: 0, planned: 0, productive: 0, unproductive: 0 },
    revenueTarget: 10000,
    revenueAchieved: 0,
    newRetailers: 0,
    potentialRevenue: 0,
    points: 0,
  },
  performance: {
    visitsCount: 0,
    salesAmount: 0,
    pointsEarned: 0,
    leaderboardPosition: null,
    dailyProgress: 0
  },
  urgentItems: {
    pendingPayments: [],
    priorityRetailers: [],
    lowStock: []
  },
  isLoading: false,
  error: null
});

export const useHomeDashboard = (userId: string | undefined, selectedDate: Date = new Date()) => {
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
const isRefreshingRef = useRef(false);
  const lastSyncRefreshRef = useRef<number>(0);
  
  // ATTENDANCE LOCK: Once attendance is marked for the day, never re-fetch it
  const attendanceLockedRef = useRef(false);
  const lockedAttendanceRef = useRef<any>(null);
  
  // Cache key for localStorage persistence
  const CACHE_KEY = `home_dashboard_cache_${userId}`;
  
  // Load initial state from localStorage cache for instant display
  const getInitialState = (): HomeDashboardData => {
    const defaultState = getDefaultState();
    
    if (!userId) return { ...defaultState, isLoading: false };
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        console.log('[useHomeDashboard] Loaded from localStorage cache, lastUpdated:', parsedCache.lastUpdated);
        // Lock attendance if already marked
        if (parsedCache.todayData?.attendance?.check_in_time) {
          attendanceLockedRef.current = true;
          lockedAttendanceRef.current = parsedCache.todayData.attendance;
          console.log('[useHomeDashboard] 🔒 Attendance locked from initial cache');
        }
        
        // CRITICAL: Always show cached data immediately, never block with loading
        return { 
          ...parsedCache, 
          isLoading: false, // Don't show loading when we have cache - show data immediately
          error: null 
        };
      }
    } catch (e) {
      console.error('[useHomeDashboard] Error loading cache:', e);
    }
    
    // If no cache, show loading briefly (will try to load)
    // But use a short timeout to prevent stuck loading state
    return { ...defaultState, isLoading: true };
  };

  const [data, setData] = useState<HomeDashboardData>(getInitialState);

  const dateStr = toLocalISODate(selectedDate);
  const isToday = dateStr === getLocalTodayDate();

  // Save data to localStorage cache
  const saveToCache = useCallback((newData: HomeDashboardData) => {
    if (!userId) return;
    try {
      const cacheData = {
        ...newData,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('[useHomeDashboard] Saved to localStorage cache');
    } catch (e) {
      console.error('[useHomeDashboard] Error saving cache:', e);
    }
  }, [userId, CACHE_KEY]);

  const loadDashboardData = useCallback(async () => {
    if (!userId) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }
    
    // Prevent concurrent refreshes using ref (not state to avoid re-renders)
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    let hasLoadedFromCache = false;

    try {
      // STEP 1: Load from offline storage cache immediately (only for today)
      if (isToday) {
        // ATTENDANCE LOCK CHECK: Skip cache lookup if attendance already locked
        let todayAttendance = null;
        if (attendanceLockedRef.current && lockedAttendanceRef.current) {
          console.log('[useHomeDashboard] 🔒 Using locked attendance - skipping cache lookup');
          todayAttendance = lockedAttendanceRef.current;
        }
        
        const [cachedBeatPlans, cachedVisits, cachedAttendance, cachedRetailers] = await Promise.all([
          offlineStorage.getAll<any>(STORES.BEAT_PLANS),
          offlineStorage.getAll<any>(STORES.VISITS),
          attendanceLockedRef.current ? Promise.resolve([]) : offlineStorage.getAll<any>(STORES.ATTENDANCE),
          offlineStorage.getAll<any>(STORES.RETAILERS)
        ]);

        const todayBeatPlans = cachedBeatPlans.filter(
          (plan: any) => plan.user_id === userId && plan.plan_date === dateStr
        );
        const todayVisits = cachedVisits.filter(
          (v: any) => v.user_id === userId && v.planned_date === dateStr
        );
        
        // Only look up attendance from cache if not locked
        if (!attendanceLockedRef.current) {
          todayAttendance = cachedAttendance.find(
            (a: any) => a.user_id === userId && a.date === dateStr
          );
          
          // Lock if we found valid attendance
          if (todayAttendance?.check_in_time) {
            attendanceLockedRef.current = true;
            lockedAttendanceRef.current = todayAttendance;
            console.log('[useHomeDashboard] 🔒 Attendance locked after cache load');
          }
        }

        // Always show cached data, even if empty - better than stuck loading
        const completed = todayVisits.filter((v: any) => v.status === 'completed' || v.status === 'productive').length;
        
        updateDashboardState({
          todayBeatPlans,
          todayVisits,
          todayAttendance,
          cachedRetailers,
          completed
        });
        
        hasLoadedFromCache = true;
        setData(prev => ({ ...prev, isLoading: false }));
        setHasInitiallyLoaded(true);
      } else {
        // Not today - immediately stop loading, show empty state
        setData(prev => ({ ...prev, isLoading: false }));
        hasLoadedFromCache = true;
      }
    } catch (cacheError) {
      console.log('Cache read error:', cacheError);
      // On cache error, still stop loading
      setData(prev => ({ ...prev, isLoading: false }));
    }

    // STEP 2: Background sync from network if online
    if (navigator.onLine) {
      try {
        const dateStart = new Date(dateStr);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(dateStr);
        dateEnd.setHours(23, 59, 59, 999);

        // Fetch data
        const beatPlanRes: any = await supabase.from('beat_plans').select('*').eq('user_id', userId).eq('plan_date', dateStr);
        const visitsRes: any = await supabase.from('visits').select('*').eq('user_id', userId).eq('planned_date', dateStr);
        
        // ATTENDANCE LOCK: Skip Supabase query if attendance already locked
        let attendanceRes: any = { data: null };
        if (attendanceLockedRef.current && lockedAttendanceRef.current) {
          console.log('[useHomeDashboard] 🔒 Using locked attendance - skipping Supabase query');
          attendanceRes = { data: lockedAttendanceRef.current };
        } else {
          attendanceRes = await supabase.from('attendance').select('*').eq('user_id', userId).eq('date', dateStr).maybeSingle();
        }
        const ordersRes: any = await supabase.from('orders').select('*').eq('user_id', userId).eq('status', 'confirmed')
          .gte('created_at', `${dateStr}T00:00:00.000Z`).lte('created_at', `${dateStr}T23:59:59.999Z`);
        const pointsRes: any = await supabase.from('gamification_points').select('points').eq('user_id', userId)
          .gte('earned_at', dateStart.toISOString()).lte('earned_at', dateEnd.toISOString());
        const retailersRes = await supabase.from('retailers').select('*').eq('user_id', userId);
        const newRetailersRes: any = await supabase.from('retailers').select('id').eq('user_id', userId)
          .gte('created_at', `${dateStr}T00:00:00.000Z`).lte('created_at', `${dateStr}T23:59:59.999Z`);
        const leaveRes: any = await supabase.from('leave_applications').select('*').eq('user_id', userId).eq('status', 'approved')
          .lte('start_date', dateStr).gte('end_date', dateStr).maybeSingle();

        const beatPlans = beatPlanRes.data || [];
        const beatPlan = beatPlans.length > 0 ? beatPlans[0] : null;
        const visits = visitsRes.data || [];
        let attendance = attendanceRes.data;
        let orders = ordersRes.data || [];
        const points = pointsRes.data || [];
        const retailers = retailersRes.data || [];
        const newRetailers = newRetailersRes.data || [];
        const leave = leaveRes.data;
        
        // Lock attendance if we got valid data from network (and not already locked)
        if (!attendanceLockedRef.current && attendance?.check_in_time) {
          attendanceLockedRef.current = true;
          lockedAttendanceRef.current = attendance;
          console.log('[useHomeDashboard] 🔒 Attendance locked after network fetch');
        }
        
        // CRITICAL: Merge orders from offline sources (snapshot + offline storage) with DB orders
        // This ensures revenue reflects all orders including those placed offline
        if (isToday) {
          try {
            // Load orders from my visits snapshot
            const snapshot = await loadMyVisitsSnapshot(userId, dateStr);
            if (snapshot?.orders && snapshot.orders.length > 0) {
              const dbOrderIds = new Set(orders.map((o: any) => o.id));
              snapshot.orders.forEach((snapshotOrder: any) => {
                if (!dbOrderIds.has(snapshotOrder.id)) {
                  orders.push(snapshotOrder);
                  console.log('[HOME] Merged snapshot order:', snapshotOrder.id);
                }
              });
            }
            
            // Load orders from offline storage
            const offlineOrders = await offlineStorage.getAll<any>(STORES.ORDERS);
            const todayOfflineOrders = offlineOrders.filter((o: any) => 
              o.user_id === userId && 
              (o.order_date === dateStr || (o.created_at && o.created_at.startsWith(dateStr)))
            );
            
            if (todayOfflineOrders.length > 0) {
              const existingOrderIds = new Set(orders.map((o: any) => o.id));
              todayOfflineOrders.forEach((offlineOrder: any) => {
                if (!existingOrderIds.has(offlineOrder.id)) {
                  orders.push(offlineOrder);
                  console.log('[HOME] Merged offline order:', offlineOrder.id);
                }
              });
            }
          } catch (mergeError) {
            console.warn('[HOME] Error merging offline orders:', mergeError);
          }
        }

        // Get beat name(s) from all beat plans for the day
        let beatName: string | null = null;
        if (beatPlans.length > 0) {
          const beatNames = beatPlans.map((bp: any) => bp.beat_name).filter(Boolean);
          beatName = beatNames.length > 0 ? beatNames.join(', ') : null;
        }

        // Calculate beat progress using unified logic (same as My Visits)
        // CRITICAL: Deduplicate visits by retailer and treat no-order as unproductive even if duplicates exist.
        const visitsAny = (visits || []) as any[];

        // Build order maps to detect productive visits via orders
        const ordersMap = new Map<string, boolean>();
        orders.forEach((o: any) => {
          if (o.retailer_id) {
            ordersMap.set(o.retailer_id, true);
          }
        });

        // Extract planned retailer IDs from beat plans
        let plannedRetailerIds: string[] = [];
        let hasBeatDataWithRetailerIdsDefined = false;
        for (const bp of beatPlans) {
          const beatData = (bp as any).beat_data as any;
          if (beatData && Array.isArray(beatData.retailer_ids) && beatData.retailer_ids.length > 0) {
            hasBeatDataWithRetailerIdsDefined = true;
            plannedRetailerIds.push(...beatData.retailer_ids);
          }
        }

        if (!hasBeatDataWithRetailerIdsDefined && beatPlans.length > 0) {
          const plannedBeatIds = beatPlans.map((bp: any) => bp.beat_id);
          const retailersForBeats = retailers.filter((r: any) => plannedBeatIds.includes(r.beat_id));
          plannedRetailerIds = retailersForBeats.map((r: any) => r.id);
        }

        const totalPlannedRetailers = plannedRetailerIds.length;

        let notYetVisited = 0;
        let productive = 0;
        let unproductive = 0;

        const visitsByRetailer = new Map<string, any[]>();
        visitsAny.forEach((v: any) => {
          if (!v?.retailer_id) return;
          const list = visitsByRetailer.get(v.retailer_id) || [];
          list.push(v);
          visitsByRetailer.set(v.retailer_id, list);
        });

        const visitRetailerIdsSet = new Set(visitsByRetailer.keys());

        visitsByRetailer.forEach((group, retailerId) => {
          const hasOrder = ordersMap.has(retailerId);
          if (hasOrder || group.some(v => v.status === 'productive')) {
            productive++;
          } else if (group.some(v => v.status === 'unproductive' || !!v.no_order_reason)) {
            unproductive++;
          } else {
            notYetVisited++;
          }
        });

        plannedRetailerIds.forEach((retailerId: string) => {
          if (!visitRetailerIdsSet.has(retailerId) && !ordersMap.has(retailerId)) {
            notYetVisited++;
          }
        });

        const totalVisits = visitsAny.length;
        const remaining = notYetVisited;
        const completed = productive + unproductive;
        const revenueTarget = 10000;
        const revenueAchieved = orders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);

        const visitedIds = new Set(orders.map((o: any) => o.visit_id).filter(Boolean));
        const remainingVisits = visits.filter((v: any) => !visitedIds.has(v.id));
        
        const avgOrderValue = retailers.length > 0
          ? retailers.reduce((sum: any, r: any) => sum + (r.order_value || 0), 0) / retailers.length
          : 0;
        
        const potentialRevenue = Math.round(remainingVisits.length * avgOrderValue);

        const salesAmount = revenueAchieved;
        const pointsEarned = points.reduce((sum: number, p: any) => sum + p.points, 0);
        const dailyProgress = totalVisits > 0 ? Math.round((completed / totalVisits) * 100) : 0;

        // Fetch urgent items (only for today)
        let pendingPayments: any[] = [];
        let priorityRetailers: any[] = [];
        
        if (isToday) {
          pendingPayments = retailers
            .filter((r: any) => (r.pending_amount || 0) > 0)
            .sort((a: any, b: any) => (b.pending_amount || 0) - (a.pending_amount || 0))
            .slice(0, 5)
            .map((r: any) => ({
              id: r.id,
              name: r.name || r.shop_name,
              amount: r.pending_amount || 0,
              phone: r.phone || ''
            }));

          priorityRetailers = retailers
            .filter((r: any) => {
              if (r.priority !== 'high') return false;
              if (!r.last_visit_date) return true;
              const daysSinceVisit = Math.floor(
                (new Date().getTime() - new Date(r.last_visit_date).getTime()) / (1000 * 60 * 60 * 24)
              );
              return daysSinceVisit >= 14;
            })
            .slice(0, 5)
            .map((r: any) => {
              const lastVisit = r.last_visit_date ? new Date(r.last_visit_date) : null;
              const daysSinceVisit = lastVisit 
                ? Math.floor((new Date().getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
                : 999;
              return {
                id: r.id,
                name: r.name || r.shop_name,
                daysSinceVisit,
                priority: r.priority || 'high'
              };
            });
        }

        // Enhance attendance with leave info
        const enhancedAttendance = attendance ? {
          ...attendance,
          on_leave: !!leave,
          leave_type_id: leave?.leave_type_id,
        } : null;

        // Cache the data to offline storage (only for today)
        if (isToday) {
          await Promise.all([
            ...beatPlans.map((bp: any) => offlineStorage.save(STORES.BEAT_PLANS, bp)),
            ...visits.map((v: any) => offlineStorage.save(STORES.VISITS, v)),
            enhancedAttendance ? offlineStorage.save(STORES.ATTENDANCE, enhancedAttendance) : Promise.resolve()
          ]);
        }

        // Update state with fresh data
        const newData: HomeDashboardData = {
          todayData: {
            beatPlan,
            beatName,
            visits,
            nextVisit: visits.find((v: any) => !v.check_in_time) || null,
            attendance: enhancedAttendance,
            beatProgress: {
              total: totalPlannedRetailers,
              completed,
              remaining: notYetVisited,
              planned: totalPlannedRetailers,
              productive,
              unproductive,
            },
            revenueTarget,
            revenueAchieved,
            newRetailers: newRetailers.length,
            potentialRevenue,
            points: pointsEarned,
          },
          performance: {
            visitsCount: visits.length,
            salesAmount,
            pointsEarned: pointsEarned,
            leaderboardPosition: null,
            dailyProgress
          },
          urgentItems: {
            pendingPayments,
            priorityRetailers,
            lowStock: []
          },
          isLoading: false,
          error: null
        };

        setData(newData);
        saveToCache(newData); // Save to localStorage for offline access
        setHasInitiallyLoaded(true);
        isRefreshingRef.current = false;
      } catch (networkError) {
        console.error('Network error:', networkError);
        if (!hasLoadedFromCache) {
          setData(prev => ({ ...prev, isLoading: false, error: networkError }));
        }
        setHasInitiallyLoaded(true);
        isRefreshingRef.current = false;
      }
    } else {
      // Offline - stop loading, show cached data (already loaded from getInitialState)
      setData(prev => ({ ...prev, isLoading: false }));
      setHasInitiallyLoaded(true);
      isRefreshingRef.current = false;
    }
  }, [userId, dateStr, isToday, saveToCache]);

  const updateDashboardState = ({ todayBeatPlans, todayVisits, todayAttendance, cachedRetailers, completed }: any) => {
    const nextVisit = todayVisits.find((v: any) => !v.check_in_time) || null;
    
    // Get beat name(s) from all beat plans
    let beatName: string | null = null;
    const beatPlansArray = Array.isArray(todayBeatPlans) ? todayBeatPlans : (todayBeatPlans ? [todayBeatPlans] : []);
    if (beatPlansArray.length > 0) {
      const beatNames = beatPlansArray.map((bp: any) => bp.beat_name).filter(Boolean);
      beatName = beatNames.length > 0 ? beatNames.join(', ') : null;
    }
    
    // Unified beat progress logic for cache path (dedupe by retailer)
    let notYetVisited = 0;
    let productive = 0;
    let unproductive = 0;

    const plannedRetailerIds: string[] = [];
    for (const bp of beatPlansArray) {
      const beatData = (bp as any).beat_data as any;
      if (beatData && Array.isArray(beatData.retailer_ids)) {
        plannedRetailerIds.push(...beatData.retailer_ids);
      }
    }

    const totalPlannedRetailers = plannedRetailerIds.length;

    const visitsByRetailer = new Map<string, any[]>();
    (todayVisits || []).forEach((v: any) => {
      if (!v?.retailer_id) return;
      const list = visitsByRetailer.get(v.retailer_id) || [];
      list.push(v);
      visitsByRetailer.set(v.retailer_id, list);
    });

    const visitRetailerIdsSet = new Set(visitsByRetailer.keys());

    visitsByRetailer.forEach((group) => {
      if (group.some(v => v.status === 'productive')) {
        productive++;
      } else if (group.some(v => v.status === 'unproductive' || !!v.no_order_reason)) {
        unproductive++;
      } else {
        notYetVisited++;
      }
    });

    plannedRetailerIds.forEach((retailerId: string) => {
      if (!visitRetailerIdsSet.has(retailerId)) {
        notYetVisited++;
      }
    });

    setData(prev => {
      // CRITICAL: Use locked attendance if available, otherwise preserve existing
      const finalAttendance = attendanceLockedRef.current 
        ? lockedAttendanceRef.current 
        : (todayAttendance || prev.todayData.attendance);
      
      return {
        ...prev,
        todayData: {
          ...prev.todayData,
          beatPlan: beatPlansArray[0] || null,
          beatName,
          visits: todayVisits,
          nextVisit,
          attendance: finalAttendance,
          beatProgress: {
            total: totalPlannedRetailers,
            completed: productive + unproductive,
            remaining: notYetVisited,
            planned: totalPlannedRetailers,
            productive,
            unproductive,
          }
        },
        isLoading: false
      };
    });
  };

  // Reset attendance lock when date changes (midnight rollover)
  useEffect(() => {
    attendanceLockedRef.current = false;
    lockedAttendanceRef.current = null;
    console.log('[useHomeDashboard] 🔓 Attendance lock reset - date changed to:', dateStr);
  }, [dateStr]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // REMOVED: Auto-refresh interval
  // Per event-based sync architecture: Dashboard should only update via specific events
  // (visitStatusChanged, attendanceMarked), not polling.
  // Background sync updates cache, UI updates on next meaningful action.
    
  // Listen for explicit visit data changes
  useEffect(() => {
    // CHANGED: visitDataChanged should NOT trigger full refresh
    // Per offline-first architecture: Background sync updates cache,
    // UI updates on next app resume or manual refresh
    const handleVisitDataChanged = () => {
      console.log('📢 [HOME] visitDataChanged event received - local state already updated, no full refresh');
      // NO loadDashboardData() - data was already updated locally by the action that triggered this event
    };
    
    // CHANGED: syncComplete should NOT trigger full refresh
    // Per offline-first architecture: Sync only backs up to server,
    // UI already reflects local state
    const handleSyncComplete = () => {
      console.log('🔄 [HOME] Sync complete - cache synced to server, no UI refresh needed');
      // NO loadDashboardData() - UI already shows correct local state
    };
    
    // Listen for visit status changes (immediate order updates) - includes orderValue for instant revenue update
    const handleVisitStatusChanged = (event: CustomEvent) => {
      const detail = event.detail;
      console.log('📢 [HOME] visitStatusChanged event received:', detail);
      
      // If we have order value, update cache immediately for instant UI feedback
      if (detail?.orderValue && userId) {
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsedCache = JSON.parse(cached);
            const currentRevenue = parsedCache.todayData?.revenueAchieved || 0;
            const newRevenue = currentRevenue + Math.round(Number(detail.orderValue) || 0);
            
            // Update productive count
            const currentProductive = parsedCache.todayData?.beatProgress?.productive || 0;
            
            const updatedCache = {
              ...parsedCache,
              todayData: {
                ...parsedCache.todayData,
                revenueAchieved: newRevenue,
                beatProgress: {
                  ...parsedCache.todayData?.beatProgress,
                  productive: currentProductive + 1,
                  completed: (parsedCache.todayData?.beatProgress?.completed || 0) + 1,
                  remaining: Math.max(0, (parsedCache.todayData?.beatProgress?.remaining || 0) - 1)
                }
              },
              lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedCache));
            
            // Update state immediately for instant UI feedback
            setData(prev => ({
              ...prev,
              todayData: {
                ...prev.todayData,
                revenueAchieved: newRevenue,
                beatProgress: {
                  ...prev.todayData.beatProgress,
                  productive: currentProductive + 1,
                  completed: prev.todayData.beatProgress.completed + 1,
                  remaining: Math.max(0, prev.todayData.beatProgress.remaining - 1)
                }
              }
            }));
            
            console.log('💰 [HOME] Immediate revenue update:', { currentRevenue, orderValue: detail.orderValue, newRevenue });
          }
        } catch (e) {
          console.warn('[HOME] Error updating cache from visitStatusChanged:', e);
        }
      }
      
      // REMOVED: Background refresh after visitStatusChanged
      // Per offline-first architecture: State was already updated above,
      // no need for network refresh which can cause UI flickering
    };
    
    // Handle immediate attendance lock when marked
    const handleAttendanceMarked = (event: CustomEvent) => {
      const attendanceRecord = event.detail;
      if (attendanceRecord?.check_in_time) {
        attendanceLockedRef.current = true;
        lockedAttendanceRef.current = attendanceRecord;
        
        // Update state immediately with the new attendance
        setData(prev => ({
          ...prev,
          todayData: {
            ...prev.todayData,
            attendance: attendanceRecord
          }
        }));
        
        console.log('[useHomeDashboard] 🔒 Attendance immediately locked after marking');
      }
    };
    
    window.addEventListener('visitDataChanged', handleVisitDataChanged);
    window.addEventListener('syncComplete', handleSyncComplete);
    window.addEventListener('visitStatusChanged', handleVisitStatusChanged as EventListener);
    window.addEventListener('attendanceMarked', handleAttendanceMarked as EventListener);
    
    return () => {
      window.removeEventListener('visitDataChanged', handleVisitDataChanged);
      window.removeEventListener('syncComplete', handleSyncComplete);
      window.removeEventListener('visitStatusChanged', handleVisitStatusChanged as EventListener);
      window.removeEventListener('attendanceMarked', handleAttendanceMarked as EventListener);
    };
  }, [loadDashboardData, userId, CACHE_KEY]);

  return { ...data, refresh: loadDashboardData };
};
