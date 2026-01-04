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
      .eq('month_year', previousMonthStart.toISOString().split('T')[0]);

    const previousScoreMap = new Map(
      (previousScores || []).map(s => [s.competency_template_id, s.score])
    );

    // Fetch all required data for calculations
    const [visitsResult, ordersResult, beatPlansResult, retailersResult, targetsResult] = await Promise.all([
      // Visits data
      supabase
        .from('visits')
        .select('id, retailer_id, check_in_time, check_out_time, check_in_photo_url, status, beat_id, created_at')
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString()),
      
      // Orders data
      supabase
        .from('orders')
        .select('id, visit_id, total_amount, status, created_at, retailer_id')
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString()),
      
      // Beat plans data
      supabase
        .from('beat_plans')
        .select('id, beat_id, beat_name, plan_date')
        .eq('user_id', userId)
        .gte('plan_date', monthStart.toISOString().split('T')[0])
        .lte('plan_date', monthEnd.toISOString().split('T')[0]),
      
      // Retailers data
      supabase
        .from('retailers')
        .select('id, created_at, beat_id')
        .eq('created_by', userId),
      
      // User targets
      supabase
        .from('user_period_targets')
        .select('*, target_kpi_definitions(*)')
        .eq('user_id', userId)
        .eq('period_type', 'month')
        .gte('period_start', monthStart.toISOString().split('T')[0])
        .lte('period_end', monthEnd.toISOString().split('T')[0])
    ]);

    const visits = visitsResult.data || [];
    const orders = ordersResult.data || [];
    const beatPlans = beatPlansResult.data || [];
    const retailers = retailersResult.data || [];
    const targets = targetsResult.data || [];

    console.log(`Data fetched: ${visits.length} visits, ${orders.length} orders, ${beatPlans.length} beat plans`);

    // Calculate scores for each competency
    const scores: CompetencyScore[] = [];

    for (const template of templates) {
      let score = 0;
      let rawMetrics: Record<string, any> = {};

      switch (template.competency_code) {
        case 'FSE_TERRITORY_COVERAGE': {
          const plannedBeats = new Set(beatPlans.map(bp => bp.beat_id));
          const visitedBeats = new Set(visits.filter(v => v.check_in_time).map(v => v.beat_id));
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
          const totalVisits = visits.filter(v => v.check_in_time).length;
          const orderVisitIds = new Set(orders.map(o => o.visit_id));
          const productiveVisits = visits.filter(v => v.check_in_time && orderVisitIds.has(v.id)).length;
          const productivityRate = totalVisits > 0 
            ? (productiveVisits / totalVisits) * 100 
            : 0;
          
          score = Math.min(100, productivityRate);
          rawMetrics = {
            total_visits: totalVisits,
            productive_visits: productiveVisits,
            productivity_rate: productivityRate.toFixed(1)
          };
          break;
        }

        case 'FSE_REVENUE': {
          const actualRevenue = orders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
          
          const revenueTarget = targets.find(t => 
            t.target_kpi_definitions?.kpi_code === 'REVENUE' || 
            t.target_kpi_definitions?.kpi_name?.toLowerCase().includes('revenue')
          );
          const targetValue = revenueTarget?.target_value || 100000;
          const achievementRate = (actualRevenue / targetValue) * 100;
          
          score = Math.min(100, achievementRate);
          rawMetrics = {
            target_revenue: targetValue,
            actual_revenue: actualRevenue,
            achievement_rate: achievementRate.toFixed(1)
          };
          break;
        }

        case 'FSE_DISCIPLINE': {
          const totalVisitsWithCheckin = visits.filter(v => v.check_in_time).length;
          const visitsWithPhoto = visits.filter(v => v.check_in_photo_url).length;
          const visitsWithCheckout = visits.filter(v => v.check_out_time).length;
          
          const checkinCompliance = totalVisitsWithCheckin;
          const photoCompliance = totalVisitsWithCheckin > 0 
            ? (visitsWithPhoto / totalVisitsWithCheckin) * 100 
            : 0;
          const checkoutCompliance = totalVisitsWithCheckin > 0 
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
          
          // Target: 15-30 min per visit is ideal
          const durationScore = avgDuration >= 15 && avgDuration <= 45 ? 100 : 
                                avgDuration > 0 ? Math.max(0, 100 - Math.abs(avgDuration - 22.5) * 3) : 0;
          
          score = (photoCompliance * 0.3 + checkoutCompliance * 0.3 + durationScore * 0.4);
          rawMetrics = {
            total_visits: totalVisitsWithCheckin,
            photo_rate: photoCompliance.toFixed(1),
            checkout_rate: checkoutCompliance.toFixed(1),
            avg_visit_duration: avgDuration.toFixed(1),
            duration_score: durationScore.toFixed(1)
          };
          break;
        }

        case 'FSE_RETAILER_DEV': {
          // New retailers added this month
          const newRetailers = retailers.filter(r => {
            const createdAt = new Date(r.created_at);
            return createdAt >= monthStart && createdAt <= monthEnd;
          }).length;
          
          // Target: 5 new retailers per month
          const targetNewRetailers = 5;
          const devScore = (newRetailers / targetNewRetailers) * 100;
          
          score = Math.min(100, devScore);
          rawMetrics = {
            new_retailers: newRetailers,
            target_retailers: targetNewRetailers,
            achievement_rate: devScore.toFixed(1)
          };
          break;
        }

        case 'FSE_PRODUCT_MIX': {
          // Get order items for product mix analysis
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id, quantity, rate, product:products(is_focus_product)')
            .in('order_id', orders.map(o => o.id));
          
          const items = orderItems || [];
          const totalRevenue = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.rate)), 0);
          const focusRevenue = items
            .filter(item => (item.product as any)?.is_focus_product)
            .reduce((sum, item) => sum + (Number(item.quantity) * Number(item.rate)), 0);
          const uniqueSkus = new Set(items.map(item => item.product_id)).size;
          
          const focusRatio = totalRevenue > 0 ? (focusRevenue / totalRevenue) * 100 : 0;
          const skuDiversity = Math.min(100, (uniqueSkus / 10) * 100); // Target: 10+ unique SKUs
          
          score = (focusRatio * 0.6 + skuDiversity * 0.4);
          rawMetrics = {
            focus_product_revenue: focusRevenue,
            total_revenue: totalRevenue,
            focus_ratio: focusRatio.toFixed(1),
            unique_skus: uniqueSkus,
            sku_diversity_score: skuDiversity.toFixed(1)
          };
          break;
        }

        case 'FSE_COLLECTION': {
          // Simplified collection score - based on orders with proper payment tracking
          const creditOrders = orders.filter(o => o.status !== 'cancelled').length;
          // For now, assume 80% collection rate as baseline
          score = 80;
          rawMetrics = {
            credit_orders: creditOrders,
            collected_on_time: Math.round(creditOrders * 0.8),
            collection_rate: '80.0',
            note: 'Payment tracking data required for accurate calculation'
          };
          break;
        }

        // Manager competencies
        case 'FSM_TEAM_ACHIEVEMENT':
        case 'FSM_TEAM_PRODUCTIVITY':
        case 'FSM_COACHING':
        case 'FSM_PLANNING':
        case 'FSM_TALENT':
        case 'FSM_COVERAGE': {
          // These require subordinate data - will be implemented with team hierarchy
          score = 0;
          rawMetrics = { note: 'Requires team hierarchy data' };
          break;
        }

        default:
          score = 0;
          rawMetrics = { error: 'Unknown competency code' };
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
