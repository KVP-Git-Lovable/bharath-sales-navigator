import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay } from 'date-fns';

export interface WorkingDaysResult {
  totalDaysInMonth: number;
  sundays: number;
  holidays: number;
  approvedLeaves: number;
  effectiveWorkingDays: number;
  holidayDates: string[];
  leaveDates: string[];
}

export interface MonthlyWorkingDays {
  [monthKey: string]: WorkingDaysResult;
}

// Calculate working days for a specific month and user
export function useWorkingDaysCalculator(
  userId: string | undefined,
  year: number,
  month: number // 0-indexed (0 = January)
) {
  return useQuery({
    queryKey: ['working-days', userId, year, month],
    queryFn: async (): Promise<WorkingDaysResult> => {
      const startDate = startOfMonth(new Date(year, month));
      const endDate = endOfMonth(new Date(year, month));
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // Get all days in the month
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      const totalDaysInMonth = allDays.length;

      // Count Sundays
      const sundays = allDays.filter(day => getDay(day) === 0).length;

      // Fetch holidays for this month
      const { data: holidays } = await supabase
        .from('holidays')
        .select('date')
        .gte('date', startStr)
        .lte('date', endStr);

      const holidayDates = holidays?.map(h => h.date) || [];
      
      // Filter out holidays that fall on Sundays to avoid double counting
      const nonSundayHolidays = holidayDates.filter(date => {
        const d = new Date(date);
        return getDay(d) !== 0;
      });

      // Fetch approved leaves for this user in this month
      let leaveDates: string[] = [];
      if (userId) {
        const { data: leaves } = await supabase
          .from('leave_applications')
          .select('start_date, end_date')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .or(`start_date.lte.${endStr},end_date.gte.${startStr}`);

        if (leaves) {
          leaves.forEach(leave => {
            const leaveStart = new Date(Math.max(new Date(leave.start_date).getTime(), startDate.getTime()));
            const leaveEnd = new Date(Math.min(new Date(leave.end_date).getTime(), endDate.getTime()));
            const leaveDays = eachDayOfInterval({ start: leaveStart, end: leaveEnd });
            leaveDays.forEach(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              // Don't count leaves on Sundays or holidays
              if (getDay(day) !== 0 && !holidayDates.includes(dayStr)) {
                leaveDates.push(dayStr);
              }
            });
          });
        }
      }

      // Remove duplicates
      leaveDates = [...new Set(leaveDates)];

      const effectiveWorkingDays = totalDaysInMonth - sundays - nonSundayHolidays.length - leaveDates.length;

      return {
        totalDaysInMonth,
        sundays,
        holidays: nonSundayHolidays.length,
        approvedLeaves: leaveDates.length,
        effectiveWorkingDays: Math.max(0, effectiveWorkingDays),
        holidayDates: nonSundayHolidays,
        leaveDates,
      };
    },
    enabled: !!year,
  });
}

// Calculate working days for an entire FY (April to March)
export function useFYWorkingDays(userId: string | undefined, fyYear: number) {
  return useQuery({
    queryKey: ['fy-working-days', userId, fyYear],
    queryFn: async (): Promise<MonthlyWorkingDays> => {
      const results: MonthlyWorkingDays = {};
      
      // FY months: April (prev year) to March (fy year)
      // FY 2025 = April 2024 to March 2025
      const fyMonths = [
        { month: 3, year: fyYear - 1 },  // April
        { month: 4, year: fyYear - 1 },  // May
        { month: 5, year: fyYear - 1 },  // June
        { month: 6, year: fyYear - 1 },  // July
        { month: 7, year: fyYear - 1 },  // August
        { month: 8, year: fyYear - 1 },  // September
        { month: 9, year: fyYear - 1 },  // October
        { month: 10, year: fyYear - 1 }, // November
        { month: 11, year: fyYear - 1 }, // December
        { month: 0, year: fyYear },      // January
        { month: 1, year: fyYear },      // February
        { month: 2, year: fyYear },      // March
      ];

      const startDate = `${fyYear - 1}-04-01`;
      const endDate = `${fyYear}-03-31`;

      // Fetch all holidays for the FY
      const { data: holidays } = await supabase
        .from('holidays')
        .select('date')
        .gte('date', startDate)
        .lte('date', endDate);

      const holidayDates = holidays?.map(h => h.date) || [];

      // Fetch all approved leaves for this user in this FY
      let allLeaveDates: string[] = [];
      if (userId) {
        const { data: leaves } = await supabase
          .from('leave_applications')
          .select('start_date, end_date')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

        if (leaves) {
          leaves.forEach(leave => {
            const leaveStart = new Date(leave.start_date);
            const leaveEnd = new Date(leave.end_date);
            const leaveDays = eachDayOfInterval({ start: leaveStart, end: leaveEnd });
            leaveDays.forEach(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              if (getDay(day) !== 0 && !holidayDates.includes(dayStr)) {
                allLeaveDates.push(dayStr);
              }
            });
          });
        }
      }
      allLeaveDates = [...new Set(allLeaveDates)];

      // Calculate for each month
      fyMonths.forEach(({ month, year }, index) => {
        const monthStart = startOfMonth(new Date(year, month));
        const monthEnd = endOfMonth(new Date(year, month));
        const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const totalDaysInMonth = allDays.length;
        const sundays = allDays.filter(day => getDay(day) === 0).length;

        const monthHolidays = holidayDates.filter(date => {
          const d = new Date(date);
          return d.getMonth() === month && d.getFullYear() === year && getDay(d) !== 0;
        });

        const monthLeaves = allLeaveDates.filter(date => {
          const d = new Date(date);
          return d.getMonth() === month && d.getFullYear() === year;
        });

        const effectiveWorkingDays = totalDaysInMonth - sundays - monthHolidays.length - monthLeaves.length;

        const monthKey = `${index + 1}`; // FY month number (1-12)
        results[monthKey] = {
          totalDaysInMonth,
          sundays,
          holidays: monthHolidays.length,
          approvedLeaves: monthLeaves.length,
          effectiveWorkingDays: Math.max(0, effectiveWorkingDays),
          holidayDates: monthHolidays,
          leaveDates: monthLeaves,
        };
      });

      return results;
    },
    enabled: !!fyYear,
  });
}
