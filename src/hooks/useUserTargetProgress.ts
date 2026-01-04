import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters, getMonth, getYear, getDaysInMonth, getDay } from 'date-fns';

export type TargetPeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'last_week' | 'last_month' | 'last_quarter';
export type TargetBasis = 'revenue' | 'quantity';

interface MonthTarget {
  monthNumber: number;
  quantityTarget: number;
  revenueTarget: number;
  workingDays: number;
}

interface UserTargetProgress {
  target: number;
  actual: number;
  progress: number;
  gap: number;
  unit: string;
  isLoading: boolean;
}

// FY months mapping (April = 1, March = 12)
const FY_MONTHS = [
  { number: 1, name: 'April', calendarMonth: 3 },
  { number: 2, name: 'May', calendarMonth: 4 },
  { number: 3, name: 'June', calendarMonth: 5 },
  { number: 4, name: 'July', calendarMonth: 6 },
  { number: 5, name: 'August', calendarMonth: 7 },
  { number: 6, name: 'September', calendarMonth: 8 },
  { number: 7, name: 'October', calendarMonth: 9 },
  { number: 8, name: 'November', calendarMonth: 10 },
  { number: 9, name: 'December', calendarMonth: 11 },
  { number: 10, name: 'January', calendarMonth: 0 },
  { number: 11, name: 'February', calendarMonth: 1 },
  { number: 12, name: 'March', calendarMonth: 2 },
];

// Calculate working days for a month (6-day work week, excluding Sundays)
const getWorkingDaysInMonth = (calendarMonth: number, calendarYear: number): number => {
  const daysInMonth = getDaysInMonth(new Date(calendarYear, calendarMonth, 1));
  
  let sundays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(calendarYear, calendarMonth, day);
    if (getDay(date) === 0) sundays++;
  }
  
  return daysInMonth - sundays;
};

// Get FY year from a date (April-March fiscal year)
const getFYYear = (date: Date): number => {
  const month = getMonth(date);
  const year = getYear(date);
  // If month is Jan-Mar (0-2), FY is current year, otherwise FY is next year
  return month < 3 ? year : year + 1;
};

// Get FY month number from calendar month (April = 1, March = 12)
const getFYMonthNumber = (calendarMonth: number): number => {
  const monthInfo = FY_MONTHS.find(m => m.calendarMonth === calendarMonth);
  return monthInfo?.number || 1;
};

