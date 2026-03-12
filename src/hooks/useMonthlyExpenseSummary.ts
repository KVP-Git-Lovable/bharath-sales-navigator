import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { fetchExpenseConfigs, resolveExpenseConfig, fetchUserManagerId } from './useResolvedExpenseConfig';

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

export interface DailyBreakdown {
  date: string;
  ta: number;
  da: number;
  additional: number;
  total: number;
  isPresent: boolean;
}

export interface MonthlyExpenseSummary {
  ta: number;
  da: number;
  additionalApproved: number;
  additionalPending: number;
  additionalRejected: number;
  additionalTotal: number;
  total: number;
  orderValue: number;
  presentDays: number;
  weeklyBreakdown: WeeklyBreakdown[];
  dailyBreakdown: DailyBreakdown[];
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

      const [{ globalConfig, userConfigMap, teamConfigMap, userGroupConfigMap }, managerId, attendanceRes, beatPlansRes, beatsRes, additionalRes, ordersRes] = await Promise.all([
        fetchExpenseConfigs(),
        fetchUserManagerId(userId),
        supabase.from('attendance').select('date, status')
          .eq('user_id', userId).gte('date', startStr).lte('date', endStr),
        supabase.from('beat_plans').select('plan_date, beat_id')
          .eq('user_id', userId).gte('plan_date', startStr).lte('plan_date', endStr),
        supabase.from('beats').select('beat_id, travel_allowance, average_km'),
        (supabase as any).from('additional_expenses').select('amount, status, expense_date')
          .eq('user_id', userId).gte('expense_date', startStr).lte('expense_date', endStr),
        supabase.from('orders').select('total_amount')
          .eq('user_id', userId).gte('order_date', startStr).lte('order_date', endStr)
          .eq('status', 'confirmed'),
      ]);

      // Resolve config with hierarchy: User > Group > Manager > Global
      const config = resolveExpenseConfig(userId, managerId, globalConfig, userConfigMap, teamConfigMap, userGroupConfigMap);
      const daAmount = config.da_amount;
      const taType = config.ta_type;
      const fixedTa = config.fixed_ta_amount;
      const taPerKmRate = config.ta_per_km_rate;

      // Build beat TA map - uses per-km rate if configured
      const beatTAMap = new Map<string, number>();
      beatsRes.data?.forEach((b: any) => {
        const km = b.average_km || 0;
        const beatFixedTA = b.travel_allowance || 0;
        const ta = (taPerKmRate > 0 && km > 0) ? (km * taPerKmRate) : beatFixedTA;
        beatTAMap.set(b.beat_id, ta);
      });

      // Present dates
      const presentDates = new Set(
        attendanceRes.data?.filter(a => ['present', 'regularized'].includes(a.status)).map(a => a.date) || []
      );
      const presentDays = presentDates.size;

      // DA total
      const da = presentDays * daAmount;

      // TA calculation per day - sums all beats planned for each day
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
      const dailyBreakdown: DailyBreakdown[] = [];
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
        
        const dayTA = dailyTA.get(dateStr) || 0;
        const isPresent = presentDates.has(dateStr);
        const dayDA = isPresent ? daAmount : 0;
        const dayAdditional = additional
          .filter((e: any) => e.expense_date === dateStr && ['manager_approved', 'paid'].includes(e.status))
          .reduce((s: number, e: any) => s + (e.amount || 0), 0);

        week.ta += dayTA;
        week.da += dayDA;
        week.additional += dayAdditional;

        dailyBreakdown.push({
          date: dateStr,
          ta: dayTA,
          da: dayDA,
          additional: dayAdditional,
          total: dayTA + dayDA + dayAdditional,
          isPresent,
        });
      }

      // Calculate weekly totals
      weeklyMap.forEach(w => w.total = w.ta + w.da + w.additional);

      const orderValue = (ordersRes.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

      return {
        ta,
        da,
        additionalApproved,
        additionalPending,
        additionalRejected,
        additionalTotal,
        total: ta + da + additionalApproved,
        orderValue,
        presentDays,
        weeklyBreakdown: Array.from(weeklyMap.values()),
        dailyBreakdown,
      };
    },
    enabled: !!userId && !!yearMonth,
    staleTime: 2 * 60 * 1000,
  });
};
