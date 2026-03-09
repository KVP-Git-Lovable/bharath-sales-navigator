import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_GEOCODING_API_KEY");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_GEOCODING_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { state, city, batch_size = 50 } = body;

    if (!state || !city) {
      return new Response(JSON.stringify({ error: "state and city are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch records without coordinates that have an address
    const { data: records, error: fetchErr } = await supabase
      .from("retailer_external_db")
      .select("id, address, city, state, pincode")
      .eq("state", state)
      .eq("city", city)
      .is("latitude", null)
      .not("address", "is", null)
      .neq("address", "")
      .limit(batch_size);

    if (fetchErr) throw fetchErr;

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ message: "No records to geocode", geocoded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Geocoding ${records.length} records for ${city}, ${state}`);
    let geocoded = 0;
    let failed = 0;

    for (const record of records) {
      try {
        const addressParts = [record.address, record.city, record.state, record.pincode, "India"]
          .filter(Boolean);
        const fullAddress = addressParts.join(", ");

        const geoResp = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_API_KEY}`
        );

        if (!geoResp.ok) {
          console.error(`API error for ${record.id}:`, geoResp.status);
          failed++;
          continue;
        }

        const geoData = await geoResp.json();

        if (geoData.status === "OK" && geoData.results?.length > 0) {
          const location = geoData.results[0].geometry.location;
          const { error: updateErr } = await supabase
            .from("retailer_external_db")
            .update({ latitude: location.lat, longitude: location.lng })
            .eq("id", record.id);

          if (updateErr) {
            console.error(`Update error for ${record.id}:`, updateErr);
            failed++;
          } else {
            geocoded++;
          }
        } else {
          console.log(`No result for ${record.id}: ${geoData.status}`);
          failed++;
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error geocoding ${record.id}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({ geocoded, failed, total: records.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
