import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceKey);

    const dataUrl = new URL("./data.json", import.meta.url);
    const rows = JSON.parse(await Deno.readTextFile(dataUrl));

    const BATCH = 250;
    let inserted = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const { error, count } = await supabase
        .from("profile_object_permissions")
        .upsert(chunk, { onConflict: "profile_id,object_name,permission_type", count: "exact" });
      if (error) {
        errors.push(`batch ${i}: ${error.message}`);
      } else {
        inserted += count ?? chunk.length;
      }
    }

    const { count: total } = await supabase
      .from("profile_object_permissions")
      .select("*", { count: "exact", head: true });

    return new Response(
      JSON.stringify({ ok: errors.length === 0, restored: inserted, totalNow: total, errors }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});