export function useUserTargetProgress(
  userId: string | undefined,
  period: TargetPeriod,
  basis: TargetBasis
): UserTargetProgress {
  const [target, setTarget] = useState(0);
  const [actual, setActual] = useState(0);
  const [unit, setUnit] = useState('Units');
  const [isLoading, setIsLoading] = useState(true);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'this_week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'last_week':
        const lastWeekDate = subWeeks(now, 1);
        return { start: startOfWeek(lastWeekDate, { weekStartsOn: 1 }), end: endOfWeek(lastWeekDate, { weekStartsOn: 1 }) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonthDate = subMonths(now, 1);
        return { start: startOfMonth(lastMonthDate), end: endOfMonth(lastMonthDate) };
      case 'this_quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'last_quarter':
        const lastQuarterDate = subQuarters(now, 1);
        return { start: startOfQuarter(lastQuarterDate), end: endOfQuarter(lastQuarterDate) };
      case 'this_year':
        // FY year: April to March
        const fyYear = getFYYear(now);
        const fyStart = new Date(fyYear - 1, 3, 1); // April 1 of previous calendar year
        const fyEnd = new Date(fyYear, 2, 31, 23, 59, 59); // March 31 of FY year
        return { start: fyStart, end: fyEnd };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  }, [period]);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const now = new Date();
        const fyYear = getFYYear(now);
        const currentCalendarMonth = getMonth(now);
        const currentCalendarYear = getYear(now);
        const currentFYMonthNumber = getFYMonthNumber(currentCalendarMonth);

        // Fetch the user's business plan for current FY
        const { data: planData } = await supabase
          .from('user_business_plans')
          .select('id, quantity_target, quantity_unit, revenue_target')
          .eq('user_id', userId)
          .eq('year', fyYear)
          .single();

        if (!planData) {
          setTarget(0);
          setUnit('Units');
        } else {
          setUnit(planData.quantity_unit || 'Units');

        // Get monthly targets
        const { data: monthData } = await supabase
          .from('user_business_plan_months')
          .select('month_number, quantity_target, revenue_target')
          .eq('business_plan_id', planData.id);

          let calculatedTarget = 0;

          if (period === 'today' || period === 'yesterday') {
            // Get daily average from current month
            const targetMonth = period === 'yesterday' 
              ? getFYMonthNumber(getMonth(subDays(now, 1)))
              : currentFYMonthNumber;
            
            const targetDate = period === 'yesterday' ? subDays(now, 1) : now;
            const targetCalendarMonth = getMonth(targetDate);
            const targetCalendarYear = getYear(targetDate);
            
            const monthTarget = monthData?.find(m => m.month_number === targetMonth);
            const workingDays = getWorkingDaysInMonth(targetCalendarMonth, targetCalendarYear);
            
            if (monthTarget && workingDays > 0) {
              if (basis === 'revenue') {
                calculatedTarget = (monthTarget.revenue_target || 0) / workingDays;
              } else {
                calculatedTarget = (monthTarget.quantity_target || 0) / workingDays;
              }
            }
          } else if (period === 'this_week' || period === 'last_week') {
            // Weekly target = monthly target / 4 (approximate weeks per month)
            // For last_week, use the month of last week's start
            const targetDate = period === 'last_week' ? subWeeks(now, 1) : now;
            const targetFYMonthNumber = getFYMonthNumber(getMonth(targetDate));
            const monthTarget = monthData?.find(m => m.month_number === targetFYMonthNumber);
            if (monthTarget) {
              if (basis === 'revenue') {
                calculatedTarget = (monthTarget.revenue_target || 0) / 4;
              } else {
                calculatedTarget = (monthTarget.quantity_target || 0) / 4;
              }
            }
          } else if (period === 'this_month' || period === 'last_month') {
            const targetDate = period === 'last_month' ? subMonths(now, 1) : now;
            const targetFYMonthNumber = getFYMonthNumber(getMonth(targetDate));
            const monthTarget = monthData?.find(m => m.month_number === targetFYMonthNumber);
            if (monthTarget) {
              calculatedTarget = basis === 'revenue' 
                ? (monthTarget.revenue_target || 0)
                : (monthTarget.quantity_target || 0);
            }
          } else if (period === 'this_quarter' || period === 'last_quarter') {
            // Get quarter's months (FY quarters: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar)
            const targetDate = period === 'last_quarter' ? subQuarters(now, 1) : now;
            const targetFYMonthNumber = getFYMonthNumber(getMonth(targetDate));
            const quarterStart = targetFYMonthNumber <= 3 ? 1 : 
                                 targetFYMonthNumber <= 6 ? 4 :
                                 targetFYMonthNumber <= 9 ? 7 : 10;
            const quarterMonths = [quarterStart, quarterStart + 1, quarterStart + 2];
            
            const quarterTargets = monthData?.filter(m => quarterMonths.includes(m.month_number)) || [];
            if (basis === 'revenue') {
              calculatedTarget = quarterTargets.reduce((sum, m) => sum + (m.revenue_target || 0), 0);
            } else {
              calculatedTarget = quarterTargets.reduce((sum, m) => sum + (m.quantity_target || 0), 0);
            }
          } else if (period === 'this_year') {
            calculatedTarget = basis === 'revenue' 
              ? (planData.revenue_target || 0)
              : (planData.quantity_target || 0);
          }

          setTarget(calculatedTarget);
        }

        // Fetch actual performance from orders
        const startStr = dateRange.start.toISOString();
        const endStr = dateRange.end.toISOString();

        if (basis === 'revenue') {
          // Get total revenue from orders
          const { data: ordersData } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('user_id', userId)
            .gte('created_at', startStr)
            .lte('created_at', endStr);

          const totalRevenue = ordersData?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;
          setActual(totalRevenue);
        } else {
          // Get total quantity from order_items
          const { data: ordersData } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', userId)
            .gte('created_at', startStr)
            .lte('created_at', endStr);

          if (ordersData && ordersData.length > 0) {
            const orderIds = ordersData.map(o => o.id);
            const { data: itemsData } = await supabase
              .from('order_items')
              .select('quantity')
              .in('order_id', orderIds);

            const totalQuantity = itemsData?.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) || 0;
            setActual(totalQuantity);
          } else {
            setActual(0);
          }
        }
      } catch (error) {
        console.error('Error fetching target progress:', error);
        setTarget(0);
        setActual(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, period, basis, dateRange.start.toISOString(), dateRange.end.toISOString()]);

  const progress = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;
  const gap = Math.max(target - actual, 0);

  return {
    target,
    actual,
    progress,
    gap,
    unit,
    isLoading
  };
}
