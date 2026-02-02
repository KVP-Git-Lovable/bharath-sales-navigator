import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConnectivity } from './useConnectivity';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';

// Types
interface WeekOffConfig {
  id: string;
  day_of_week: number;
  is_off: boolean;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

// Helper to get date range based on filter
const getDateRange = (dateFilter: string) => {
  const now = new Date();
  let startDate, endDate;

  switch (dateFilter) {
    case 'current-week':
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'last-month':
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
      break;
    case 'current-month':
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
  }

  return {
    start: format(startDate, 'yyyy-MM-dd'),
    end: format(endDate, 'yyyy-MM-dd'),
    startDate,
    endDate
  };
};

// Synchronous cache loaders for instant UI display
const getCachedWeekOffSync = (): WeekOffConfig[] => {
  try {
    const cached = localStorage.getItem('week_off_config');
    if (cached) {
      console.log('[WorkingDays] ✅ Instant load week-off config');
      return JSON.parse(cached);
    }
  } catch (e) {}
  // Default: Sunday off
  return [{ id: 'default', day_of_week: 0, is_off: true }];
};

const getCachedHolidaysSync = (start: string, end: string): Holiday[] => {
  try {
    const cacheKey = `holidays_${start}_${end}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      console.log('[WorkingDays] ✅ Instant load holidays');
      return JSON.parse(cached);
    }
  } catch (e) {}
  return [];
};

/**
 * Hook for caching week-off configuration and holidays
 * Uses localStorage for INSTANT synchronous loading
 * These rarely change, so we cache aggressively (6 hours)
 */
export function useWorkingDaysConfig(dateFilter: string = 'current-month') {
  const connectivityStatus = useConnectivity();
  const isOnline = connectivityStatus === 'online';

  const { start, end, startDate, endDate } = getDateRange(dateFilter);

  // INSTANT: Synchronous cache load
  const cachedWeekOffSync = useMemo(() => getCachedWeekOffSync(), []);
  const cachedHolidaysSync = useMemo(() => getCachedHolidaysSync(start, end), [start, end]);

  // Load week-off configuration with instant placeholder
  const {
    data: weekOffConfig = cachedWeekOffSync,
    isLoading: isLoadingWeekOff
  } = useQuery({
    queryKey: ['week-off-config'],
    queryFn: async () => {
      // Check if cache is fresh (less than 6 hours old)
      try {
        const cachedAt = localStorage.getItem('week_off_config_cached_at');
        if (cachedAt) {
          const age = Date.now() - parseInt(cachedAt);
          if (age < 6 * 60 * 60 * 1000) {
            return cachedWeekOffSync;
          }
        }
      } catch (e) {}

      // Fetch from network if online and cache is stale
      if (!isOnline) return cachedWeekOffSync;

      const { data, error } = await supabase
        .from('week_off_config')
        .select('id, day_of_week, is_off');

      if (error) throw error;

      // Cache for future instant loads
      if (data) {
        localStorage.setItem('week_off_config', JSON.stringify(data));
        localStorage.setItem('week_off_config_cached_at', Date.now().toString());
      }

      return data || cachedWeekOffSync;
    },
    placeholderData: cachedWeekOffSync,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Load holidays with instant placeholder
  const {
    data: holidays = cachedHolidaysSync,
    isLoading: isLoadingHolidays
  } = useQuery({
    queryKey: ['holidays', start, end],
    queryFn: async () => {
      const cacheKey = `holidays_${start}_${end}`;
      
      // Check if cache is fresh
      try {
        const cachedAt = localStorage.getItem(`${cacheKey}_cached_at`);
        if (cachedAt) {
          const age = Date.now() - parseInt(cachedAt);
          if (age < 6 * 60 * 60 * 1000) {
            return cachedHolidaysSync;
          }
        }
      } catch (e) {}

      // Fetch from network if online
      if (!isOnline) return cachedHolidaysSync;

      const { data, error } = await supabase
        .from('holidays')
        .select('id, date, name')
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      // Cache for instant loads
      if (data) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_cached_at`, Date.now().toString());
      }

      return data || cachedHolidaysSync;
    },
    placeholderData: cachedHolidaysSync.length > 0 ? cachedHolidaysSync : undefined,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Computed: Set of week-off days (0=Sunday, 1=Monday, etc.)
  const weekOffDays = useMemo(() => {
    const days = new Set<number>();
    weekOffConfig.filter(c => c.is_off).forEach(c => days.add(c.day_of_week));
    // Default to Sunday if no config
    if (days.size === 0) days.add(0);
    return days;
  }, [weekOffConfig]);

  // Computed: Set of holiday dates
  const holidayDates = useMemo(() => {
    return new Set(holidays.map(h => h.date));
  }, [holidays]);

  // Calculate working days stats for the period
  const workingDaysStats = useMemo(() => {
    const now = new Date();
    const currentDate = now.getDate();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let totalWorkingDays = 0;
    let elapsedWorkingDays = 0;
    const elapsedWorkingDates: string[] = [];

    if (dateFilter === 'current-week') {
      // Week view
      const dayOfWeek = now.getDay();
      elapsedWorkingDays = dayOfWeek === 0 ? 6 : dayOfWeek;
      totalWorkingDays = 6;

      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      for (let i = 0; i < 6 && i < dayOfWeek; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = format(date, 'yyyy-MM-dd');
        elapsedWorkingDates.push(dateStr);
      }
    } else {
      // Month view - calculate based on config
      const todayDate = dateFilter === 'current-month' ? currentDate : endDate.getDate();
      const targetYear = dateFilter === 'current-month' ? year : endDate.getFullYear();
      const targetMonth = dateFilter === 'current-month' ? month : endDate.getMonth() + 1;

      // Calculate elapsed working days (from 1st to today or end of period)
      for (let day = 1; day <= todayDate; day++) {
        const date = new Date(targetYear, targetMonth - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = format(date, 'yyyy-MM-dd');

        if (!weekOffDays.has(dayOfWeek) && !holidayDates.has(dateStr)) {
          elapsedWorkingDays++;
          elapsedWorkingDates.push(dateStr);
        }
      }

      // Calculate total working days for the entire month
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(targetYear, targetMonth - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = format(date, 'yyyy-MM-dd');

        if (!weekOffDays.has(dayOfWeek) && !holidayDates.has(dateStr)) {
          totalWorkingDays++;
        }
      }
    }

    return {
      totalWorkingDays,
      elapsedWorkingDays,
      elapsedWorkingDates,
    };
  }, [dateFilter, weekOffDays, holidayDates, startDate, endDate]);

  return {
    // Raw data
    weekOffConfig,
    holidays,
    weekOffDays,
    holidayDates,

    // Computed stats
    totalWorkingDays: workingDaysStats.totalWorkingDays,
    elapsedWorkingDays: workingDaysStats.elapsedWorkingDays,
    elapsedWorkingDates: workingDaysStats.elapsedWorkingDates,

    // Loading state
    isLoading: isLoadingWeekOff || isLoadingHolidays,
  };
}
