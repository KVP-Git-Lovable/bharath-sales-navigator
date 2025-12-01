import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { format } from 'date-fns';

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
}

export const useHomeDashboard = (userId: string | undefined, selectedDate: Date = new Date()) => {
  const [data, setData] = useState<HomeDashboardData>({
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
    isLoading: true,
    error: null
  });

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;

    setData(prev => ({ ...prev, isLoading: true }));
    let hasLoadedFromCache = false;

    try {
      // STEP 1: Load from cache immediately (only for today)
      if (isToday) {
        const [cachedBeatPlans, cachedVisits, cachedAttendance, cachedRetailers] = await Promise.all([
          offlineStorage.getAll<any>(STORES.BEAT_PLANS),
          offlineStorage.getAll<any>(STORES.VISITS),
          offlineStorage.getAll<any>(STORES.ATTENDANCE),
          offlineStorage.getAll<any>(STORES.RETAILERS)
        ]);

        const todayBeatPlans = cachedBeatPlans.filter(
          (plan: any) => plan.user_id === userId && plan.plan_date === dateStr
        );
        const todayVisits = cachedVisits.filter(
          (v: any) => v.user_id === userId && v.planned_date === dateStr
        );
        const todayAttendance = cachedAttendance.find(
          (a: any) => a.user_id === userId && a.date === dateStr
        );

        if (todayBeatPlans.length > 0 || todayVisits.length > 0) {
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
        }
      }
    } catch (cacheError) {
      console.log('Cache read error:', cacheError);
    }

    // STEP 2: Background sync from network if online
    if (navigator.onLine) {
      try {
        const dateStart = new Date(dateStr);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(dateStr);
        dateEnd.setHours(23, 59, 59, 999);

        // Fetch data - using any to avoid type issues
        const beatPlanRes: any = await supabase.from('beat_plans').select('*').eq('user_id', userId).eq('plan_date', dateStr);
        const visitsRes: any = await supabase.from('visits').select('*').eq('user_id', userId).eq('planned_date', dateStr);
        const attendanceRes: any = await supabase.from('attendance').select('*').eq('user_id', userId).eq('date', dateStr).maybeSingle();
        const ordersRes: any = await supabase.from('orders').select('*').eq('user_id', userId).eq('status', 'confirmed')
          .gte('created_at', `${dateStr}T00:00:00.000Z`).lte('created_at', `${dateStr}T23:59:59.999Z`);
        const pointsRes: any = await supabase.from('gamification_points').select('points').eq('user_id', userId)
          .gte('earned_at', dateStart.toISOString()).lte('earned_at', dateEnd.toISOString());
        // Fetch all retailers (no created_by field in table)
        const retailersRes = await supabase.from('retailers').select('*');
        const newRetailersRes: any = await supabase.from('retailers').select('id')
          .gte('created_at', `${dateStr}T00:00:00.000Z`).lte('created_at', `${dateStr}T23:59:59.999Z`);
        const leaveRes: any = await supabase.from('leave_applications').select('*').eq('user_id', userId).eq('status', 'approved')
          .lte('start_date', dateStr).gte('end_date', dateStr).maybeSingle();

        const beatPlans = beatPlanRes.data || [];
        const beatPlan = beatPlans.length > 0 ? beatPlans[0] : null;
        const visits = visitsRes.data || [];
        const attendance = attendanceRes.data;
        const orders = ordersRes.data || [];
        const points = pointsRes.data || [];
        const retailers = retailersRes.data || [];
        const newRetailers = newRetailersRes.data || [];
        const leave = leaveRes.data;

        // Get beat name(s) from all beat plans for the day
        let beatName: string | null = null;
        if (beatPlans.length > 0) {
          const beatNames = beatPlans.map((bp: any) => bp.beat_name).filter(Boolean);
          beatName = beatNames.length > 0 ? beatNames.join(', ') : null;
        }

        // Calculate all planned retailer IDs from beat plans (matching My Visits logic)
        const allPlannedRetailerIds = new Set<string>();
        const beatIdsWithoutExplicitRetailers: string[] = [];
        
        for (const bp of beatPlans) {
          const beatData = bp.beat_data;
          if (beatData && Array.isArray(beatData.retailer_ids) && beatData.retailer_ids.length > 0) {
            beatData.retailer_ids.forEach((id: string) => allPlannedRetailerIds.add(id));
          } else {
            beatIdsWithoutExplicitRetailers.push(bp.beat_id);
          }
        }

        // Fetch retailers by beat_id for beat plans without explicit retailer_ids
        if (beatIdsWithoutExplicitRetailers.length > 0) {
          const { data: beatRetailers } = await supabase
            .from('retailers')
            .select('id')
            .in('beat_id', beatIdsWithoutExplicitRetailers);
          
          if (beatRetailers) {
            beatRetailers.forEach((r: any) => allPlannedRetailerIds.add(r.id));
          }
        }

        // Get retailer IDs that already have visits
        const visitedRetailerIds = new Set(visits.map((v: any) => v.retailer_id));

        // Calculate beat progress
        const completed = visits.filter((v: any) => v.status === 'completed' || v.status === 'productive' || v.status === 'unproductive').length;
        const productive = visits.filter((v: any) => v.status === 'productive').length;
        const unproductive = visits.filter((v: any) => v.status === 'unproductive').length;
        
        // Planned = visits with status 'planned' + beat plan retailers without any visit
        const visitsWithPlannedStatus = visits.filter((v: any) => v.status === 'planned').length;
        const retailersWithoutVisits = [...allPlannedRetailerIds].filter(id => !visitedRetailerIds.has(id)).length;
        const planned = visitsWithPlannedStatus + retailersWithoutVisits;
        
        const totalVisits = completed + planned;

        // Calculate revenue target and achieved
        const revenueTarget = 10000; // Default target, can be made dynamic
        const revenueAchieved = orders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);

        // Calculate potential revenue from remaining visits
        const visitedIds = new Set(orders.map((o: any) => o.visit_id).filter(Boolean));
        const remainingVisits = visits.filter((v: any) => !visitedIds.has(v.id));
        
        // Get average order value from retailers
        const avgOrderValue = retailers.length > 0
          ? retailers.reduce((sum: any, r: any) => sum + (r.order_value || 0), 0) / retailers.length
          : 0;
        
        const potentialRevenue = Math.round(remainingVisits.length * avgOrderValue);

        // Calculate performance
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
              name: r.shop_name,
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
                name: r.shop_name,
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

        // Cache the data (only for today)
        if (isToday) {
          await Promise.all([
            ...beatPlans.map((bp: any) => offlineStorage.save(STORES.BEAT_PLANS, bp)),
            ...visits.map((v: any) => offlineStorage.save(STORES.VISITS, v)),
            enhancedAttendance ? offlineStorage.save(STORES.ATTENDANCE, enhancedAttendance) : Promise.resolve()
          ]);
        }

        // Update state with fresh data
        setData({
          todayData: {
            beatPlan,
            beatName,
            visits,
            nextVisit: visits.find((v: any) => !v.check_in_time) || null,
            attendance: enhancedAttendance,
            beatProgress: {
              total: totalVisits,
              completed,
              remaining: planned,
              planned,
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
        });
      } catch (networkError) {
        console.error('Network error:', networkError);
        if (!hasLoadedFromCache) {
          setData(prev => ({ ...prev, isLoading: false, error: networkError }));
        }
      }
    } else {
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId, dateStr, isToday]);

  const updateDashboardState = async ({ todayBeatPlans, todayVisits, todayAttendance, cachedRetailers, completed }: any) => {
    const nextVisit = todayVisits.find((v: any) => !v.check_in_time) || null;
    
    // Get beat name(s) from all beat plans
    let beatName: string | null = null;
    const beatPlansArray = Array.isArray(todayBeatPlans) ? todayBeatPlans : (todayBeatPlans ? [todayBeatPlans] : []);
    if (beatPlansArray.length > 0) {
      const beatNames = beatPlansArray.map((bp: any) => bp.beat_name).filter(Boolean);
      beatName = beatNames.length > 0 ? beatNames.join(', ') : null;
    }
    
    // Calculate all planned retailer IDs from beat plans (matching My Visits logic)
    const allPlannedRetailerIds = new Set<string>();
    
    for (const bp of beatPlansArray) {
      const beatData = bp.beat_data;
      if (beatData && Array.isArray(beatData.retailer_ids) && beatData.retailer_ids.length > 0) {
        beatData.retailer_ids.forEach((id: string) => allPlannedRetailerIds.add(id));
      } else if (bp.beat_id && cachedRetailers) {
        // Get retailers by beat_id from cached retailers
        const beatRetailers = cachedRetailers.filter((r: any) => r.beat_id === bp.beat_id);
        beatRetailers.forEach((r: any) => allPlannedRetailerIds.add(r.id));
      }
    }

    // Get retailer IDs that already have visits
    const visitedRetailerIds = new Set(todayVisits.map((v: any) => v.retailer_id));
    
    const productive = todayVisits.filter((v: any) => v.status === 'productive').length;
    const unproductive = todayVisits.filter((v: any) => v.status === 'unproductive').length;
    
    // Planned = visits with status 'planned' + beat plan retailers without any visit
    const visitsWithPlannedStatus = todayVisits.filter((v: any) => v.status === 'planned').length;
    const retailersWithoutVisits = [...allPlannedRetailerIds].filter(id => !visitedRetailerIds.has(id)).length;
    const planned = visitsWithPlannedStatus + retailersWithoutVisits;
    
    const totalVisits = completed + planned;
    
    setData(prev => ({
      ...prev,
      todayData: {
        ...prev.todayData,
        beatPlan: beatPlansArray[0] || null,
        beatName,
        visits: todayVisits,
        nextVisit,
        attendance: todayAttendance,
        beatProgress: {
          total: totalVisits,
          completed,
          remaining: planned,
          planned,
          productive,
          unproductive,
        }
      },
      isLoading: false
    }));
  };

  useEffect(() => {
    loadDashboardData();
    
    // Refresh every 60 seconds (only for today)
    if (isToday) {
      const interval = setInterval(loadDashboardData, 60000);
      return () => clearInterval(interval);
    }
  }, [loadDashboardData, isToday]);

  return { ...data, refresh: loadDashboardData };
};
