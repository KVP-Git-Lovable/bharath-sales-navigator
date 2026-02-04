import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from 'date-fns';

export type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type TargetBasis = 'quantity' | 'revenue';

export interface TeamMemberProgress {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  target: number;
  actual: number;
  achievementPercentage: number;
  gap: number;
  status: 'achieved' | 'in_progress' | 'not_achieved';
  adjustments?: {
    holidays: number;
    leaves: number;
    workingDays: number;
    totalDays: number;
  };
}

interface UseTeamTargetProgressParams {
  userIds: string[];
  periodType: PeriodType;
  date: Date;
  basis: TargetBasis;
}

// Helper to get current FY year (April to March)
const getCurrentFYYear = (date: Date): number => {
  const month = date.getMonth();
  const year = date.getFullYear();
  // If we're in Jan-March, FY is current year, else FY is next year
  return month < 3 ? year : year + 1;
};

// Get FY month number (1-12 starting from April)
const getFYMonthNumber = (date: Date): number => {
  const month = date.getMonth(); // 0-11
  // April=0->1, May=1->2, ..., March=11->12
  return month >= 3 ? month - 2 : month + 10;
};

// Get working days in a month (6-day work week, excluding Sundays)
const getWorkingDaysInMonth = (date: Date): number => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let sundays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() === 0) sundays++;
  }
  
  return daysInMonth - sundays;
};

export const useTeamTargetProgress = ({ userIds, periodType, date, basis }: UseTeamTargetProgressParams) => {
  return useQuery({
    queryKey: ['team-target-progress', userIds, periodType, format(date, 'yyyy-MM-dd'), basis],
    queryFn: async (): Promise<TeamMemberProgress[]> => {
      if (!userIds.length) return [];

      // Calculate date range based on period type
      let startDate: Date;
      let endDate: Date;

      switch (periodType) {
        case 'day':
          startDate = startOfDay(date);
          endDate = endOfDay(date);
          break;
        case 'week':
          startDate = startOfWeek(date, { weekStartsOn: 1 });
          endDate = endOfWeek(date, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(date);
          endDate = endOfMonth(date);
          break;
        case 'quarter':
          startDate = startOfQuarter(date);
          endDate = endOfQuarter(date);
          break;
        case 'year':
          startDate = startOfYear(date);
          endDate = endOfYear(date);
          break;
      }

      const fyYear = getCurrentFYYear(date);
      const fyMonthNumber = getFYMonthNumber(date);

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .in('id', userIds);

      // Fetch business plans for all users
      const { data: plans } = await supabase
        .from('user_business_plans')
        .select('id, user_id, quantity_target, revenue_target, year')
        .in('user_id', userIds)
        .eq('year', fyYear);

      // Fetch monthly targets for all users
      const planIds = plans?.map(p => p.id) || [];
      const { data: monthlyTargets } = planIds.length > 0 
        ? await supabase
            .from('user_business_plan_months')
            .select('*')
            .in('business_plan_id', planIds)
        : { data: [] };

      // Fetch actual orders for the period
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          total_amount,
          created_at,
          order_items(quantity, unit)
        `)
        .in('user_id', userIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Build progress data for each user
      const progressData: TeamMemberProgress[] = userIds.map(userId => {
        const profile = profiles?.find(p => p.id === userId);
        const plan = plans?.find(p => p.user_id === userId);
        
        // Calculate target based on period
        let target = 0;
        const monthTarget = monthlyTargets?.find(
          m => m.business_plan_id === plan?.id && m.month_number === fyMonthNumber
        );
        
        if (plan) {
          const yearlyTarget = basis === 'revenue' ? plan.revenue_target : plan.quantity_target;
          
          if (periodType === 'year') {
            target = yearlyTarget || 0;
          } else if (periodType === 'month') {
            target = monthTarget 
              ? (basis === 'revenue' ? monthTarget.target_revenue : monthTarget.quantity_target) || 0
              : (yearlyTarget || 0) / 12;
          } else if (periodType === 'quarter') {
            target = (yearlyTarget || 0) / 4;
          } else if (periodType === 'week') {
            const monthlyTargetValue = monthTarget 
              ? (basis === 'revenue' ? monthTarget.target_revenue : monthTarget.quantity_target) || 0
              : (yearlyTarget || 0) / 12;
            // Use 4.33 weeks per month for more accurate calculation
            target = monthlyTargetValue / 4.33;
          } else if (periodType === 'day') {
            const monthlyTargetValue = monthTarget 
              ? (basis === 'revenue' ? monthTarget.target_revenue : monthTarget.quantity_target) || 0
              : (yearlyTarget || 0) / 12;
            // Use stored working_days from business plan, fallback to computed
            const workingDays = (monthTarget as any)?.working_days || getWorkingDaysInMonth(date);
            target = monthlyTargetValue / workingDays;
          }
        }

        // Calculate actual
        const userOrders = orders?.filter(o => o.user_id === userId) || [];
        let actual = 0;
        
        if (basis === 'revenue') {
          actual = userOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        } else {
          // Convert gram-based units to KG for quantity basis
          actual = userOrders.reduce((sum, o) => {
            const orderQty = (o.order_items as any[])?.reduce((qSum: number, item: any) => {
              const qty = item.quantity || 0;
              const unit = (item.unit || '').toLowerCase();
              // Convert grams to KG
              if (unit === 'grams' || unit === 'gram' || unit === 'g') {
                return qSum + (qty / 1000);
              }
              return qSum + qty;
            }, 0) || 0;
            return sum + orderQty;
          }, 0);
        }

        // Calculate achievement
        const achievementPercentage = target > 0 ? (actual / target) * 100 : 0;
        const gap = actual - target;

        // Determine status
        let status: 'achieved' | 'in_progress' | 'not_achieved';
        if (achievementPercentage >= 100) {
          status = 'achieved';
        } else if (achievementPercentage >= 50) {
          status = 'in_progress';
        } else {
          status = 'not_achieved';
        }

        return {
          userId,
          fullName: (profile as any)?.full_name || 'Unknown User',
          avatarUrl: (profile as any)?.profile_picture_url || null,
          target,
          actual,
          achievementPercentage,
          gap,
          status,
        };
      });

      return progressData;
    },
    enabled: userIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
};
