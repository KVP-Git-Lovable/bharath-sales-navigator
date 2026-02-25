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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller via getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("is_system_admin", { _user_id: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cutoffDate = new Date("2026-01-31T23:59:59.999Z");

    // List all files in invoices bucket (root level and subdirectories)
    const allFiles: string[] = [];

    // First get top-level items
    const { data: topLevel, error: topErr } = await supabase.storage
      .from("invoices")
      .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });

    if (topErr) throw topErr;

    const folders: string[] = [];

    for (const item of topLevel || []) {
      if (item.id) {
        // It's a file
        if (new Date(item.created_at) <= cutoffDate) {
          allFiles.push(item.name);
        }
      } else {
        // It's a folder
        folders.push(item.name);
      }
    }

    // List files in each subdirectory
    for (const folder of folders) {
      let offset = 0;
      while (true) {
        const { data: folderFiles, error } = await supabase.storage
          .from("invoices")
          .list(folder, { limit: 1000, offset, sortBy: { column: "created_at", order: "asc" } });

        if (error) break;
        if (!folderFiles || folderFiles.length === 0) break;

        for (const file of folderFiles) {
          if (file.id && new Date(file.created_at) <= cutoffDate) {
            allFiles.push(`${folder}/${file.name}`);
          }
        }

        if (folderFiles.length < 1000) break;
        offset += 1000;
      }
    }

    console.log(`Found ${allFiles.length} files to delete`);

    // Delete in batches of 100
    let deleted = 0;
    let failed = 0;

    for (let i = 0; i < allFiles.length; i += 100) {
      const batch = allFiles.slice(i, i + 100);
      const { error } = await supabase.storage.from("invoices").remove(batch);
      if (error) {
        console.error(`Batch delete error:`, error);
        failed += batch.length;
      } else {
        deleted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_found: allFiles.length,
        deleted,
        failed,
        cutoff_date: "2026-01-31",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
