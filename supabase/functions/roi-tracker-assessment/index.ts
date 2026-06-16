import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { contact, metrics, overallRoi, metricsDetail } = body ?? {};

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a senior FMCG / field-sales consultant. You analyse ROI tracker data
for a company evaluating QuickApp.ai. Be specific, candid and quantitative.

Return STRICT JSON of shape:
{
  "summary": "2-3 sentence verdict referencing the overall ROI %",
  "strengths": ["..."],
  "gaps": ["..."],
  "recommendations": ["..."],
  "quickWins": ["..."]
}
No markdown, no commentary, JSON only.`;

    const userPrompt = `Company: ${contact?.company ?? "N/A"} | Industry: ${contact?.industry ?? "N/A"} | Team size: ${contact?.companySize ?? "N/A"}
Overall ROI achievement: ${overallRoi}%

Metric detail (baseline → target → actual, unit):
${(metricsDetail ?? [])
  .map(
    (m: any) =>
      `- ${m.group} · ${m.label}: ${m.baseline ?? "-"} → ${m.target ?? "-"} → ${m.actual ?? "-"} ${m.unit}`,
  )
  .join("\n")}

Raw metric maps: ${JSON.stringify(metrics)}

Write the assessment now. Be specific to the numbers above.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("AI Gateway error", status, errText);
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact QuickApp support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error("AI gateway failed");
    }

    const data = await aiResponse.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    let assessment: any;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      assessment = match ? JSON.parse(match[0]) : null;
    } catch (e) {
      assessment = null;
    }
    if (!assessment) {
      assessment = {
        summary: content.slice(0, 600) || "Assessment unavailable.",
        strengths: [],
        gaps: [],
        recommendations: [],
        quickWins: [],
      };
    }

    return new Response(JSON.stringify({ assessment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("roi-tracker-assessment error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});