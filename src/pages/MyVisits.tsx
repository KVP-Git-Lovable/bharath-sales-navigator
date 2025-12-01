import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, FileText, Plus, TrendingUp, Route, CheckCircle, CalendarDays, MapPin, Users, Clock, Truck, ArrowUpDown } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, addWeeks, subWeeks, differenceInDays } from "date-fns";
import { SearchInput } from "@/components/SearchInput";
import { VisitCard } from "@/components/VisitCard";
import { CreateNewVisitModal } from "@/components/CreateNewVisitModal";
import { VisitFilters, FilterOptions } from "@/components/VisitFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { TimelineView } from "@/components/TimelineView";
import { toast } from "sonner";
import { useRecommendations } from "@/hooks/useRecommendations";
import { AIRecommendationBanner } from "@/components/AIRecommendationBanner";
import { VanStockManagement } from "@/components/VanStockManagement";
import { useLocationFeature } from "@/hooks/useLocationFeature";
import { offlineStorage, STORES } from "@/lib/offlineStorage";
import { shouldSuppressError } from "@/utils/offlineErrorHandler";
import { useVisitsDataOptimized } from "@/hooks/useVisitsDataOptimized";
import { schedulePrefetch } from "@/utils/backgroundProductPrefetch";
import { hasAttendanceTodayOfflineSupport } from "@/utils/attendanceUtils";
interface Visit {
  id: string;
  retailerName: string;
  address: string;
  phone: string;
  retailerCategory: string;
  status: "planned" | "in-progress" | "productive" | "unproductive" | "store-closed" | "cancelled";
  visitType: string;
  time?: string;
  day?: string;
  checkInStatus?: "not-checked-in" | "checked-in-correct" | "checked-in-wrong-location";
  hasOrder?: boolean;
  orderValue?: number;
  noOrderReason?: "over-stocked" | "owner-not-available" | "store-closed" | "permanently-closed";
  distributor?: string;
}
const mockVisits: Visit[] = [{
  id: "1",
  retailerName: "Vardhman Kirana",
  address: "Indiranagar, Bangalore",
  phone: "9926612072",
  retailerCategory: "Category A",
  status: "in-progress",
  visitType: "First Visit",
  time: "10:00 AM",
  day: "Today",
  checkInStatus: "checked-in-correct",
  hasOrder: true,
  orderValue: 15000,
  distributor: "ABC Distributors"
}, {
  id: "2",
  retailerName: "Sham Kirana and General Stores",
  address: "34 A, Kharghar, Navi Mumbai, Maharashtra 410210, Karnataka",
  phone: "9926963147",
  retailerCategory: "Category B",
  status: "planned",
  visitType: "Negotiation",
  time: "2:00 PM",
  day: "Today",
  checkInStatus: "not-checked-in",
  hasOrder: false,
  distributor: "XYZ Distributors"
}, {
  id: "3",
  retailerName: "Mahesh Kirana and General Stores",
  address: "MG Road, Bangalore",
  phone: "9955551112",
  retailerCategory: "Category A",
  status: "productive",
  visitType: "First Visit",
  time: "9:00 AM",
  day: "Today",
  checkInStatus: "checked-in-correct",
  hasOrder: true,
  orderValue: 22000,
  distributor: "ABC Distributors"
}, {
  id: "4",
  retailerName: "Balaji Kiranad",
  address: "Commercial Street, Bangalore",
  phone: "9516584711",
  retailerCategory: "Category C",
  status: "unproductive",
  visitType: "Follow-up",
  time: "11:00 AM",
  day: "Today",
  checkInStatus: "checked-in-wrong-location",
  hasOrder: false,
  noOrderReason: "over-stocked",
  distributor: "PQR Distributors"
}, {
  id: "5",
  retailerName: "New Mart",
  address: "Brigade Road, Bangalore",
  phone: "9876543210",
  retailerCategory: "Category B",
  status: "store-closed",
  visitType: "Follow-up",
  time: "3:00 PM",
  day: "Today",
  checkInStatus: "checked-in-correct",
  hasOrder: false,
  noOrderReason: "store-closed",
  distributor: "ABC Distributors"
}];
const getWeekDays = (selectedWeekStart: Date) => {
  const startOfSelectedWeek = startOfWeek(selectedWeekStart, {
    weekStartsOn: 0
  }); // Start from Sunday
  const today = new Date();
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(startOfSelectedWeek, i);
    const isToday = isSameDay(day, today);
    weekDays.push({
      day: format(day, 'EEE'),
      date: day.getDate().toString(),
      isToday: isToday,
      isoDate: format(day, 'yyyy-MM-dd'),
      fullDate: day
    });
  }
  return weekDays;
};
export const MyVisits = () => {
  const {
    t
  } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedWeek, setSelectedWeek] = useState(new Date()); // Current week start
  const [weekDays, setWeekDays] = useState(() => getWeekDays(new Date()));
  const [plannedBeats, setPlannedBeats] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [retailerStats, setRetailerStats] = useState<Map<string, any>>(new Map());
  const [plannedDates, setPlannedDates] = useState<Set<string>>(new Set());
  const [currentBeatName, setCurrentBeatName] = useState("No beats planned");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());
  const [isCreateVisitModalOpen, setIsCreateVisitModalOpen] = useState(false);
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineDate, setTimelineDate] = useState<Date>(new Date());
  const [timelineVisits, setTimelineVisits] = useState<any[]>([]);
  const [timelineDayStart, setTimelineDayStart] = useState<string>('08:00 AM');
  const [isVanStockOpen, setIsVanStockOpen] = useState(false);
  const [initialRetailerOrder, setInitialRetailerOrder] = useState<string[]>([]);
  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);
  const [pointsDetailsList, setPointsDetailsList] = useState<Array<{ retailerName: string; points: number; visitId: string | null }>>([]);
  const [isPointsDialogOpen, setIsPointsDialogOpen] = useState(false);
  const [hasAttendance, setHasAttendance] = useState(false);
  const [checkingAttendance, setCheckingAttendance] = useState(true);
  const {
    user
  } = useAuth();
  const navigate = useNavigate();

  // Get current beat ID for recommendations
  const currentBeatId = plannedBeats.length > 0 ? plannedBeats[0].beat_id : undefined;

  // AI Recommendations hooks
  const {
    recommendations: retailerPriorityRecs,
    loading: retailerRecsLoading,
    generateRecommendation: generateRetailerRecs,
    provideFeedback: provideRetailerFeedback
  } = useRecommendations('retailer_priority', currentBeatId);
  
  const { isLocationEnabled } = useLocationFeature();

  // Check attendance on mount - don't block page load
  useEffect(() => {
    const checkAttendance = async () => {
      if (!user?.id) {
        setCheckingAttendance(false);
        setHasAttendance(true);
        return;
      }

      try {
        const hasMarkedAttendance = await hasAttendanceTodayOfflineSupport(user.id);
        setHasAttendance(hasMarkedAttendance);
      } catch (error) {
        console.error('Error checking attendance:', error);
        // On error, allow access to avoid blocking user
        setHasAttendance(true);
      } finally {
        setCheckingAttendance(false);
      }
    };

    // Don't block page render - check attendance in background
    setCheckingAttendance(false);
    setHasAttendance(true);
    checkAttendance();
  }, [user?.id]);

  // One-time fix: Restore cancelled visits to planned if day hasn't ended
  useEffect(() => {
    const restoreCancelledVisits = async () => {
      if (!user?.id) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      // Check if user has ended their day
      const { data: attendance } = await supabase
        .from('attendance')
        .select('check_out_time')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      // If day hasn't ended, restore cancelled visits back to planned
      if (!attendance?.check_out_time) {
        const { error } = await supabase
          .from('visits')
          .update({ status: 'planned', updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('planned_date', today)
          .eq('status', 'cancelled');
        
        if (!error) {
          console.log('✅ Restored cancelled visits to planned (day not ended yet)');
          // Refresh data to show updated statuses
          invalidateData?.();
        }
      }
    };
    
    restoreCancelledVisits();
  }, [user?.id]);

  // Use optimized hook for cache-first data loading - now includes points AND progress stats!
  const {
    beatPlans: optimizedBeatPlans,
    visits: optimizedVisits,
    retailers: optimizedRetailers,
    orders: optimizedOrders,
    pointsData,
    progressStats,
    isLoading: dataLoading,
    invalidateData,
  } = useVisitsDataOptimized({
    userId: user?.id,
    selectedDate,
  });

  // Clear local retailers and beat info immediately when date changes
  useEffect(() => {
    if (!selectedDate) return;
    console.log('🔄 MyVisits: date changed, clearing local retailers and beats for instant UI update', selectedDate);
    setRetailers([]);
    setPlannedBeats([]);
    setCurrentBeatName('No beats planned');
  }, [selectedDate]);
 
  // Ref to always have the latest invalidateData function (prevents stale closures)
  const invalidateDataRef = useRef(invalidateData);
  useEffect(() => {
    invalidateDataRef.current = invalidateData;
  }, [invalidateData]);

  // Auto-refresh Today's Progress every 30 seconds (only for today's date)
  useEffect(() => {
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    if (!isToday) return;

    console.log('⏰ Setting up auto-refresh for Today\'s Progress');

    // 30-second interval for auto-refresh - uses ref to avoid stale closure
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing Today\'s Progress (30s interval)');
      invalidateDataRef.current?.();
    }, 30000);

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 Tab became visible, refreshing data');
        invalidateDataRef.current?.();
      }
    };

    // Refresh when window gains focus
    const handleFocus = () => {
      console.log('🎯 Window focused, refreshing data');
      invalidateDataRef.current?.();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      console.log('🧹 Cleaned up auto-refresh listeners');
    };
  }, [selectedDate]);

  // Update points from optimized hook
  useEffect(() => {
    if (pointsData) {
      setPointsEarnedToday(pointsData.total);
      
      const detailsList = Array.from(pointsData.byRetailer.values())
        .map(item => ({
          retailerName: item.name,
          points: item.points,
          visitId: item.visitId
        }))
        .sort((a, b) => b.points - a.points);
      
      setPointsDetailsList(detailsList);
    }
  }, [pointsData]);

  // Update local state when optimized data loads
  useEffect(() => {
    if (optimizedBeatPlans.length > 0) {
      setPlannedBeats(optimizedBeatPlans);
      const beatNames = optimizedBeatPlans.map(plan => plan.beat_name).join(', ');
      setCurrentBeatName(beatNames);
    } else {
      // Reset when no beats planned for selected date
      setPlannedBeats([]);
      setCurrentBeatName("No beats planned");
    }
  }, [optimizedBeatPlans]);

  // Prefetch products in background after initial data loads for faster Order Entry
  useEffect(() => {
    if (!dataLoading && optimizedRetailers.length > 0) {
      console.log('📦 Scheduling product prefetch for faster Order Entry...');
      schedulePrefetch(1000); // Prefetch after 1 second
    }
  }, [dataLoading, optimizedRetailers.length]);

  useEffect(() => {
    // Process retailers with visit and order data
    if (optimizedRetailers.length > 0) {
      // Process own retailers
      const processedRetailers = optimizedRetailers.map(retailer => {
        const visit = optimizedVisits.find(v => v.retailer_id === retailer.id);
        const orders = optimizedOrders.filter(o => o.retailer_id === retailer.id);
        const totalOrderValue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        
        return {
          id: retailer.id,
          retailerId: retailer.id,
          retailerName: retailer.name || '',
          address: retailer.address || '',
          phone: retailer.phone || '',
          retailerCategory: retailer.category || '',
          status: visit?.status || 'planned',
          visitType: 'Regular Visit',
          visitId: visit?.id,
          hasOrder: orders.length > 0,
          orderValue: totalOrderValue,
          visitStatus: visit?.status,
          noOrderReason: visit?.no_order_reason,
          distributor: retailer.parent_name,
          priority: retailer.potential,
        };
      });

      setRetailers(processedRetailers);
    }
  }, [optimizedRetailers, optimizedVisits, optimizedOrders]);

  // Initialize selected day to today
  useEffect(() => {
    const today = weekDays.find(d => d.isToday);
    if (today && !selectedDay) {
      setSelectedDay(today.day);
      setSelectedDate(today.isoDate);
    }
  }, [weekDays, selectedDay]);

  // Update week days when selected week changes
  useEffect(() => {
    setWeekDays(getWeekDays(selectedWeek));
  }, [selectedWeek]);

  // Lightweight real-time updates - just refresh data when changes occur
  useEffect(() => {
    if (!user || !selectedDate || !navigator.onLine) return;

    const channel = supabase.channel('visit-updates-lightweight')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'visits',
        filter: `user_id=eq.${user.id}`
      }, () => {
        // Trigger background refresh in optimized hook
        window.dispatchEvent(new Event('visitDataChanged'));
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'beat_plans',
        filter: `user_id=eq.${user.id}`
      }, () => {
        // Trigger background refresh when beat plans change
        window.dispatchEvent(new Event('visitDataChanged'));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedDate]);

  // Points are now loaded in useVisitsDataOptimized hook - no separate fetch needed!

  // Load week plan markers for calendar
  useEffect(() => {
    if (!user) return;
    const loadWeekPlans = async () => {
      try {
        const startIso = weekDays[0]?.isoDate;
        const endIso = weekDays[weekDays.length - 1]?.isoDate;
        if (!startIso || !endIso) return;
        
        const {
          data,
          error
        } = await supabase.from('beat_plans').select('plan_date').eq('user_id', user.id).gte('plan_date', startIso).lte('plan_date', endIso);
        
        if (error) throw error;
        setPlannedDates(new Set((data || []).map((d: any) => d.plan_date)));
      } catch (err) {
        if (!shouldSuppressError(err)) {
          console.error('Error loading week plans:', err);
        }
      }
    };
    loadWeekPlans();
  }, [user, weekDays]);
  // Removed - now using useVisitsDataOptimized hook for better performance
  const loadTimelineVisits = async (date: Date) => {
    if (!user) return;
    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Get attendance data for day start time
      const {
        data: attendance
      } = await supabase.from('attendance').select('check_in_time').eq('user_id', user.id).eq('date', dateStr).maybeSingle();
      if (attendance?.check_in_time) {
        setTimelineDayStart(format(new Date(attendance.check_in_time), 'hh:mm a'));
      } else {
        setTimelineDayStart('Not checked in');
      }

      // Get ALL visits for the selected date (both checked in and not)
      const {
        data: visits,
        error
      } = await supabase.from('visits').select(`
          id,
          retailer_id,
          check_in_time,
          check_out_time,
          check_in_address,
          status,
          no_order_reason,
          skip_check_in_time,
          updated_at
        `).eq('user_id', user.id).eq('planned_date', dateStr);
      if (error) throw error;

      // Get retailer details for these visits
      const retailerIds = (visits || []).map(v => v.retailer_id);
      if (retailerIds.length === 0) {
        setTimelineVisits([]);
        return;
      }
      const {
        data: retailers,
        error: retailersError
      } = await supabase.from('retailers').select('id, name, address').in('id', retailerIds);
      if (retailersError) throw retailersError;
      const retailerMap = new Map(retailers?.map(r => [r.id, {
        name: r.name,
        address: r.address
      }]));

      // Get order details with created_at for these visits
      const dateStart = new Date(dateStr);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(dateStr);
      dateEnd.setHours(23, 59, 59, 999);
      const {
        data: orders,
        error: ordersError
      } = await supabase.from('orders').select('retailer_id, total_amount, created_at, order_items(quantity)').eq('user_id', user.id).eq('status', 'confirmed').in('retailer_id', retailerIds).gte('created_at', dateStart.toISOString()).lte('created_at', dateEnd.toISOString());
      if (ordersError) throw ordersError;

      // Create order map with created_at time
      const orderMap = new Map();
      (orders || []).forEach(order => {
        const existing = orderMap.get(order.retailer_id);
        if (!existing || new Date(order.created_at) < new Date(existing.created_at)) {
          // Keep earliest order time for this retailer
          orderMap.set(order.retailer_id, {
            value: (existing?.value || 0) + Number(order.total_amount || 0),
            quantity: (existing?.quantity || 0) + (order.order_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0),
            created_at: existing?.created_at ? (new Date(order.created_at) < new Date(existing.created_at) ? order.created_at : existing.created_at) : order.created_at
          });
        } else {
          existing.value += Number(order.total_amount || 0);
          existing.quantity += order.order_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
          orderMap.set(order.retailer_id, existing);
        }
      });

      // Get feedback data
      const {
        data: feedbacks,
        error: feedbackError
      } = await supabase.from('retailer_feedback').select('retailer_id, created_at').eq('user_id', user.id).in('retailer_id', retailerIds).gte('created_at', dateStart.toISOString()).lte('created_at', dateEnd.toISOString());
      
      const feedbackMap = new Map();
      (feedbacks || []).forEach(feedback => {
        const existing = feedbackMap.get(feedback.retailer_id);
        if (!existing || new Date(feedback.created_at) < new Date(existing)) {
          feedbackMap.set(feedback.retailer_id, feedback.created_at);
        }
      });

      // Transform visits to timeline format with activity time
      const timelineData = (visits || []).map(visit => {
        const retailer = retailerMap.get(visit.retailer_id);
        const order = orderMap.get(visit.retailer_id);
        const feedbackTime = feedbackMap.get(visit.retailer_id);
        
        // Determine activity time based on what action was taken
        let activityTime = null;
        
        if (order?.created_at) {
          // If order exists, use order creation time
          activityTime = order.created_at;
        } else if (visit.no_order_reason && visit.updated_at) {
          // If no order reason exists, use visit updated time
          activityTime = visit.updated_at;
        } else if (feedbackTime) {
          // If feedback exists, use feedback time
          activityTime = feedbackTime;
        }

        // Use check_in_time if available, otherwise use skip_check_in_time for phone orders
        const effectiveTime = visit.check_in_time || visit.skip_check_in_time;
        
        return {
          id: visit.id,
          retailer_name: retailer?.name || 'Unknown',
          check_in_time: effectiveTime,
          check_out_time: visit.check_out_time,
          check_in_address: visit.check_in_address || retailer?.address || 'Address not available',
          status: visit.status,
          order_value: order?.value || 0,
          order_quantity: order?.quantity || 0,
          no_order_reason: visit.no_order_reason,
          activity_time: activityTime,
          is_planned: !effectiveTime // Flag for planned visits
        };
      })
      // Filter to only show visits with an activity (order, no_order_reason, or feedback)
      .filter(v => v.activity_time !== null)
      // Sort by activity time (when the transaction happened) in ascending order
      .sort((a, b) => {
        return new Date(a.activity_time).getTime() - new Date(b.activity_time).getTime();
      });
      
      setTimelineVisits(timelineData);
    } catch (error) {
      console.error('Error loading timeline visits:', error);
      toast.error('Failed to load timeline data');
    }
  };

  // Load timeline visits when date changes
  useEffect(() => {
    if (isTimelineOpen && user) {
      loadTimelineVisits(timelineDate);
    }
  }, [timelineDate, isTimelineOpen, user]);
  const loadAllVisitsForDate = async (date: string, beatPlans: any[] = optimizedBeatPlans, preserveOrder: boolean = false) => {
    if (!user) return;
    try {
      // Check if this is a future date
      const selectedDateObj = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);
      const isFutureDate = selectedDateObj > today;

      // Get planned beat IDs
      const plannedBeatIds = beatPlans.map(plan => plan.beat_id);

      let visits: any[] = [];
      let plannedRetailersData: any[] = [];

      // Try online first, fallback to cache for visits and retailers
      try {
        const [visitsResult, plannedRetailersResult] = await Promise.all([
          supabase.from('visits').select('*').eq('user_id', user.id).eq('planned_date', date),
          plannedBeatIds.length > 0 
            ? supabase.from('retailers').select('id').eq('user_id', user.id).in('beat_id', plannedBeatIds)
            : Promise.resolve({ data: [], error: null })
        ]);

        if (visitsResult.error) throw visitsResult.error;
        visits = visitsResult.data || [];
        plannedRetailersData = plannedRetailersResult.data || [];

        // Cache ONLY today's visits (not historical data)
        const today = new Date().toISOString().split('T')[0];
        if (date === today) {
          for (const visit of visits) {
            await offlineStorage.save(STORES.VISITS, visit);
          }
          console.log('[MyVisits] ✅ Cached today\'s visits only');
        }
      } catch (error) {
        if (shouldSuppressError(error)) {
          // Load from cache when offline
          console.log('📦 Loading visits and retailers from cache');
          const cachedVisits = await offlineStorage.getAll(STORES.VISITS);
          visits = cachedVisits.filter((v: any) => 
            v.user_id === user.id && v.planned_date === date
          );
          
          const cachedRetailers = await offlineStorage.getAll(STORES.RETAILERS);
          plannedRetailersData = cachedRetailers.filter((r: any) =>
            r.user_id === user.id && plannedBeatIds.includes(r.beat_id)
          );
        } else {
          throw error;
        }
      }

      // Get all retailer IDs (visits + planned beats)
      const visitRetailerIds = visits.map(v => v.retailer_id);
      const allRetailerIds = new Set([...visitRetailerIds]);
      
      if (plannedRetailersData) {
        plannedRetailersData.forEach(r => allRetailerIds.add(r.id));
      }

      if (allRetailerIds.size === 0) {
        setRetailers([]);
        setRetailerStats(new Map());
        setInitialRetailerOrder([]);
        return;
      }

      // Prepare date range for orders query
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      let retailersData: any[] = [];
      let ordersForDate: any[] = [];
      let allOrders: any[] = [];
      let allVisits: any[] = [];

      // Try online first, fallback to cache
      try {
        const [retailersResult, ordersForDateResult, allOrdersResult, allVisitsResult] = await Promise.all([
          supabase.from('retailers').select('*').eq('user_id', user.id).in('id', Array.from(allRetailerIds)),
          !isFutureDate 
            ? supabase.from('orders')
                .select('id, retailer_id, total_amount, created_at')
                .eq('user_id', user.id)
                .eq('status', 'confirmed')
                .in('retailer_id', Array.from(allRetailerIds))
                .gte('created_at', dateStart.toISOString())
                .lte('created_at', dateEnd.toISOString())
            : Promise.resolve({ data: [], error: null }),
          !isFutureDate
            ? supabase.from('orders')
                .select('retailer_id, total_amount, created_at')
                .eq('user_id', user.id)
                .eq('status', 'confirmed')
                .in('retailer_id', Array.from(allRetailerIds))
                .lte('created_at', date + 'T23:59:59.999Z')
            : Promise.resolve({ data: [], error: null }),
          !isFutureDate
            ? supabase.from('visits')
                .select('retailer_id, planned_date')
                .eq('user_id', user.id)
                .in('retailer_id', Array.from(allRetailerIds))
                .lte('planned_date', date)
            : Promise.resolve({ data: [], error: null })
        ]);

        if (retailersResult.error) throw retailersResult.error;
        
        retailersData = retailersResult.data || [];
        ordersForDate = ordersForDateResult.data || [];
        allOrders = allOrdersResult.data || [];
        allVisits = allVisitsResult.data || [];

        // Cache retailers for offline use
        for (const retailer of retailersData) {
          await offlineStorage.save(STORES.RETAILERS, retailer);
        }
      } catch (error) {
        if (shouldSuppressError(error)) {
          // Load from cache when offline
          console.log('📦 Loading retailers from cache');
          const cachedRetailers = await offlineStorage.getAll(STORES.RETAILERS);
          retailersData = cachedRetailers.filter((r: any) =>
            r.user_id === user.id && allRetailerIds.has(r.id)
          );
          
          // For offline, we can't get orders, so set empty arrays
          ordersForDate = [];
          allOrders = [];
          allVisits = [];
        } else {
          throw error;
        }
      }

      // Create retailer map
      const retailerMap = new Map();
      retailersData.forEach(retailer => {
        retailerMap.set(retailer.id, retailer);
      });

      // Create visit map
      const visitMap = new Map();
      visits.forEach(visit => {
        visitMap.set(visit.retailer_id, visit);
      });

      // Calculate order totals by retailer for current date
      const totalsByRetailer = new Map<string, number>();
      ordersForDate.forEach(o => {
        if (!o.retailer_id) return;
        totalsByRetailer.set(o.retailer_id, (totalsByRetailer.get(o.retailer_id) || 0) + Number(o.total_amount || 0));
      });

      // Calculate historical stats per retailer
      const statsMap = new Map();
      if (!isFutureDate) {
        allRetailerIds.forEach(retailerId => {
          const retailerOrders = allOrders.filter(o => o.retailer_id === retailerId);
          const retailerVisits = allVisits.filter(v => v.retailer_id === retailerId);
          const totalSales = retailerOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
          const avgSales = retailerOrders.length > 0 ? totalSales / retailerOrders.length : 0;
          const visitCount = retailerVisits.length;

          // Get last visit date
          const retailer = retailerMap.get(retailerId);
          const lastVisitDate = retailer?.last_visit_date;
          const daysSinceLastVisit = lastVisitDate ? differenceInDays(new Date(date), new Date(lastVisitDate)) : null;
          statsMap.set(retailerId, {
            avgSales,
            visitCount,
            daysSinceLastVisit,
            totalSales
          });
        });
      } else {
        // For future dates, initialize empty stats
        allRetailerIds.forEach(retailerId => {
          statsMap.set(retailerId, {
            avgSales: 0,
            visitCount: 0,
            daysSinceLastVisit: null,
            totalSales: 0
          });
        });
      }
      setRetailerStats(statsMap);

      // Determine the order of retailer IDs to use
      let orderedRetailerIds: string[];
      if (preserveOrder && initialRetailerOrder.length > 0) {
        // Use existing order and append any new retailers at the end
        const existingIds = new Set(initialRetailerOrder);
        const newIds = Array.from(allRetailerIds).filter(id => !existingIds.has(id));
        orderedRetailerIds = [...initialRetailerOrder.filter(id => allRetailerIds.has(id)), ...newIds];
      } else {
        // First load or order reset - use database order
        orderedRetailerIds = Array.from(allRetailerIds);
        setInitialRetailerOrder(orderedRetailerIds);
      }

      // Transform retailers into visit format using the ordered list
      const transformedRetailers = orderedRetailerIds.map(retailerId => {
        const retailer = retailerMap.get(retailerId);
        if (!retailer) return null;
        const visit = visitMap.get(retailerId);
        // For future dates, orderTotal should always be 0
        const orderTotal = isFutureDate ? 0 : totalsByRetailer.get(retailerId) || 0;
        const hasOrder = orderTotal > 0;
        const hasCheckIn = visit?.check_in_time;

        // Determine if this is unplanned (has visit but retailer not in planned beats)
        const isPlanned = plannedBeatIds.includes(retailer.beat_id);
        const visitType = visit && !isPlanned ? 'Unplanned Visit' : 'Regular Visit';

        // Only show retailers that either have a visit or are in planned beats
        if (!visit && !isPlanned) return null;
        const status = hasOrder ? 'productive' as const : visit?.status === 'unproductive' ? 'unproductive' as const : hasCheckIn ? 'in-progress' as const : 'planned' as const;
        return {
          id: visit?.id || retailerId,
          retailerId: retailer.id,
          retailerName: retailer.name,
          address: retailer.address,
          phone: retailer.phone || '',
          retailerCategory: retailer.category || 'Category A',
          priority: retailer.priority || 'medium',
          status,
          visitType,
          day: 'Today',
          checkInStatus: hasCheckIn ? 'checked-in' as const : 'not-checked-in' as const,
          hasOrder,
          orderValue: orderTotal,
          retailerLat: retailer.latitude != null ? Number(retailer.latitude) : undefined,
          retailerLng: retailer.longitude != null ? Number(retailer.longitude) : undefined,
          lastVisitDate: retailer.last_visit_date,
          checkInTime: visit?.check_in_time,
          checkOutTime: visit?.check_out_time,
          noOrderReason: visit?.no_order_reason
        };
      }).filter(Boolean);
      setRetailers(transformedRetailers);
    } catch (error) {
      console.error('Error loading visits for date:', error);
    }
  };
  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    const dayInfo = weekDays.find(d => d.day === day);
    if (dayInfo) {
      setSelectedDate(dayInfo.isoDate);
    }
  };
  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    setCalendarDate(date);
    const weekStart = startOfWeek(date, {
      weekStartsOn: 0
    });
    setSelectedWeek(weekStart);

    // Set the selected day to the picked date
    const newWeekDays = getWeekDays(weekStart);
    const selectedDayInfo = newWeekDays.find(d => isSameDay(d.fullDate, date));
    if (selectedDayInfo) {
      setSelectedDay(selectedDayInfo.day);
      setSelectedDate(selectedDayInfo.isoDate);
    }
  };
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' ? subWeeks(selectedWeek, 1) : addWeeks(selectedWeek, 1);
    setSelectedWeek(newWeek);
    setCalendarDate(newWeek);

    // Keep the same day of week if possible, otherwise select the first day
    const newWeekDays = getWeekDays(newWeek);
    const sameWeekdayIndex = weekDays.findIndex(d => d.day === selectedDay);
    const targetDay = newWeekDays[sameWeekdayIndex] || newWeekDays[0];
    setSelectedDay(targetDay.day);
    setSelectedDate(targetDay.isoDate);
  };

  // Extract unique categories and locations for filter options
  const availableCategories = useMemo(() => {
    return Array.from(new Set(retailers.map(r => r.retailerCategory).filter(Boolean)));
  }, [retailers]);
  const availableLocations = useMemo(() => {
    return Array.from(new Set(retailers.map(r => {
      // Extract city/area from address
      const addressParts = r.address?.split(',') || [];
      return addressParts[addressParts.length - 2]?.trim() || addressParts[addressParts.length - 1]?.trim();
    }).filter(Boolean)));
  }, [retailers]);

  // Show visits for selected date based on planned beats
  const allVisits = retailers;
  const filteredVisits = useMemo(() => {
    if (dataLoading) return [];
    const filtered = allVisits.filter(visit => {
      const matchesSearch = visit.retailerName.toLowerCase().includes(searchTerm.toLowerCase()) || visit.phone.includes(searchTerm);
      let matchesStatus = true;
      if (statusFilter === 'planned') {
        // Show only planned visits (retailers without visits also have status='planned')
        matchesStatus = visit.status === 'planned';
      } else if (statusFilter === 'unproductive') {
        matchesStatus = visit.status === 'unproductive';
      } else if (statusFilter) {
        matchesStatus = visit.status === statusFilter;
      }

      // Apply advanced filters
      if (filters.category && visit.retailerCategory !== filters.category) {
        return false;
      }
      if (filters.priority && visit.priority !== filters.priority) {
        return false;
      }

      // Last visit filter
      if (filters.lastVisitDays) {
        const stats = retailerStats.get(visit.retailerId);
        if (filters.lastVisitDays === 'never') {
          if (stats?.daysSinceLastVisit !== null) return false;
        } else {
          const days = parseInt(filters.lastVisitDays);
          if (days === 90) {
            // 90+ days
            if (!stats?.daysSinceLastVisit || stats.daysSinceLastVisit < 90) return false;
          } else {
            if (!stats?.daysSinceLastVisit || stats.daysSinceLastVisit > days) return false;
          }
        }
      }

      // Average sales filter
      if (filters.avgSalesRange) {
        const stats = retailerStats.get(visit.retailerId);
        const avgSales = stats?.avgSales || 0;
        switch (filters.avgSalesRange) {
          case 'high':
            if (avgSales < 20000) return false;
            break;
          case 'medium':
            if (avgSales < 10000 || avgSales >= 20000) return false;
            break;
          case 'low':
            if (avgSales < 5000 || avgSales >= 10000) return false;
            break;
          case 'very-low':
            if (avgSales === 0 || avgSales >= 5000) return false;
            break;
          case 'zero':
            if (avgSales > 0) return false;
            break;
        }
      }

      // Location filter
      if (filters.location) {
        const addressParts = visit.address?.split(',') || [];
        const location = addressParts[addressParts.length - 2]?.trim() || addressParts[addressParts.length - 1]?.trim();
        if (location !== filters.location) return false;
      }
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      const nameA = a.retailerName.toLowerCase();
      const nameB = b.retailerName.toLowerCase();
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
  }, [allVisits, searchTerm, statusFilter, filters, retailerStats, sortOrder]);
  const visitsForSelectedDate = retailers;

  // Use pre-calculated progress stats from optimized hook for instant display
  const plannedVisitsCount = progressStats.planned;
  const productiveVisits = progressStats.productive;
  const unproductiveVisits = progressStats.unproductive;
  const totalOrdersToday = progressStats.totalOrders;
  const totalOrderValue = progressStats.totalOrderValue;
  const handleViewDetails = (visitId: string) => {
    window.location.href = `/visit/${visitId}`;
  };
  const handleStatusClick = (status: string) => {
    if (status === 'planned') {
      // Show both planned and in-progress when clicking planned beats
      setStatusFilter(statusFilter === 'planned' ? "" : 'planned');
    } else if (status === 'unproductive') {
      // Show unproductive visits
      setStatusFilter(statusFilter === 'unproductive' ? "" : 'unproductive');
    } else {
      setStatusFilter(statusFilter === status ? "" : status);
    }
  };
  const handleOrdersClick = async () => {
    if (!user || !selectedDate) return;
    try {
      const todayStart = new Date(selectedDate);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(selectedDate);
      todayEnd.setHours(23, 59, 59, 999);
      const {
        data: orders,
        error
      } = await supabase.from('orders').select(`
          *,
          order_items (
            *
          )
        `).eq('user_id', user.id).gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString());
      if (error) throw error;
      setOrdersData(orders || []);
      setIsOrdersDialogOpen(true);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };
  // Show loading while checking attendance
  if (checkingAttendance) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Show attendance required message if not marked
  if (!hasAttendance) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-xl text-center">Attendance Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Please mark your attendance first to access the My Visits page.
              </p>
              <Button 
                onClick={() => navigate('/attendance')} 
                className="w-full"
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Mark Attendance
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return <Layout>
      <div className="p-2 sm:p-4 space-y-2 sm:space-y-4 mt-2 sm:mt-3">
        {/* Header Card */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="pb-2 px-2 sm:px-6 pt-2 sm:pt-6">
            <div>
              <CardTitle className="text-base sm:text-xl font-bold leading-tight">{t('visits.title')}</CardTitle>
              <p className="text-xs sm:text-base font-semibold mt-0.5 sm:mt-1 truncate leading-tight">{currentBeatName}</p>
            </div>
            
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-4 px-2 sm:px-6 pb-2 sm:pb-6">
            {/* Calendar Selector */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-4">
               <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
                 <Popover>
                   <PopoverTrigger asChild>
                      <Button variant="outline" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-[10px] sm:text-sm flex-1 sm:flex-none h-7 sm:h-9">
                        <CalendarIcon className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="truncate">
                          {t('visits.weekOf')} {format(selectedWeek, "MMM d, yyyy")}
                        </span>
                      </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-0" align="start">
                     <Calendar mode="single" selected={selectedWeek} onSelect={date => {
                    if (date) {
                      const weekStart = startOfWeek(date, {
                        weekStartsOn: 0
                      });
                      setSelectedWeek(weekStart);
                    }
                  }} initialFocus className="pointer-events-auto" />
                   </PopoverContent>
                 </Popover>
               </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm">
                  ←
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm">
                  →
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map(dayInfo => <button key={dayInfo.day} onClick={() => handleDayChange(dayInfo.day)} className={`relative p-1.5 sm:p-2 rounded-lg text-center transition-colors min-h-[50px] sm:min-h-[65px] ${selectedDay === dayInfo.day ? 'bg-primary-foreground text-primary' : dayInfo.isToday ? 'bg-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/40' : 'bg-primary-foreground/10 hover:bg-primary-foreground/20'}`}>
                  <div className="text-[9px] sm:text-xs font-medium leading-tight">{dayInfo.day}</div>
                  <div className="text-base sm:text-lg font-bold leading-tight mt-0.5">{dayInfo.date}</div>
                  {plannedDates.has(dayInfo.isoDate) && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-success" />}
                </button>)}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2">
              <Button variant="secondary" size="sm" className={`bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-[10px] sm:text-sm h-8 sm:h-9 px-1.5 sm:px-3 ${selectedDate < new Date().toISOString().split('T')[0] ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => window.location.href = '/beat-planning'} disabled={selectedDate < new Date().toISOString().split('T')[0]}>
                <Route size={12} className="mr-1 sm:mr-1.5" />
                <span className="whitespace-nowrap">All Beat</span>
              </Button>
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-[10px] sm:text-sm h-8 sm:h-9 px-1.5 sm:px-3" onClick={() => navigate('/my-retailers', { state: { returnTo: '/visits/retailers' } })}>
                <Users size={12} className="mr-1 sm:mr-1.5" />
                <span className="whitespace-nowrap">All Retailers</span>
              </Button>
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-[10px] sm:text-sm h-8 sm:h-9 px-1.5 sm:px-3" onClick={() => navigate(`/today-summary?date=${selectedDate}`)}>
                <FileText size={12} className="mr-1 sm:mr-1.5" />
                <span className="whitespace-nowrap">Today's Summary</span>
              </Button>
            </div>
            
            {/* Timeline View, GPS Track, and Van Stock Buttons */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 border-t border-primary-foreground/20 pt-2">
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3" onClick={() => {
              setTimelineDate(selectedDate ? new Date(selectedDate) : new Date());
              setIsTimelineOpen(true);
            }}>
                <Clock size={14} className="mr-1.5" />
                Timeline
              </Button>
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3" onClick={() => navigate('/gps-track')}>
                <MapPin size={14} className="mr-1.5" />
                GPS Track
              </Button>
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3" onClick={() => setIsVanStockOpen(true)}>
                <Truck size={14} className="mr-1.5" />
                Van Stock
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="shadow-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-2 sm:p-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-0.5 sm:gap-1">
              <h3 className="font-bold text-xs sm:text-base text-primary leading-tight">{t('visits.todaysProgress')}</h3>
              <div className="text-[9px] sm:text-xs text-muted-foreground leading-tight">
                {(selectedDate ? new Date(selectedDate) : new Date()).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'short'
              })}
              </div>
            </div>
            
             {/* Stats Grid - Mobile Responsive */}
             <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
               <button onClick={() => navigate(`/today-summary?date=${selectedDate}`)} className="bg-gradient-to-r from-success/10 to-success/5 p-2 sm:p-3 rounded-lg border border-success/20 cursor-pointer hover:from-success/15 hover:to-success/10 transition-all flex flex-col items-center justify-center text-center min-h-[70px] sm:min-h-[85px]">
                 <div className="text-base sm:text-xl font-bold text-success leading-tight">₹{totalOrderValue.toLocaleString()}</div>
                 <div className="text-[9px] sm:text-xs text-success/80 font-medium mt-1 leading-tight">{t('visits.totalOrderValue')}</div>
               </button>
               <button onClick={handleOrdersClick} className="bg-gradient-to-r from-primary/10 to-primary/5 p-2 sm:p-3 rounded-lg border border-primary/20 cursor-pointer hover:from-primary/15 hover:to-primary/10 transition-all flex flex-col items-center justify-center text-center min-h-[70px] sm:min-h-[85px]">
                 <div className="text-base sm:text-xl font-bold text-primary leading-tight">{totalOrdersToday}</div>
                 <div className="text-[9px] sm:text-xs text-primary/80 font-medium mt-1 leading-tight">{t('visits.todaysOrder')}</div>
               </button>
                <button onClick={() => handleStatusClick("planned")} className={`p-2 sm:p-3 rounded-lg text-center transition-all transform hover:scale-105 flex flex-col items-center justify-center min-h-[70px] sm:min-h-[85px] ${statusFilter === "planned" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 border border-blue-200"}`}>
                  <div className="text-base sm:text-xl font-bold leading-tight">{plannedVisitsCount}</div>
                  <div className="text-[9px] sm:text-xs font-medium opacity-80 mt-1 leading-tight">{t('visits.planned')}</div>
                </button>
               <button onClick={() => handleStatusClick("productive")} className={`p-2 sm:p-3 rounded-lg text-center transition-all transform hover:scale-105 flex flex-col items-center justify-center min-h-[70px] sm:min-h-[85px] ${statusFilter === "productive" ? "bg-success text-success-foreground shadow-lg shadow-success/25" : "bg-gradient-to-br from-success/10 to-success/20 hover:from-success/20 hover:to-success/30 border border-success/30 text-success"}`}>
                 <div className="text-base sm:text-xl font-bold leading-tight">{productiveVisits}</div>
                 <div className="text-[9px] sm:text-xs font-medium opacity-80 mt-1 leading-tight">{t('visits.productive')}</div>
               </button>
               <button onClick={() => handleStatusClick("unproductive")} className={`p-2 sm:p-3 rounded-lg text-center transition-all transform hover:scale-105 flex flex-col items-center justify-center min-h-[70px] sm:min-h-[85px] ${statusFilter === "unproductive" ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25" : "bg-gradient-to-br from-destructive/10 to-destructive/20 hover:from-destructive/20 hover:to-destructive/30 border border-destructive/30 text-destructive"}`}>
                 <div className="text-base sm:text-xl font-bold leading-tight">{unproductiveVisits}</div>
                 <div className="text-[9px] sm:text-xs font-medium opacity-80 mt-1 leading-tight">{t('visits.unproductive')}</div>
               </button>
               <button onClick={() => setIsPointsDialogOpen(true)} className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-2 sm:p-3 rounded-lg border border-amber-500/20 cursor-pointer hover:from-amber-500/15 hover:to-yellow-500/15 transition-all flex flex-col items-center justify-center text-center min-h-[70px] sm:min-h-[85px]">
                 <div className="text-base sm:text-xl font-bold text-amber-600 leading-tight">{pointsEarnedToday}</div>
                 <div className="text-[9px] sm:text-xs text-amber-600/80 font-medium mt-1 leading-tight">Points Earned Today</div>
               </button>
             </div>
           </CardContent>
        </Card>

        {/* AI Recommendations Section */}
        {plannedBeats.length > 0 && currentBeatId && <div className="space-y-3">
            <AIRecommendationBanner recommendations={retailerPriorityRecs} onGenerate={() => generateRetailerRecs('retailer_priority', currentBeatId)} onFeedback={provideRetailerFeedback} loading={retailerRecsLoading} type="retailer_priority" beatId={currentBeatId} />
          </div>}

        {/* Enhanced Search and Filter Bar - Mobile Optimized */}
        <Card className="shadow-card bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-2">
            <div className="flex gap-2 items-center">
              <div className="flex-1 min-w-0">
                <SearchInput placeholder={t('visits.searchPlaceholder')} value={searchTerm} onChange={setSearchTerm} />
              </div>
              <VisitFilters filters={filters} onFiltersChange={setFilters} availableCategories={availableCategories} availableLocations={availableLocations} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:from-primary/15 hover:to-primary/10 h-9 w-9 p-0 flex-shrink-0"
                    title="Sort Alphabetically"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background z-50">
                  <DropdownMenuItem onClick={() => setSortOrder('asc')} className={cn("cursor-pointer", sortOrder === 'asc' && "bg-primary/10")}>
                    A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder('desc')} className={cn("cursor-pointer", sortOrder === 'desc' && "bg-primary/10")}>
                    Z-A
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Visits List */}
        <div className="space-y-2 sm:space-y-3">
          {/* Show beat plans with 0 retailers */}
          {plannedBeats.length > 0 && filteredVisits.length === 0 && searchTerm === '' && (
            <Card className="shadow-card border-primary/20">
              <CardContent className="p-4 text-center">
                <Users size={32} className="mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold text-muted-foreground mb-2">
                  {plannedBeats.map(bp => bp.beat_name).join(', ')}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  This beat has 0 retailers assigned
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/my-beats')}
                >
                  Add Retailers to Beat
                </Button>
              </CardContent>
            </Card>
          )}
          
          {filteredVisits.length === 0 && (plannedBeats.length === 0 || searchTerm !== '') ? <Card className="shadow-card">
              <CardContent className="p-4 sm:p-8 text-center">
                <CalendarIcon size={32} className="sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="font-semibold text-muted-foreground mb-2 text-sm sm:text-base">{t('visits.noVisitsFound')}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  {t('visits.adjustSearch')}
                </p>
                <Button className="mt-2 sm:mt-4 text-xs sm:text-sm h-8 sm:h-auto" onClick={() => setIsCreateVisitModalOpen(true)}>
                  <Plus size={14} className="mr-1 sm:mr-2" />
                  {t('visits.createNewVisit')}
                </Button>
              </CardContent>
            </Card> : filteredVisits.map(visit => <VisitCard key={visit.id} visit={visit} onViewDetails={handleViewDetails} selectedDate={selectedDate} />)}
        </div>

        {/* Create New Visit Modal */}
        <CreateNewVisitModal isOpen={isCreateVisitModalOpen} onClose={() => setIsCreateVisitModalOpen(false)} initialDate={selectedDate} onVisitCreated={() => {
        // Trigger data refresh
        window.dispatchEvent(new Event('visitDataChanged'));
      }} />

        {/* Orders Dialog */}
        <Dialog open={isOrdersDialogOpen} onOpenChange={setIsOrdersDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('visits.ordersPlacedToday')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-3 sm:mt-4">
              {ordersData.length === 0 ? <div className="text-center py-6 sm:py-8">
                  <p className="text-muted-foreground text-sm sm:text-base">{t('visits.noOrdersToday')}</p>
                </div> : <div className="space-y-3 sm:space-y-4">
                  {ordersData.map((order, index) => <Card key={order.id} className="border border-border/40">
                      <CardHeader className="pb-2 sm:pb-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-sm sm:text-base">{t('visits.orderNumber')}{index + 1}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {order.retailer_name} • {format(new Date(order.created_at), 'hh:mm a')}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-success/10 text-success text-xs sm:text-sm">
                            ₹{Number(order.total_amount).toLocaleString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {order.order_items && order.order_items.length > 0 && <div className="space-y-2">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('visits.items')}</p>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs sm:text-sm">{t('visits.product')}</TableHead>
                                    <TableHead className="text-xs sm:text-sm">{t('visits.quantity')}</TableHead>
                                    <TableHead className="text-xs sm:text-sm">{t('visits.rate')}</TableHead>
                                    <TableHead className="text-xs sm:text-sm">{t('visits.total')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.order_items.map((item: any) => <TableRow key={item.id}>
                                      <TableCell className="text-xs sm:text-sm">{item.product_name}</TableCell>
                                      <TableCell className="text-xs sm:text-sm">{item.quantity} {item.unit}</TableCell>
                                      <TableCell className="text-xs sm:text-sm">₹{Number(item.rate).toLocaleString()}</TableCell>
                                      <TableCell className="text-xs sm:text-sm">₹{Number(item.total).toLocaleString()}</TableCell>
                                    </TableRow>)}
                                </TableBody>
                              </Table>
                            </div>
                          </div>}
                      </CardContent>
                    </Card>)}
                </div>}
            </div>
          </DialogContent>
        </Dialog>

        {/* Points Dialog */}
        <Dialog open={isPointsDialogOpen} onOpenChange={setIsPointsDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                Points Earned - {selectedDate ? format(new Date(selectedDate), 'MMM dd, yyyy') : 'Today'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-4">
              {pointsDetailsList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No points earned on this date</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                    <span className="font-medium">Total Points</span>
                    <span className="text-2xl font-bold text-amber-600">{pointsEarnedToday}</span>
                  </div>
                  
                  {pointsDetailsList.map((item, index) => (
                    <Card key={index} className="border-l-4 border-l-amber-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            {item.visitId ? (
                              <a
                                href={`/visit-detail/${item.visitId}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {item.retailerName}
                              </a>
                            ) : (
                              <span className="font-medium">{item.retailerName}</span>
                            )}
                          </div>
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            +{item.points} pts
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Timeline View Dialog */}
        <Dialog open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('visits.timelineView')} - {format(timelineDate, 'MMM dd, yyyy')}</DialogTitle>
            </DialogHeader>
            <TimelineView visits={timelineVisits} dayStart={timelineDayStart} selectedDate={timelineDate} onDateChange={date => {
            setTimelineDate(date);
            loadTimelineVisits(date);
          }} />
          </DialogContent>
        </Dialog>

        {/* Van Stock Management Dialog */}
        <VanStockManagement open={isVanStockOpen} onOpenChange={setIsVanStockOpen} selectedDate={selectedDate} />
      </div>
    </Layout>;
};