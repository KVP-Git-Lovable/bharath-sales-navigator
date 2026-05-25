import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import orders from "./orders.json" with { type: "json" };
import items from "./items.json" with { type: "json" };

const MOKSHITH = "73044cad-2c19-4a47-89f1-6a755adc3362";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const report: Record<string, unknown> = {};

  // Build retailer name -> id map (Mokshith's retailers)
  const { data: retailers, error: rErr } = await supabase
    .from("retailers")
    .select("id, name")
    .eq("user_id", MOKSHITH);
  if (rErr) return json({ error: rErr.message }, 500);
  const rMap = new Map<string, string>();
  for (const r of retailers ?? []) rMap.set((r.name ?? "").trim().toLowerCase(), r.id);

  // Build product name -> {id, hsn_code} map
  const { data: products } = await supabase.from("products").select("id, name, hsn_code");
  const pMap = new Map<string, { id: string; hsn_code: string | null }>();
  for (const p of products ?? []) pMap.set((p.name ?? "").trim().toLowerCase(), { id: p.id, hsn_code: p.hsn_code });

  // Insert orders
  const orderRows: any[] = [];
  const missingRetailers: string[] = [];
  for (const o of orders as any[]) {
    const rid = rMap.get(o.retailer_name.trim().toLowerCase());
    if (!rid) { missingRetailers.push(o.retailer_name); continue; }
    orderRows.push({
      id: o.id,
      user_id: o.user_id,
      retailer_id: rid,
      retailer_name: o.retailer_name,
      total_amount: o.total_amount,
      subtotal: o.total_amount,
      status: "confirmed",
      sales_channel: "field",
      order_date: o.created_at.slice(0, 10),
      created_at: o.created_at,
      updated_at: o.created_at,
    });
  }
  const { error: oErr, count: oCount } = await supabase
    .from("orders")
    .upsert(orderRows, { onConflict: "id", count: "exact" });
  report.orders_upserted = oCount ?? orderRows.length;
  report.orders_error = oErr?.message ?? null;
  report.missing_retailers = missingRetailers;

  // Insert order_items with deterministic UUIDs (order_id + product_name + idx)
  const itemRows: any[] = [];
  const missingProducts: string[] = [];
  const seen = new Map<string, number>();
  for (const it of items as any[]) {
    const key = it.order_id;
    const idx = (seen.get(key) ?? 0) + 1;
    seen.set(key, idx);
    const detId = await deterministicUuid(`${it.order_id}|${it.product_name}|${idx}`);
    const prod = pMap.get(it.product_name.trim().toLowerCase());
    if (!prod) missingProducts.push(it.product_name);
    itemRows.push({
      id: detId,
      order_id: it.order_id,
      product_id: prod?.id ?? null,
      hsn_code: prod?.hsn_code ?? null,
      product_name: it.product_name,
      category: it.category ?? "Uncategorized",
      unit: it.unit ?? "Unit",
      quantity: it.quantity,
      rate: it.rate,
      original_rate: it.rate,
      discount_amount: it.discount_amount,
      cgst_amount: it.cgst_amount,
      sgst_amount: it.sgst_amount,
      total: it.total,
    });
  }
  const { error: iErr, count: iCount } = await supabase
    .from("order_items")
    .upsert(itemRows, { onConflict: "id", count: "exact" });
  report.items_upserted = iCount ?? itemRows.length;
  report.items_error = iErr?.message ?? null;
  report.missing_products = [...new Set(missingProducts)];

  return json(report);
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

async function deterministicUuid(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const b = new Uint8Array(buf).slice(0, 16);
  b[6] = (b[6] & 0x0f) | 0x40; // v4
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}