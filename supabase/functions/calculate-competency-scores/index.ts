import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompetencyScore {
  competency_template_id: string;
  score: number;
  raw_metrics: Record<string, any>;
  trend: string;
  previous_month_score: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, monthYear, roleType = 'field_executive' } = await req.json();
    
    if (!userId || !monthYear) {
      throw new Error("userId and monthYear are required");
    }

    console.log(`Calculating competency scores for user ${userId}, month ${monthYear}, role ${roleType}`);

    // Parse the month_year date
    const targetDate = new Date(monthYear);
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
    const previousMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    const previousMonthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0, 23, 59, 59);
    const previousMonthStr = previousMonthStart.toISOString().split('T')[0];

    // Fetch competency templates for the role
    const { data: templates, error: templatesError } = await supabase
      .from('competency_templates')
      .select('*')
      .eq('role_type', roleType)
      .eq('is_active', true)
      .order('sort_order');

    if (templatesError) throw templatesError;
    if (!templates || templates.length === 0) {
      throw new Error(`No competency templates found for role: ${roleType}`);
    }

    // Fetch previous month scores for trend calculation
    const { data: previousScores } = await supabase
      .from('user_competency_monthly_scores')
      .select('competency_template_id, score')
      .eq('user_id', userId)
      .eq('month_year', previousMonthStr);

    const previousScoreMap = new Map(
      (previousScores || []).map(s => [s.competency_template_id, s.score])
    );

    // Fetch all required data for calculations
    const [visitsResult, ordersResult, beatPlansResult, retailersResult, targetsResult, attendanceResult] = await Promise.all([
      // Visits data - includes retailer for beat linkage
      supabase
        .from('visits')
        .select('id, retailer_id, check_in_time, check_out_time, check_in_photo_url, status, planned_date, created_at')
        .eq('user_id', userId)
        .gte('planned_date', monthStart.toISOString().split('T')[0])
        .lte('planned_date', monthEnd.toISOString().split('T')[0]),
      
      // Orders data - includes credit/payment fields
      supabase
        .from('orders')
        .select('id, visit_id, total_amount, status, created_at, retailer_id, is_credit_order, credit_pending_amount, credit_paid_amount, order_date')
        .eq('user_id', userId)
        .gte('order_date', monthStart.toISOString().split('T')[0])
        .lte('order_date', monthEnd.toISOString().split('T')[0]),
      
      // Beat plans data
      supabase
        .from('beat_plans')
        .select('id, beat_id, beat_name, plan_date')
        .eq('user_id', userId)
        .gte('plan_date', monthStart.toISOString().split('T')[0])
        .lte('plan_date', monthEnd.toISOString().split('T')[0]),
      
      // Retailers data - use user_id not created_by
      supabase
        .from('retailers')
        .select('id, created_at, beat_id, user_id, status')
        .eq('user_id', userId),
      
      // User targets
      supabase
        .from('user_period_targets')
        .select('*, target_kpi_definitions(*)')
        .eq('user_id', userId)
        .eq('period_type', 'month')
        .gte('period_start', monthStart.toISOString().split('T')[0])
        .lte('period_end', monthEnd.toISOString().split('T')[0]),
      
      // Attendance data for discipline calculation
      supabase
        .from('attendance')
        .select('id, date, check_in_time, check_out_time, check_in_photo_url, status, total_hours')
        .eq('user_id', userId)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])
    ]);

    const visits = visitsResult.data || [];
    const orders = ordersResult.data || [];
    const beatPlans = beatPlansResult.data || [];
    const retailers = retailersResult.data || [];
    const targets = targetsResult.data || [];
    const attendance = attendanceResult.data || [];

    // Create retailer to beat mapping for territory coverage
    const retailerBeatMap = new Map(retailers.map(r => [r.id, r.beat_id]));

    console.log(`Data fetched: ${visits.length} visits, ${orders.length} orders, ${beatPlans.length} beat plans, ${retailers.length} retailers, ${attendance.length} attendance`);

    // For manager competencies, fetch subordinates
    let subordinates: string[] = [];
    let subordinateData: any = {};
    
    if (roleType === 'field_manager') {
      const { data: subData } = await supabase.rpc('get_subordinate_users', { user_id_param: userId });
      subordinates = (subData || []).map((s: any) => s.subordinate_user_id);
      console.log(`Found ${subordinates.length} subordinates for manager`);
      
      if (subordinates.length > 0) {
        // Fetch subordinate performance data for the month
        const [subVisits, subOrders, subScorecards, subCoachingNotes] = await Promise.all([
          supabase
            .from('visits')
            .select('id, user_id, status, check_in_time, planned_date')
            .in('user_id', subordinates)
            .gte('planned_date', monthStart.toISOString().split('T')[0])
            .lte('planned_date', monthEnd.toISOString().split('T')[0]),
          
          supabase
            .from('orders')
            .select('id, user_id, total_amount, status, order_date')
            .in('user_id', subordinates)
            .gte('order_date', monthStart.toISOString().split('T')[0])
            .lte('order_date', monthEnd.toISOString().split('T')[0]),
          
          supabase
            .from('user_monthly_scorecards')
            .select('user_id, overall_score, performance_band, month_year')
            .in('user_id', subordinates)
            .eq('month_year', monthStart.toISOString().split('T')[0]),
          
          supabase
            .from('competency_coaching_notes')
            .select('id, user_id, manager_id, created_at, is_acknowledged')
            .eq('manager_id', userId)
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString())
        ]);
        
        subordinateData = {
          visits: subVisits.data || [],
          orders: subOrders.data || [],
          scorecards: subScorecards.data || [],
          coachingNotes: subCoachingNotes.data || []
        };
      }
    }

    // Calculate scores for each competency
    const scores: CompetencyScore[] = [];

    for (const template of templates) {
      let score = 0;
      let rawMetrics: Record<string, any> = {};

      switch (template.competency_code) {
        case 'FSE_TERRITORY_COVERAGE': {
          // Get unique planned beats from beat plans
          const plannedBeats = new Set(beatPlans.map(bp => bp.beat_id));
          
          // Get visited beats by linking visits -> retailer -> beat
          const visitedBeats = new Set<string>();
          visits.filter(v => v.check_in_time && v.retailer_id).forEach(v => {
            const beatId = retailerBeatMap.get(v.retailer_id);
            if (beatId) visitedBeats.add(beatId);
          });
          
          const coverageRate = plannedBeats.size > 0 
            ? (visitedBeats.size / plannedBeats.size) * 100 
            : 0;
          
          score = Math.min(100, coverageRate);
          rawMetrics = {
            beats_planned: plannedBeats.size,
            beats_visited: visitedBeats.size,
            coverage_rate: coverageRate.toFixed(1)
          };
          break;
        }

        case 'FSE_PRODUCTIVITY': {
          const completedVisits = visits.filter(v => v.status === 'productive' || v.status === 'unproductive');
          const productiveVisits = visits.filter(v => v.status === 'productive');
          const productivityRate = completedVisits.length > 0 
            ? (productiveVisits.length / completedVisits.length) * 100 
            : 0;
          
          score = Math.min(100, productivityRate);
          rawMetrics = {
            total_visits: completedVisits.length,
            productive_visits: productiveVisits.length,
            unproductive_visits: completedVisits.length - productiveVisits.length,
            productivity_rate: productivityRate.toFixed(1)
          };
          break;
        }

        case 'FSE_REVENUE': {
          const actualRevenue = orders
            .filter(o => o.status === 'confirmed' || o.status === 'delivered')
            .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
          
          // Find revenue target from user_period_targets
          const revenueTarget = targets.find(t => 
            t.target_kpi_definitions?.kpi_key === 'revenue_contribution'
          );
          const targetValue = revenueTarget?.target_value || 100000;
          const achievementRate = targetValue > 0 ? (actualRevenue / targetValue) * 100 : 0;
          
          score = Math.min(100, achievementRate);
          rawMetrics = {
            target_revenue: targetValue,
            actual_revenue: actualRevenue,
            achievement_rate: achievementRate.toFixed(1),
            confirmed_orders: orders.filter(o => o.status === 'confirmed' || o.status === 'delivered').length
          };
          break;
        }

        case 'FSE_DISCIPLINE': {
          // Combine attendance and visit discipline metrics
          const totalAttendanceDays = attendance.length;
          const onTimeCheckIns = attendance.filter(a => {
            if (!a.check_in_time) return false;
            const checkInHour = new Date(a.check_in_time).getHours();
            return checkInHour <= 9; // On time if checked in by 9 AM
          }).length;
          
          const attendanceWithPhotos = attendance.filter(a => a.check_in_photo_url).length;
          const visitsWithPhotos = visits.filter(v => v.check_in_photo_url).length;
          const visitsWithCheckout = visits.filter(v => v.check_out_time).length;
          const totalVisitsWithCheckin = visits.filter(v => v.check_in_time).length;
          
          // Calculate metrics
          const onTimeRate = totalAttendanceDays > 0 
            ? (onTimeCheckIns / totalAttendanceDays) * 100 
            : 0;
          const attendancePhotoRate = totalAttendanceDays > 0 
            ? (attendanceWithPhotos / totalAttendanceDays) * 100 
            : 0;
          const visitPhotoRate = totalVisitsWithCheckin > 0 
            ? (visitsWithPhotos / totalVisitsWithCheckin) * 100 
            : 0;
          const checkoutRate = totalVisitsWithCheckin > 0 
            ? (visitsWithCheckout / totalVisitsWithCheckin) * 100 
            : 0;
          
          // Calculate average visit duration
          let avgDuration = 0;
          const visitsWithBothTimes = visits.filter(v => v.check_in_time && v.check_out_time);
          if (visitsWithBothTimes.length > 0) {
            const totalDuration = visitsWithBothTimes.reduce((sum, v) => {
              const duration = new Date(v.check_out_time!).getTime() - new Date(v.check_in_time!).getTime();
              return sum + (duration / (1000 * 60)); // in minutes
            }, 0);
            avgDuration = totalDuration / visitsWithBothTimes.length;
          }
          
          // Duration score: 15-45 min per visit is ideal
          const durationScore = avgDuration >= 15 && avgDuration <= 45 ? 100 : 
                               avgDuration > 0 ? Math.max(0, 100 - Math.abs(avgDuration - 30) * 2) : 0;
          
          // Weighted score combining all discipline factors
          score = (onTimeRate * 0.25 + visitPhotoRate * 0.25 + checkoutRate * 0.25 + durationScore * 0.25);
          rawMetrics = {
            attendance_days: totalAttendanceDays,
            on_time_checkins: onTimeCheckIns,
            on_time_rate: onTimeRate.toFixed(1),
            visit_photo_rate: visitPhotoRate.toFixed(1),
            checkout_rate: checkoutRate.toFixed(1),
            avg_visit_duration: avgDuration.toFixed(1),
            duration_score: durationScore.toFixed(1)
          };
          break;
        }

        case 'FSE_RETAILER_DEV': {
          // New retailers added this month (using user_id field)
          const newRetailers = retailers.filter(r => {
            const createdAt = new Date(r.created_at);
            return createdAt >= monthStart && createdAt <= monthEnd;
          }).length;
          
          // Find retailer target from user_period_targets
          const retailerTarget = targets.find(t => 
            t.target_kpi_definitions?.kpi_key === 'new_retailer_addition'
          );
          const targetNewRetailers = retailerTarget?.target_value || 5;
          const devScore = targetNewRetailers > 0 ? (newRetailers / targetNewRetailers) * 100 : 0;
          
          // Count active vs total retailers for context
          const activeRetailers = retailers.filter(r => r.status === 'active').length;
          
          score = Math.min(100, devScore);
          rawMetrics = {
            new_retailers: newRetailers,
            target_retailers: targetNewRetailers,
            achievement_rate: devScore.toFixed(1),
            total_retailers: retailers.length,
            active_retailers: activeRetailers
          };
          break;
        }

        case 'FSE_PRODUCT_MIX': {
          // Get order items for product mix analysis
          const orderIds = orders.filter(o => o.status === 'confirmed' || o.status === 'delivered').map(o => o.id);
          
          if (orderIds.length > 0) {
            const { data: orderItems } = await supabase
              .from('order_items')
              .select('product_id, quantity, rate, total, product:products(is_focused_product, name)')
              .in('order_id', orderIds);
            
            const items = orderItems || [];
            const totalRevenue = items.reduce((sum, item) => sum + (Number(item.total) || Number(item.quantity) * Number(item.rate) || 0), 0);
            const focusRevenue = items
              .filter(item => (item.product as any)?.is_focused_product)
              .reduce((sum, item) => sum + (Number(item.total) || Number(item.quantity) * Number(item.rate) || 0), 0);
            const uniqueSkus = new Set(items.map(item => item.product_id)).size;
            
            // Find focus product target
            const focusTarget = targets.find(t => 
              t.target_kpi_definitions?.kpi_key === 'focused_product_sales'
            );
            const targetFocusRevenue = focusTarget?.target_value || totalRevenue * 0.3;
            
            const focusRatio = totalRevenue > 0 ? (focusRevenue / totalRevenue) * 100 : 0;
            const focusAchievement = targetFocusRevenue > 0 ? (focusRevenue / targetFocusRevenue) * 100 : 0;
            const skuDiversity = Math.min(100, (uniqueSkus / 10) * 100); // Target: 10+ unique SKUs
            
            // 60% weight on focus product achievement, 40% on SKU diversity
            score = Math.min(100, (focusAchievement * 0.6 + skuDiversity * 0.4));
            rawMetrics = {
              focus_product_revenue: focusRevenue,
              total_revenue: totalRevenue,
              focus_ratio: focusRatio.toFixed(1),
              focus_achievement: focusAchievement.toFixed(1),
              unique_skus: uniqueSkus,
              sku_diversity_score: skuDiversity.toFixed(1)
            };
          } else {
            score = 0;
            rawMetrics = { note: 'No confirmed orders this month' };
          }
          break;
        }

        case 'FSE_COLLECTION': {
          // Calculate from actual credit order data
          const creditOrders = orders.filter(o => o.is_credit_order === true);
          const totalCreditAmount = creditOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
          const collectedAmount = creditOrders.reduce((sum, o) => sum + (Number(o.credit_paid_amount) || 0), 0);
          const pendingAmount = creditOrders.reduce((sum, o) => sum + (Number(o.credit_pending_amount) || 0), 0);
          
          const collectionRate = totalCreditAmount > 0 
            ? (collectedAmount / totalCreditAmount) * 100 
            : 100; // If no credit orders, full score
          
          // Also count cash orders as good collection behavior
          const cashOrders = orders.filter(o => !o.is_credit_order && (o.status === 'confirmed' || o.status === 'delivered'));
          const cashOrderRate = orders.length > 0 ? (cashOrders.length / orders.length) * 100 : 0;
          
          // Weight: 70% collection rate, 30% cash order preference
          score = creditOrders.length > 0 
            ? Math.min(100, collectionRate * 0.7 + cashOrderRate * 0.3)
            : Math.min(100, cashOrderRate > 0 ? 100 : 0);
          
          rawMetrics = {
            total_orders: orders.length,
            credit_orders: creditOrders.length,
            cash_orders: cashOrders.length,
            total_credit_amount: totalCreditAmount,
            collected_amount: collectedAmount,
            pending_amount: pendingAmount,
            collection_rate: collectionRate.toFixed(1),
            cash_order_rate: cashOrderRate.toFixed(1)
          };
          break;
        }

        // Manager competencies - now with real data
        case 'FSM_TEAM_ACHIEVEMENT': {
          if (subordinates.length === 0) {
            score = 0;
            rawMetrics = { note: 'No team members found' };
            break;
          }
          
          const teamOrders = subordinateData.orders || [];
          const teamRevenue = teamOrders
            .filter((o: any) => o.status === 'confirmed' || o.status === 'delivered')
            .reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
          
          // Get team revenue target (sum of subordinate targets)
          const { data: teamTargets } = await supabase
            .from('user_period_targets')
            .select('user_id, target_value, target_kpi_definitions!inner(kpi_key)')
            .in('user_id', subordinates)
            .eq('target_kpi_definitions.kpi_key', 'revenue_contribution')
            .gte('period_start', monthStart.toISOString().split('T')[0])
            .lte('period_end', monthEnd.toISOString().split('T')[0]);
          
          const totalTeamTarget = (teamTargets || []).reduce((sum: number, t: any) => sum + (Number(t.target_value) || 0), 0);
          const teamAchievement = totalTeamTarget > 0 ? (teamRevenue / totalTeamTarget) * 100 : 0;
          
          // Count members on target
          const memberRevenues = new Map<string, number>();
          teamOrders.filter((o: any) => o.status === 'confirmed' || o.status === 'delivered')
            .forEach((o: any) => {
              memberRevenues.set(o.user_id, (memberRevenues.get(o.user_id) || 0) + Number(o.total_amount));
            });
          
          let membersOnTarget = 0;
          (teamTargets || []).forEach((t: any) => {
            const memberRevenue = memberRevenues.get(t.user_id) || 0;
            if (memberRevenue >= t.target_value * 0.8) membersOnTarget++;
          });
          
          score = Math.min(100, teamAchievement);
          rawMetrics = {
            team_size: subordinates.length,
            team_revenue: teamRevenue,
            team_target: totalTeamTarget,
            team_achievement_rate: teamAchievement.toFixed(1),
            members_on_target: membersOnTarget
          };
          break;
        }

        case 'FSM_TEAM_PRODUCTIVITY': {
          if (subordinates.length === 0) {
            score = 0;
            rawMetrics = { note: 'No team members found' };
            break;
          }
          
          const teamVisits = subordinateData.visits || [];
          const completedVisits = teamVisits.filter((v: any) => v.status === 'productive' || v.status === 'unproductive');
          const productiveVisits = teamVisits.filter((v: any) => v.status === 'productive');
          
          const avgTeamProductivity = completedVisits.length > 0 
            ? (productiveVisits.length / completedVisits.length) * 100 
            : 0;
          
          score = Math.min(100, avgTeamProductivity);
          rawMetrics = {
            team_size: subordinates.length,
            team_total_visits: completedVisits.length,
            team_productive_visits: productiveVisits.length,
            avg_team_productivity: avgTeamProductivity.toFixed(1)
          };
          break;
        }

        case 'FSM_COACHING': {
          if (subordinates.length === 0) {
            score = 0;
            rawMetrics = { note: 'No team members found' };
            break;
          }
          
          const coachingNotes = subordinateData.coachingNotes || [];
          const uniqueMembersCoached = new Set(coachingNotes.map((n: any) => n.user_id)).size;
          const acknowledgedNotes = coachingNotes.filter((n: any) => n.is_acknowledged).length;
          
          // Get previous month scorecards for improvement tracking
          const { data: prevScorecards } = await supabase
            .from('user_monthly_scorecards')
            .select('user_id, overall_score')
            .in('user_id', subordinates)
            .eq('month_year', previousMonthStr);
          
          const currentScorecards = subordinateData.scorecards || [];
          const prevScoreMap = new Map((prevScorecards || []).map((s: any) => [s.user_id, s.overall_score]));
          
          let membersImproved = 0;
          currentScorecards.forEach((s: any) => {
            const prevScore = prevScoreMap.get(s.user_id);
            if (prevScore && s.overall_score > prevScore) membersImproved++;
          });
          
          const coachingCoverage = subordinates.length > 0 ? (uniqueMembersCoached / subordinates.length) * 100 : 0;
          const acknowledgementRate = coachingNotes.length > 0 ? (acknowledgedNotes / coachingNotes.length) * 100 : 0;
          const improvementRate = currentScorecards.length > 0 ? (membersImproved / currentScorecards.length) * 100 : 0;
          
          // Weight: 40% coverage, 30% improvement, 30% acknowledgement
          score = (coachingCoverage * 0.4) + (improvementRate * 0.3) + (acknowledgementRate * 0.3);
          rawMetrics = {
            team_size: subordinates.length,
            coaching_sessions: coachingNotes.length,
            members_coached: uniqueMembersCoached,
            notes_acknowledged: acknowledgedNotes,
            members_improved: membersImproved,
            coaching_coverage: coachingCoverage.toFixed(1),
            improvement_rate: improvementRate.toFixed(1)
          };
          break;
        }

        case 'FSM_PLANNING': {
          if (subordinates.length === 0) {
            score = 0;
            rawMetrics = { note: 'No team members found' };
            break;
          }
          
          // Get beat plans for all subordinates
          const { data: teamBeatPlans } = await supabase
            .from('beat_plans')
            .select('id, user_id, beat_id, plan_date')
            .in('user_id', subordinates)
            .gte('plan_date', monthStart.toISOString().split('T')[0])
            .lte('plan_date', monthEnd.toISOString().split('T')[0]);
          
          const teamVisits = subordinateData.visits || [];
          const plansCreated = (teamBeatPlans || []).length;
          const executedVisits = teamVisits.filter((v: any) => v.check_in_time).length;
          
          // Calculate working days in month (approx 22)
          const workingDays = 22;
          const expectedPlans = subordinates.length * workingDays;
          const planningRate = expectedPlans > 0 ? (plansCreated / expectedPlans) * 100 : 0;
          const executionRate = plansCreated > 0 ? (executedVisits / (plansCreated * 5)) * 100 : 0; // Assume 5 visits per plan day
          
          score = Math.min(100, (planningRate * 0.5 + executionRate * 0.5));
          rawMetrics = {
            team_size: subordinates.length,
            plans_created: plansCreated,
            expected_plans: expectedPlans,
            visits_executed: executedVisits,
            planning_rate: planningRate.toFixed(1),
            execution_rate: executionRate.toFixed(1)
          };
          break;
        }

        case 'FSM_TALENT': {
          if (subordinates.length === 0) {
            score = 0;
            rawMetrics = { note: 'No team members found' };
            break;
          }
          
          const currentScorecards = subordinateData.scorecards || [];
          
          // Get previous month scorecards
          const { data: prevScorecards } = await supabase
            .from('user_monthly_scorecards')
            .select('user_id, overall_score, performance_band')
            .in('user_id', subordinates)
            .eq('month_year', previousMonthStr);
          
          const prevScoreMap = new Map((prevScorecards || []).map((s: any) => [s.user_id, s.overall_score]));
          
          let membersGrowing = 0;
          let membersDeclining = 0;
          let totalGrowth = 0;
          
          currentScorecards.forEach((s: any) => {
            const prevScore = prevScoreMap.get(s.user_id);
            if (prevScore !== undefined) {
              const growth = s.overall_score - prevScore;
              totalGrowth += growth;
              if (growth > 5) membersGrowing++;
              else if (growth < -5) membersDeclining++;
            }
          });
          
          const avgGrowthRate = currentScorecards.length > 0 ? totalGrowth / currentScorecards.length : 0;
          const growthRate = subordinates.length > 0 ? (membersGrowing / subordinates.length) * 100 : 0;
          
          // High performers count
          const highPerformers = currentScorecards.filter((s: any) => 
            s.performance_band === 'exceptional' || s.performance_band === 'strong'
          ).length;
          
          score = Math.min(100, Math.max(0, 50 + avgGrowthRate)); // Base 50 + average growth
          rawMetrics = {
            team_size: subordinates.length,
            members_with_scorecards: currentScorecards.length,
            members_growing: membersGrowing,
            members_declining: membersDeclining,
            high_performers: highPerformers,
            avg_growth_rate: avgGrowthRate.toFixed(1),
            growth_rate: growthRate.toFixed(1)
          };
          break;
        }

        case 'FSM_COVERAGE': {
          if (subordinates.length === 0) {
            score = 0;
            rawMetrics = { note: 'No team members found' };
            break;
          }
          
          // Get team's retailers and visits
          const { data: teamRetailers } = await supabase
            .from('retailers')
            .select('id, beat_id, user_id, status')
            .in('user_id', subordinates)
            .eq('status', 'active');
          
          const teamVisits = subordinateData.visits || [];
          const visitedRetailers = new Set(teamVisits.filter((v: any) => v.check_in_time).map((v: any) => v.retailer_id));
          
          const totalRetailers = (teamRetailers || []).length;
          const retailersCovered = visitedRetailers.size;
          const coverageRate = totalRetailers > 0 ? (retailersCovered / totalRetailers) * 100 : 0;
          
          // Get unique beats
          const totalBeats = new Set((teamRetailers || []).map((r: any) => r.beat_id).filter(Boolean)).size;
          
          score = Math.min(100, coverageRate);
          rawMetrics = {
            team_size: subordinates.length,
            total_retailers: totalRetailers,
            retailers_visited: retailersCovered,
            total_beats: totalBeats,
            coverage_rate: coverageRate.toFixed(1)
          };
          break;
        }

        default:
          score = 0;
          rawMetrics = { error: 'Unknown competency code', code: template.competency_code };
      }

      const previousScore = previousScoreMap.get(template.id) || null;
      let trend = 'new';
      if (previousScore !== null) {
        if (score > previousScore + 5) trend = 'improving';
        else if (score < previousScore - 5) trend = 'declining';
        else trend = 'stable';
      }

      scores.push({
        competency_template_id: template.id,
        score: Math.round(score * 100) / 100,
        raw_metrics: rawMetrics,
        trend,
        previous_month_score: previousScore
      });
    }

    // Calculate overall score (weighted average)
    let totalWeight = 0;
    let weightedSum = 0;
    for (const template of templates) {
      const scoreData = scores.find(s => s.competency_template_id === template.id);
      if (scoreData) {
        weightedSum += scoreData.score * template.weightage;
        totalWeight += template.weightage;
      }
    }
    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Determine performance band
    let performanceBand = 'needs_improvement';
    if (overallScore >= 90) performanceBand = 'exceptional';
    else if (overallScore >= 75) performanceBand = 'strong';
    else if (overallScore >= 60) performanceBand = 'developing';

    console.log(`Calculated overall score: ${overallScore.toFixed(1)}, band: ${performanceBand}`);

    // Upsert individual competency scores
    for (const scoreData of scores) {
      const { error: upsertError } = await supabase
        .from('user_competency_monthly_scores')
        .upsert({
          user_id: userId,
          competency_template_id: scoreData.competency_template_id,
          month_year: monthStart.toISOString().split('T')[0],
          score: scoreData.score,
          raw_metrics: scoreData.raw_metrics,
          trend: scoreData.trend,
          previous_month_score: scoreData.previous_month_score,
          calculated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,competency_template_id,month_year'
        });
      
      if (upsertError) {
        console.error('Error upserting score:', upsertError);
      }
    }

    // Upsert monthly scorecard
    const { error: scorecardError } = await supabase
      .from('user_monthly_scorecards')
      .upsert({
        user_id: userId,
        month_year: monthStart.toISOString().split('T')[0],
        role_type: roleType,
        overall_score: Math.round(overallScore * 100) / 100,
        weighted_score: Math.round(overallScore * 100) / 100,
        performance_band: performanceBand,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,month_year'
      });

    if (scorecardError) {
      console.error('Error upserting scorecard:', scorecardError);
    }

    console.log(`Successfully calculated and saved competency scores for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        monthYear: monthStart.toISOString().split('T')[0],
        overallScore: Math.round(overallScore * 100) / 100,
        performanceBand,
        scores: scores.map(s => ({
          ...s,
          competency_name: templates.find(t => t.id === s.competency_template_id)?.competency_name
        }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error calculating competency scores:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
