import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

interface AnalysisContext {
  products: any[];
  retailersByCategory: any[];
  territories: any[];
  beats: any[];
  salespersons: any[];
  monthlyTrends: any[];
  activeSchemes: any[];
  productCategories: any[];
}

interface SchemeSuggestion {
  suggested_name: string;
  suggested_description: string;
  suggested_scheme_type: string;
  suggested_discount_percentage: number;
  suggested_discount_amount: number;
  suggested_buy_quantity: number;
  suggested_free_quantity: number;
  suggested_condition_quantity: number;
  suggested_min_order_value: number;
  suggested_start_date: string;
  suggested_end_date: string;
  suggested_product_id?: string;
  suggested_category_id?: string;
  analysis_type: string;
  target_type: string;
  target_ids: string[];
  target_names: string[];
  reasoning: string;
  data_signals: any;
  confidence_score: number;
  expected_benefit: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { mode = 'analyze' } = await req.json();

    if (mode === 'analyze') {
      console.log('Starting AI scheme analysis...');
      
      // Gather analysis context
      const context = await gatherAnalysisContext(supabase);
      console.log('Context gathered:', {
        products: context.products.length,
        retailers: context.retailersByCategory.length,
        territories: context.territories.length,
        beats: context.beats.length
      });

      // Generate suggestions using AI
      const suggestions = await generateSchemeSuggestions(context);
      console.log('Generated suggestions:', suggestions.length);

      // Store suggestions in database
      if (suggestions.length > 0) {
        const { error } = await supabase
          .from('ai_scheme_suggestions')
          .insert(suggestions.map(s => ({
            ...s,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })));

        if (error) {
          console.error('Error storing suggestions:', error);
          throw error;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        suggestions_generated: suggestions.length,
        suggestions
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid mode' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI Scheme Engine error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function gatherAnalysisContext(supabase: any): Promise<AnalysisContext> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get products with order counts
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, category_id, rate, is_active')
    .eq('is_active', true)
    .limit(100);

  // Get order items aggregated by product for last 30 days
  const { data: recentOrderItems } = await supabase
    .from('order_items')
    .select(`
      product_id,
      quantity,
      orders!inner(order_date, status)
    `)
    .gte('orders.order_date', thirtyDaysAgo)
    .in('orders.status', ['confirmed', 'delivered'])
    .limit(500);

  // Get order items for previous 30 days (for trend analysis)
  const { data: previousOrderItems } = await supabase
    .from('order_items')
    .select(`
      product_id,
      quantity,
      orders!inner(order_date, status)
    `)
    .gte('orders.order_date', sixtyDaysAgo)
    .lt('orders.order_date', thirtyDaysAgo)
    .in('orders.status', ['confirmed', 'delivered'])
    .limit(500);

  // Aggregate product order counts
  const recentProductCounts = new Map<string, number>();
  (recentOrderItems || []).forEach((item: any) => {
    const count = recentProductCounts.get(item.product_id) || 0;
    recentProductCounts.set(item.product_id, count + item.quantity);
  });

  const previousProductCounts = new Map<string, number>();
  (previousOrderItems || []).forEach((item: any) => {
    const count = previousProductCounts.get(item.product_id) || 0;
    previousProductCounts.set(item.product_id, count + item.quantity);
  });

  // Enrich products with trend data
  const enrichedProducts = (products || []).map((p: any) => {
    const recentCount = recentProductCounts.get(p.id) || 0;
    const previousCount = previousProductCounts.get(p.id) || 0;
    const trend = previousCount > 0 ? ((recentCount - previousCount) / previousCount) * 100 : 0;
    return {
      ...p,
      recent_order_count: recentCount,
      previous_order_count: previousCount,
      order_trend_percent: Math.round(trend)
    };
  });

  // Get retailers by category
  const { data: retailers } = await supabase
    .from('retailers')
    .select('id, shop_name, category, potential, last_order_date, last_order_value, beat_id, territory_id')
    .limit(200);

  // Aggregate retailers by category
  const categoryStats = new Map<string, { count: number; total_value: number; order_count: number }>();
  (retailers || []).forEach((r: any) => {
    const cat = r.category || 'Unknown';
    const stats = categoryStats.get(cat) || { count: 0, total_value: 0, order_count: 0 };
    stats.count++;
    if (r.last_order_value) {
      stats.total_value += r.last_order_value;
      stats.order_count++;
    }
    categoryStats.set(cat, stats);
  });

  const retailersByCategory = Array.from(categoryStats.entries()).map(([category, stats]) => ({
    category,
    count: stats.count,
    avg_order_value: stats.order_count > 0 ? Math.round(stats.total_value / stats.order_count) : 0,
    ordering_rate: Math.round((stats.order_count / stats.count) * 100)
  }));

  // Get territories
  const { data: territories } = await supabase
    .from('territories')
    .select('id, name')
    .limit(50);

  // Get beats
  const { data: beats } = await supabase
    .from('beats')
    .select('id, beat_name, territory_id')
    .limit(100);

  // Get salespersons (employees)
  const { data: employees } = await supabase
    .from('employees')
    .select('id, user_id, employee_code')
    .limit(50);

  const salespersonIds = (employees || []).map((e: any) => e.user_id).filter(Boolean);
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', salespersonIds);

  const salespersons = (employees || []).map((e: any) => {
    const profile = (profiles || []).find((p: any) => p.id === e.user_id);
    return {
      id: e.user_id,
      name: profile?.full_name || e.employee_code,
      employee_id: e.id
    };
  });

  // Get active schemes
  const { data: activeSchemes } = await supabase
    .from('product_schemes')
    .select('id, name, scheme_type, is_active')
    .eq('is_active', true)
    .limit(50);

  // Get product categories
  const { data: productCategories } = await supabase
    .from('product_categories')
    .select('id, name')
    .limit(50);

  // Calculate monthly trends
  const currentMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);

  const { data: monthlyOrders } = await supabase
    .from('orders')
    .select('total_amount, order_date')
    .gte('order_date', sixtyDaysAgo)
    .in('status', ['confirmed', 'delivered']);

  const monthlyTrends = [
    { month: lastMonth, revenue: 0 },
    { month: currentMonth, revenue: 0 }
  ];

  (monthlyOrders || []).forEach((order: any) => {
    const orderMonth = order.order_date?.slice(0, 7);
    if (orderMonth === lastMonth) {
      monthlyTrends[0].revenue += order.total_amount || 0;
    } else if (orderMonth === currentMonth) {
      monthlyTrends[1].revenue += order.total_amount || 0;
    }
  });

  return {
    products: enrichedProducts,
    retailersByCategory,
    territories: territories || [],
    beats: beats || [],
    salespersons,
    monthlyTrends,
    activeSchemes: activeSchemes || [],
    productCategories: productCategories || []
  };
}

async function generateSchemeSuggestions(context: AnalysisContext): Promise<SchemeSuggestion[]> {
  const systemPrompt = `You are an expert sales promotion strategist for a field sales distribution app. 
Analyze the provided business data and suggest 3-5 targeted promotional schemes.

Available scheme types:
- percentage_discount: Percentage off on products
- flat_discount: Fixed amount off
- buy_x_get_y_free: Buy X quantity, get Y free
- bundle_combo: Bundle discount on multiple products
- tiered_discount: Different discounts at different quantity levels
- time_based_offer: Limited time promotional offer
- first_order_discount: Special discount for first-time orders
- category_wide_discount: Discount on entire product category

Analysis types to consider:
- slow_moving_products: Products with declining orders need promotional boost
- retailer_category: Target specific retailer categories (Grocery, Medical, etc.)
- high_potential_acquisition: Convert high-potential retailers who aren't ordering
- territory_boost: Boost underperforming territories
- beat_trending: Amplify success of trending products in specific beats
- salesperson_boost: Help struggling salespersons with targeted offers
- seasonal: Time-based opportunities

For each suggestion provide complete JSON with these exact fields:
{
  "suggested_name": "Catchy scheme name",
  "suggested_description": "Brief description",
  "suggested_scheme_type": "one of the scheme types above",
  "suggested_discount_percentage": 0,
  "suggested_discount_amount": 0,
  "suggested_buy_quantity": 0,
  "suggested_free_quantity": 0,
  "suggested_condition_quantity": 0,
  "suggested_min_order_value": 0,
  "suggested_start_date": "YYYY-MM-DD",
  "suggested_end_date": "YYYY-MM-DD",
  "suggested_product_id": "uuid or null",
  "suggested_category_id": "uuid or null",
  "analysis_type": "one of the analysis types above",
  "target_type": "global/territory/beat/retailer/salesperson/product",
  "target_ids": ["array of entity UUIDs"],
  "target_names": ["human readable names"],
  "reasoning": "Why this scheme makes sense based on data",
  "data_signals": {"key": "value pairs of relevant data points"},
  "confidence_score": 0.75,
  "expected_benefit": "Expected business impact"
}

Only output a valid JSON array of suggestions. No markdown, no explanation.`;

  const userPrompt = `Analyze this business data and generate scheme suggestions:

PRODUCTS (with order trends):
${JSON.stringify(context.products.slice(0, 20), null, 2)}

RETAILER CATEGORIES:
${JSON.stringify(context.retailersByCategory, null, 2)}

TERRITORIES:
${JSON.stringify(context.territories.slice(0, 10), null, 2)}

BEATS:
${JSON.stringify(context.beats.slice(0, 15), null, 2)}

SALESPERSONS:
${JSON.stringify(context.salespersons.slice(0, 10), null, 2)}

MONTHLY TRENDS:
${JSON.stringify(context.monthlyTrends, null, 2)}

ACTIVE SCHEMES (avoid duplicates):
${JSON.stringify(context.activeSchemes.slice(0, 10), null, 2)}

PRODUCT CATEGORIES:
${JSON.stringify(context.productCategories, null, 2)}

Today's date: ${new Date().toISOString().split('T')[0]}
Suggest validity periods of 7-21 days from today.

Generate 3-5 scheme suggestions based on this data.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 3000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';
    
    console.log('Raw AI response:', content);

    // Parse JSON response
    let suggestions: SchemeSuggestion[] = [];
    try {
      // Clean up potential markdown formatting
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      
      suggestions = JSON.parse(cleanedContent.trim());
      
      // Validate and sanitize suggestions
      suggestions = suggestions.filter(s => 
        s.suggested_name && 
        s.suggested_scheme_type && 
        s.analysis_type && 
        s.target_type
      ).map(s => ({
        ...s,
        suggested_discount_percentage: s.suggested_discount_percentage || 0,
        suggested_discount_amount: s.suggested_discount_amount || 0,
        suggested_buy_quantity: s.suggested_buy_quantity || 0,
        suggested_free_quantity: s.suggested_free_quantity || 0,
        suggested_condition_quantity: s.suggested_condition_quantity || 0,
        suggested_min_order_value: s.suggested_min_order_value || 0,
        confidence_score: Math.min(Math.max(s.confidence_score || 0.75, 0), 1),
        target_ids: s.target_ids || [],
        target_names: s.target_names || [],
        data_signals: s.data_signals || {}
      }));
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return [];
    }

    return suggestions;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return [];
  }
}
