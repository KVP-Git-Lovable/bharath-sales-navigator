// One-shot: restore Sardar beats from his current retailer rows.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SARDAR = '6220fc85-ae7f-4c22-9694-db6c47fe8fb0';
const SARDAR_NAME = 'Sardar';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 1) distinct beats from Sardar's retailers
  const { data: rets, error: rErr } = await supa
    .from('retailers')
    .select('beat_id, beat_name')
    .eq('user_id', SARDAR);
  if (rErr) return new Response(JSON.stringify({ step: 'fetch_retailers', error: rErr.message }), { status: 500, headers: corsHeaders });

  const distinct = new Map<string, string>();
  for (const r of rets ?? []) {
    const bid = (r.beat_id as string | null)?.trim();
    if (!bid || bid === 'unassigned') continue;
    const bname = ((r.beat_name as string | null) ?? bid).trim() || bid;
    if (!distinct.has(bid)) distinct.set(bid, bname);
  }

  // 2) which already exist
  const ids = Array.from(distinct.keys());
  const existing = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data } = await supa.from('beats').select('beat_id').in('beat_id', chunk);
    for (const b of data ?? []) existing.add(b.beat_id as string);
  }

  // 3) insert missing
  const toInsert = ids
    .filter((id) => !existing.has(id))
    .map((id) => ({
      beat_id: id,
      beat_name: distinct.get(id)!,
      is_active: true,
      user_id: SARDAR,
      owner_id: SARDAR,
      owner_name: SARDAR_NAME,
      created_by: SARDAR,
    }));

  const errors: unknown[] = [];
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const chunk = toInsert.slice(i, i + 100);
    const { error, count } = await supa.from('beats').insert(chunk, { count: 'exact' });
    if (error) errors.push({ batch: i, error: error.message });
    else inserted += count ?? chunk.length;
  }

  const { count: beatsNow } = await supa
    .from('beats').select('*', { count: 'exact', head: true }).eq('user_id', SARDAR);

  return new Response(JSON.stringify({
    ok: errors.length === 0,
    distinct_beats: distinct.size,
    already_existed: existing.size,
    attempted: toInsert.length,
    inserted,
    errors,
    sardar_beats_now: beatsNow,
  }, null, 2), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
});