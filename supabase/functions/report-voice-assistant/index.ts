import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ReportContext {
  dateRange: { from: string; to: string };
  allUsersSummary: {
    retailers: number;
    beats: number;
    products: number;
    totalKg: number;
  } | null;
  orderSummaryData: Array<{
    full_name: string;
    total_order_value: number;
  }>;
  skuData: Array<{
    product_name: string;
    quantity_sold: number;
    revenue: number;
    unit: string;
  }>;
  productivityData: Array<{
    full_name: string;
    productivity_percentage: number;
    productive_visits: number;
    total_visits: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { question, reportContext } = await req.json() as { question: string; reportContext: ReportContext };
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!question) {
      console.error("No question provided");
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing question: "${question}"`);

    // Build context from report data
    const contextParts: string[] = [];
    
    contextParts.push(`Report Date Range: ${reportContext.dateRange?.from || 'N/A'} to ${reportContext.dateRange?.to || 'N/A'}`);
    
    if (reportContext.allUsersSummary) {
      contextParts.push(`\nOverall Summary:
- Total Retailers: ${reportContext.allUsersSummary.retailers}
- Total Beats: ${reportContext.allUsersSummary.beats}
- Total Products: ${reportContext.allUsersSummary.products}
- Total Quantity: ${reportContext.allUsersSummary.totalKg.toFixed(2)} KG`);
    }

    if (reportContext.orderSummaryData?.length > 0) {
      const totalOrderValue = reportContext.orderSummaryData.reduce((sum, u) => sum + u.total_order_value, 0);
      const topUser = reportContext.orderSummaryData[0];
      contextParts.push(`\nOrder Summary:
- Total Users: ${reportContext.orderSummaryData.length}
- Total Order Value: ₹${totalOrderValue.toLocaleString('en-IN')}
- Top Performer by Orders: ${topUser?.full_name} (₹${topUser?.total_order_value.toLocaleString('en-IN')})
- All Users by Order Value: ${reportContext.orderSummaryData.map(u => `${u.full_name}: ₹${u.total_order_value.toLocaleString('en-IN')}`).join(', ')}`);
    }

    if (reportContext.skuData?.length > 0) {
      const totalRevenue = reportContext.skuData.reduce((sum, s) => sum + s.revenue, 0);
      const totalKg = reportContext.skuData.reduce((sum, s) => {
        const unit = (s.unit || '').toLowerCase();
        if (unit === 'grams' || unit === 'g' || unit === 'gram') {
          return sum + s.quantity_sold / 1000;
        }
        return sum + s.quantity_sold;
      }, 0);
      const topProduct = reportContext.skuData.reduce((max, s) => s.revenue > max.revenue ? s : max, reportContext.skuData[0]);
      
      contextParts.push(`\nSKU Revenue Summary:
- Total SKUs: ${reportContext.skuData.length}
- Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}
- Total Quantity: ${totalKg.toFixed(2)} KG
- Top Selling Product: ${topProduct?.product_name} (₹${topProduct?.revenue.toLocaleString('en-IN')})
- All Products: ${reportContext.skuData.slice(0, 10).map(s => `${s.product_name}: ₹${s.revenue.toLocaleString('en-IN')}, ${s.quantity_sold} ${s.unit}`).join('; ')}${reportContext.skuData.length > 10 ? '...' : ''}`);
    }

    if (reportContext.productivityData?.length > 0) {
      const totalProductive = reportContext.productivityData.reduce((sum, p) => sum + p.productive_visits, 0);
      const totalVisits = reportContext.productivityData.reduce((sum, p) => sum + p.total_visits, 0);
      const avgProductivity = totalVisits > 0 ? (totalProductive / totalVisits) * 100 : 0;
      const topProductiveUser = reportContext.productivityData.reduce((max, p) => 
        p.productivity_percentage > max.productivity_percentage ? p : max, reportContext.productivityData[0]
      );
      
      contextParts.push(`\nProductivity Summary:
- Total Productive Visits: ${totalProductive} / ${totalVisits}
- Overall Productivity: ${avgProductivity.toFixed(1)}%
- Top Productive User: ${topProductiveUser?.full_name} (${topProductiveUser?.productivity_percentage.toFixed(1)}%)
- All Users Productivity: ${reportContext.productivityData.map(p => `${p.full_name}: ${p.productivity_percentage.toFixed(1)}% (${p.productive_visits}/${p.total_visits})`).join(', ')}`);
    }

    const reportData = contextParts.join('\n');

    const systemPrompt = `You are a helpful sales report assistant. You have access to the following report data and should answer questions about it accurately and concisely.

${reportData}

Instructions:
- Answer questions based only on the provided data
- Be concise but complete
- Use Indian Rupee (₹) format for currency
- If asked about something not in the data, politely say you don't have that information
- Keep responses suitable for text-to-speech (avoid special characters, lists should be spoken naturally)
- Responses should be under 150 words`;

    console.log("Calling OpenAI API...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    console.log(`Generated answer: "${answer.substring(0, 100)}..."`);

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in report-voice-assistant:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
