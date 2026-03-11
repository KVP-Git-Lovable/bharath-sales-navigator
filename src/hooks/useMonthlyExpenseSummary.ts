import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, getWeek } from 'date-fns';

export interface WeeklyBreakdown {
  weekLabel: string;
  weekNumber: number;
  ta: number;
  da: number;
  additional: number;
  total: number;
  startDate: string;
  endDate: string;
}

export interface MonthlyExpenseSummary {
  ta: number;
  da: number;
  additionalApproved: number;
  additionalPending: number;
  additionalRejected: number;
  additionalTotal: number;
  total: number;
  presentDays: number;
  weeklyBreakdown: WeeklyBreakdown[];
}

export const useMonthlyExpenseSummary = (userId: string | undefined, yearMonth: string) => {
  return useQuery({
    queryKey: ['monthly-expense-summary', userId, yearMonth],
    queryFn: async (): Promise<MonthlyExpenseSummary> => {
      if (!userId) throw new Error('No user');

      const [year, month] = yearMonth.split('-').map(Number);
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(start);
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const [attendanceRes, configRes, beatPlansRes, beatsRes, additionalRes] = await Promise.all([
        supabase.from('attendance').select('date, status')
          .eq('user_id', userId).gte('date', startStr).lte('date', endStr),
        supabase.from('expense_master_config').select('*').single(),
        supabase.from('beat_plans').select('plan_date, beat_id')
          .eq('user_id', userId).gte('plan_date', startStr).lte('plan_date', endStr),
        supabase.from('beats').select('beat_id, travel_allowance'),
        (supabase as any).from('additional_expenses').select('amount, status, expense_date')
          .eq('user_id', userId).gte('expense_date', startStr).lte('expense_date', endStr),
      ]);

      const config = configRes.data;
      const daAmount = config?.da_amount || 0;
      const taType = config?.ta_type || 'from_beat';
      const fixedTa = config?.fixed_ta_amount || 0;

      // Build beat TA map
      const beatTAMap = new Map<string, number>();
      beatsRes.data?.forEach((b: any) => beatTAMap.set(b.beat_id, b.travel_allowance || 0));

      // Present dates
      const presentDates = new Set(
        attendanceRes.data?.filter(a => ['present', 'regularized'].includes(a.status)).map(a => a.date) || []
      );
      const presentDays = presentDates.size;

      // DA total
      const da = presentDays * daAmount;

      // TA calculation per day (for weekly grouping)
      const dailyTA = new Map<string, number>();
      if (taType === 'fixed') {
        presentDates.forEach(d => dailyTA.set(d, fixedTa));
      } else {
        beatPlansRes.data?.forEach((plan: any) => {
          if (presentDates.has(plan.plan_date)) {
            const current = dailyTA.get(plan.plan_date) || 0;
            dailyTA.set(plan.plan_date, current + (beatTAMap.get(plan.beat_id) || 0));
          }
        });
      }

      let ta = 0;
      dailyTA.forEach(v => ta += v);

      // Additional expenses
      const additional = additionalRes.data || [];
      const additionalApproved = additional
        .filter((e: any) => ['manager_approved', 'paid'].includes(e.status))
        .reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const additionalPending = additional
        .filter((e: any) => ['submitted', 'draft'].includes(e.status))
        .reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const additionalRejected = additional
        .filter((e: any) => e.status === 'rejected')
        .reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const additionalTotal = additional.reduce((s: number, e: any) => s + (e.amount || 0), 0);

      // Weekly breakdown (week 1 = days 1-7, week 2 = 8-14, etc.)
      const weeklyMap = new Map<number, WeeklyBreakdown>();
      const daysInMonth = end.getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const weekNum = Math.ceil(day / 7);
        const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
        
        if (!weeklyMap.has(weekNum)) {
          const weekStart = day;
          const weekEnd = Math.min(day + 6, daysInMonth);
          weeklyMap.set(weekNum, {
            weekLabel: `Week ${weekNum}`,
            weekNumber: weekNum,
            ta: 0, da: 0, additional: 0, total: 0,
            startDate: `${yearMonth}-${String(weekStart).padStart(2, '0')}`,
            endDate: `${yearMonth}-${String(weekEnd).padStart(2, '0')}`,
          });
        }

        const week = weeklyMap.get(weekNum)!;
        
        // TA for this day
        week.ta += dailyTA.get(dateStr) || 0;
        
        // DA for this day
        if (presentDates.has(dateStr)) {
          week.da += daAmount;
        }
        
        // Additional expenses for this day (approved only)
        const dayAdditional = additional
          .filter((e: any) => e.expense_date === dateStr && ['manager_approved', 'paid'].includes(e.status))
          .reduce((s: number, e: any) => s + (e.amount || 0), 0);
        week.additional += dayAdditional;
      }

      // Calculate weekly totals
      weeklyMap.forEach(w => w.total = w.ta + w.da + w.additional);

      return {
        ta,
        da,
        additionalApproved,
        additionalPending,
        additionalRejected,
        additionalTotal,
        total: ta + da + additionalApproved,
        presentDays,
        weeklyBreakdown: Array.from(weeklyMap.values()),
      };
    },
    enabled: !!userId && !!yearMonth,
    staleTime: 2 * 60 * 1000,
  });
};
