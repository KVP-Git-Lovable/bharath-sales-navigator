import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("is_system_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cutoffDate = new Date("2026-01-31T23:59:59.999Z");

    // List all files in invoices bucket
    const allFiles: { name: string; created_at: string }[] = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
      const { data: files, error } = await supabase.storage
        .from("invoices")
        .list("", { limit, offset, sortBy: { column: "created_at", order: "asc" } });

      if (error) throw error;
      if (!files || files.length === 0) break;

      // Filter by date - files in subfolders need separate listing
      for (const file of files) {
        if (file.id) {
          // It's a file
          const fileDate = new Date(file.created_at);
          if (fileDate <= cutoffDate) {
            allFiles.push({ name: file.name, created_at: file.created_at });
          }
        }
      }

      if (files.length < limit) break;
      offset += limit;
    }

    // Also list files in subdirectories (user folders)
    const { data: topLevel } = await supabase.storage
      .from("invoices")
      .list("", { limit: 1000 });

    const folders = (topLevel || []).filter(f => !f.id); // folders have no id

    for (const folder of folders) {
      let folderOffset = 0;
      while (true) {
        const { data: folderFiles, error } = await supabase.storage
          .from("invoices")
          .list(folder.name, { limit, offset: folderOffset, sortBy: { column: "created_at", order: "asc" } });

        if (error) break;
        if (!folderFiles || folderFiles.length === 0) break;

        for (const file of folderFiles) {
          if (file.id) {
            const fileDate = new Date(file.created_at);
            if (fileDate <= cutoffDate) {
              allFiles.push({ name: `${folder.name}/${file.name}`, created_at: file.created_at });
            }
          }
        }

        if (folderFiles.length < limit) break;
        folderOffset += limit;
      }
    }

    console.log(`Found ${allFiles.length} files to delete`);

    // Delete in batches of 100
    let deleted = 0;
    let failed = 0;
    const batchSize = 100;

    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize).map(f => f.name);
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
