import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import retailers from "./retailers.json" with { type: "json" };

const MOKSHITH = "73044cad-2c19-4a47-89f1-6a755adc3362";
const MANVITH = "d6d364d5-6f19-4da9-bb48-67b04a8065fa";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const result: Record<string, unknown> = {};

  // Upsert retailers in batches of 100
  const BATCH = 100;
  let upserted = 0;
  const errors: string[] = [];
  for (let i = 0; i < retailers.length; i += BATCH) {
    const chunk = retailers.slice(i, i + BATCH);
    const { error } = await supabase
      .from("retailers")
      .upsert(chunk, { onConflict: "id" });
    if (error) {
      errors.push(`batch ${i}: ${error.message}`);
    } else {
      upserted += chunk.length;
    }
  }
  result.retailers_upserted = upserted;
  result.retailer_errors = errors;

  // Reassign visits to Mokshith for these retailer ids
  const ids = retailers.map((r: any) => r.id);
  const idChunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 200) idChunks.push(ids.slice(i, i + 200));

  let visitsUpdated = 0;
  let ordersUpdated = 0;
  for (const c of idChunks) {
    const { count: vc } = await supabase
      .from("visits")
      .update({ user_id: MOKSHITH }, { count: "exact" })
      .eq("user_id", MANVITH)
      .in("retailer_id", c);
    visitsUpdated += vc ?? 0;

    const { count: oc } = await supabase
      .from("orders")
      .update({ user_id: MOKSHITH }, { count: "exact" })
      .eq("user_id", MANVITH)
      .in("retailer_id", c);
    ordersUpdated += oc ?? 0;
  }
  result.visits_reassigned = visitsUpdated;
  result.orders_reassigned = ordersUpdated;

  // Audit log entry per beat
  const beatIds = Array.from(new Set(retailers.map((r: any) => r.beat_id)));
  const auditRows = beatIds.map((b) => ({
    beat_id: b,
    action: "restore_from_snapshot",
    performed_by: MOKSHITH,
    metadata: { source: "snapshot_csv", reassigned_to: "Mokshith", from: "Manvith" },
  }));
  const { error: auditErr } = await supabase.from("beat_audit_log").insert(auditRows);
  result.audit_inserted = auditErr ? `error: ${auditErr.message}` : auditRows.length;

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});