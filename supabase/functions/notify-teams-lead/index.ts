import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEAM_ID = "fae1bb2c-e9bc-40f8-8e77-e07e5e07f79a";
const CHANNEL_ID = "19:5dad73110eca4ee48fb0bd3273cc933d@thread.tacv2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_teams";

function v(value: unknown): string {
  if (value === null || value === undefined) return "Not provided";
  const s = String(value).trim();
  return s.length === 0 ? "Not provided" : s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatLeadType(lead: any): string {
  switch (lead.lead_type) {
    case "contact_request": {
      const sub = lead.lead_sub_type ? String(lead.lead_sub_type).trim() : "";
      return sub ? `Contact Request (${sub})` : "Contact Request";
    }
    case "demo_request":
      return "Demo Request";
    case "roi_callback_request":
      return "QuickApp Expert Callback";
    default:
      return v(lead.lead_type);
  }
}

function buildMessage(lead: any): string {
  const submittedAt = lead.created_at
    ? new Date(lead.created_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not provided";

  const lines: string[] = [];
  lines.push("<strong>🚀 New Lead for QuickApp</strong>");
  lines.push("");
  lines.push(`👤 <strong>Full Name:</strong> ${escapeHtml(v(lead.full_name))}`);
  lines.push(`📧 <strong>Email:</strong> ${escapeHtml(v(lead.email))}`);
  lines.push(`📱 <strong>Phone:</strong> ${escapeHtml(v(lead.phone))}`);
  lines.push(`🏢 <strong>Company:</strong> ${escapeHtml(v(lead.company))}`);
  lines.push(`👥 <strong>Team Size:</strong> ${escapeHtml(v(lead.team_size))}`);
  lines.push(`🏭 <strong>Industry:</strong> ${escapeHtml(v(lead.industry))}`);
  lines.push("");
  lines.push("📝 <strong>Message:</strong>");
  lines.push(escapeHtml(v(lead.message)));
  lines.push("");
  lines.push(`📌 <strong>Lead Type:</strong> ${escapeHtml(formatLeadType(lead))}`);
  lines.push(`📍 <strong>Source Page:</strong> ${escapeHtml(v(lead.source_page))}`);
  lines.push("");
  lines.push(`🕒 <strong>Submitted At:</strong> ${escapeHtml(submittedAt)}`);

  // demo_request: append selected solutions if present
  if (lead.lead_type === "demo_request") {
    const meta = lead.metadata ?? {};
    const sols = Array.isArray(meta.selected_solutions)
      ? meta.selected_solutions.filter((s: unknown) => typeof s === "string" && s.trim())
      : [];
    if (sols.length > 0) {
      lines.push("");
      lines.push("🎯 <strong>Solutions Requested:</strong>");
      for (const s of sols) lines.push(`- ${escapeHtml(String(s))}`);
    }
  }

  return lines.join("<br>");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const leadId = body?.lead_id;
    if (!leadId || typeof leadId !== "string") {
      console.error("[notify-teams-lead] missing lead_id");
      return new Response(JSON.stringify({ ok: false, error: "missing lead_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lead, error: fetchErr } = await supabase
      .from("website_leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (fetchErr || !lead) {
      console.error("[notify-teams-lead] lead not found", { leadId, fetchErr });
      return new Response(JSON.stringify({ ok: false, error: "lead not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TEAMS_API_KEY = Deno.env.get("MICROSOFT_TEAMS_API_KEY");
    if (!LOVABLE_API_KEY || !TEAMS_API_KEY) {
      console.error("[notify-teams-lead] missing gateway credentials");
      return new Response(JSON.stringify({ ok: false, error: "missing credentials" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageHtml = buildMessage(lead);
    const encodedChannel = encodeURIComponent(CHANNEL_ID);
    const url = `${GATEWAY_URL}/teams/${TEAM_ID}/channels/${encodedChannel}/messages`;

    const tRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TEAMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: {
          contentType: "html",
          content: messageHtml,
        },
      }),
    });

    const tText = await tRes.text();
    if (!tRes.ok) {
      console.error("[notify-teams-lead] Teams POST failed", tRes.status, tText);
      return new Response(
        JSON.stringify({ ok: false, status: tRes.status, body: tText }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[notify-teams-lead] sent", { leadId, lead_type: lead.lead_type });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[notify-teams-lead] error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});