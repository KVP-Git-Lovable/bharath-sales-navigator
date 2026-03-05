import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { file_url } = await req.json();

    if (!file_url) {
      return new Response(JSON.stringify({ error: "file_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file
    console.log("Downloading file from:", file_url);
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.status}`);
    }
    const arrayBuffer = await fileResponse.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Parse Excel
    console.log("Parsing Excel file...");
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    console.log(`Parsed ${rows.length} rows`);

    // Map columns
    const records = rows.map((row: any) => ({
      company_name: (row["COMPANY NAME"] || "").toString().trim(),
      address: (row["ADD"] || "").toString().trim() || null,
      city: (row["CITY"] || "").toString().trim(),
      pincode: (row["PIN"] || "").toString().trim() || null,
      state: (row["STATE"] || "").toString().trim(),
      mobile: (row["MOBILE No."] || "").toString().trim() || null,
      email: (row["EMAIL"] || "").toString().trim() || null,
      website: (row["WEB"] || "").toString().trim() || null,
      category: (row["DETAILS"] || "").toString().trim() || null,
    })).filter(r => r.company_name && r.city && r.state);

    console.log(`Mapped ${records.length} valid records`);

    // Batch insert in chunks of 500
    const chunkSize = 500;
    let inserted = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const { error } = await supabase.from("retailer_external_db").insert(chunk);
      if (error) {
        console.error(`Batch ${Math.floor(i / chunkSize)} error:`, error);
        return new Response(JSON.stringify({ error: error.message, inserted, batch: Math.floor(i / chunkSize) }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted += chunk.length;
      console.log(`Inserted batch ${Math.floor(i / chunkSize)}: ${inserted}/${records.length}`);
    }

    return new Response(JSON.stringify({ success: true, inserted, total_parsed: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
