// Sardar restore audit (READ-ONLY). Phase 1 of the phased restore plan.
// - Admin-only.
// - Accepts mode: "audit" only. mode: "apply" is intentionally rejected here.
// - Performs zero writes against retailers / orders / visits.
// - Records each audit invocation in public.sardar_restore_audit_runs.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { SARDAR_ID, SARDAR_SNAPSHOT } from '../_shared/sardar-snapshot.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Bucket =
  | 'OK_PRESENT_OWNED_BY_SARDAR'
  | 'MISSING'
  | 'OWNED_BY_OTHER_USER'
  | 'FIELDS_DRIFTED'
  | 'DUPLICATE_BY_PHONE_OR_NAME';

const DRIFT_FIELDS = [
  'name', 'phone', 'beat_id', 'beat_name', 'address',
  'latitude', 'longitude', 'gst_number', 'category',
  'retail_type', 'status', 'parent_name', 'owner_id',
] as const;

function normalizeName(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function normalizePhone(s: string | null | undefined): string {
  const d = (s ?? '').replace(/\D+/g, '');
  return d.length >= 10 ? d.slice(-10) : d;
}
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function valuesDiffer(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) a = '' as unknown;
  if (b === null || b === undefined) b = '' as unknown;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) > 1e-6;
  }
  return String(a).trim() !== String(b).trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
  const callerId = claims.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data: isAdmin, error: adminErr } = await admin.rpc('is_system_admin', { _user_id: callerId });
  if (adminErr || !isAdmin) {
    return new Response(JSON.stringify({ error: 'forbidden', detail: 'system admin only' }), {
      status: 403, headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  let body: { mode?: string } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const mode = body.mode ?? 'audit';
  if (mode !== 'audit') {
    return new Response(JSON.stringify({
      error: 'apply mode not enabled in phase 1',
      detail: 'This function only supports { mode: "audit" }. Phases 2-4 require separate approval.',
    }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }

  // Rate limit: 1 audit per minute per admin
  const { data: recent } = await admin
    .from('sardar_restore_audit_runs')
    .select('id, run_at')
    .eq('run_by', callerId)
    .gte('run_at', new Date(Date.now() - 60_000).toISOString())
    .limit(1);
  if (recent && recent.length > 0) {
    return new Response(JSON.stringify({
      error: 'rate_limited',
      detail: 'Wait a minute before running another audit.',
    }), { status: 429, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  }

  // Fetch live state.
  const snapshotIds = (SARDAR_SNAPSHOT as ReadonlyArray<Record<string, unknown>>)
    .map((r) => r.id as string);

  // 1) Live rows for snapshot ids (id-by-id, batched).
  const liveById = new Map<string, Record<string, unknown>>();
  const BATCH = 200;
  for (let i = 0; i < snapshotIds.length; i += BATCH) {
    const chunk = snapshotIds.slice(i, i + BATCH);
    const { data, error } = await admin.from('retailers').select('*').in('id', chunk);
    if (error) {
      return new Response(JSON.stringify({ step: 'fetch_live_by_id', error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }
    for (const r of data ?? []) liveById.set(r.id as string, r);
  }

  // 2) Live Sardar rows (to detect duplicates and current ownership stats).
  const { data: sardarRows, error: sErr } = await admin
    .from('retailers').select('id, name, phone').eq('user_id', SARDAR_ID);
  if (sErr) {
    return new Response(JSON.stringify({ step: 'fetch_sardar', error: sErr.message }), {
      status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  // Build duplicate indexes from ALL retailers for snapshot rows that are MISSING.
  // To avoid pulling the whole table, query candidates by normalized phone/name
  // for snapshot rows whose id is not present.
  const missingIds = snapshotIds.filter((id) => !liveById.has(id));
  const missingRows = (SARDAR_SNAPSHOT as ReadonlyArray<Record<string, unknown>>)
    .filter((r) => missingIds.includes(r.id as string));

  const candidatePhones = Array.from(new Set(
    missingRows.map((r) => normalizePhone(r.phone as string)).filter((p) => p.length === 10),
  ));
  const candidateNames = Array.from(new Set(
    missingRows.map((r) => normalizeName(r.name as string)).filter((n) => n.length > 0),
  ));

  const dupByPhone = new Map<string, Array<{ id: string; user_id: string | null }>>();
  const dupByName = new Map<string, Array<{ id: string; user_id: string | null }>>();

  if (candidatePhones.length > 0) {
    for (let i = 0; i < candidatePhones.length; i += BATCH) {
      const chunk = candidatePhones.slice(i, i + BATCH);
      // Postgres can't do "last 10 digits" easily, so we fetch by exact phone match
      // AND its common prefixed variants. Snapshot phones are already 10-digit.
      const { data, error } = await admin
        .from('retailers').select('id, user_id, phone, name').in('phone', chunk);
      if (error) continue;
      for (const r of data ?? []) {
        const k = normalizePhone(r.phone as string);
        if (!k) continue;
        const arr = dupByPhone.get(k) ?? [];
        arr.push({ id: r.id as string, user_id: r.user_id as string | null });
        dupByPhone.set(k, arr);
      }
    }
  }

  if (candidateNames.length > 0) {
    // Fetch in name chunks (ilike not practical for 100+ names — use exact lower(name) via in()).
    // We approximate by pulling rows whose lowercased name matches any candidate exactly.
    // To stay bounded, pull rows by raw name in batches.
    const rawNames = Array.from(new Set(
      missingRows.map((r) => (r.name as string ?? '').trim()).filter(Boolean),
    ));
    for (let i = 0; i < rawNames.length; i += BATCH) {
      const chunk = rawNames.slice(i, i + BATCH);
      const { data, error } = await admin
        .from('retailers').select('id, user_id, name').in('name', chunk);
      if (error) continue;
      for (const r of data ?? []) {
        const k = normalizeName(r.name as string);
        if (!k) continue;
        const arr = dupByName.get(k) ?? [];
        arr.push({ id: r.id as string, user_id: r.user_id as string | null });
        dupByName.set(k, arr);
      }
    }
  }

  // Classify.
  const rows: Array<{
    retailer_id: string;
    snapshot_name: string;
    snapshot_phone: string;
    snapshot_beat_id: string;
    current_user_id: string;
    current_name: string;
    current_phone: string;
    bucket: Bucket;
    drift_fields: string;
    conflict_reason: string;
  }> = [];

  const counts: Record<Bucket, number> = {
    OK_PRESENT_OWNED_BY_SARDAR: 0,
    MISSING: 0,
    OWNED_BY_OTHER_USER: 0,
    FIELDS_DRIFTED: 0,
    DUPLICATE_BY_PHONE_OR_NAME: 0,
  };

  for (const snap of SARDAR_SNAPSHOT as ReadonlyArray<Record<string, unknown>>) {
    const id = snap.id as string;
    const live = liveById.get(id);
    let bucket: Bucket;
    let drift_fields = '';
    let conflict_reason = '';

    if (!live) {
      const phoneKey = normalizePhone(snap.phone as string);
      const nameKey = normalizeName(snap.name as string);
      const phoneDup = phoneKey ? (dupByPhone.get(phoneKey) ?? []) : [];
      const nameDup = nameKey ? (dupByName.get(nameKey) ?? []) : [];
      if (phoneDup.length > 0 || nameDup.length > 0) {
        bucket = 'DUPLICATE_BY_PHONE_OR_NAME';
        conflict_reason = [
          phoneDup.length > 0 ? `phone matches ${phoneDup.length}` : '',
          nameDup.length > 0 ? `name matches ${nameDup.length}` : '',
        ].filter(Boolean).join('; ');
      } else {
        bucket = 'MISSING';
      }
    } else if ((live.user_id as string) !== SARDAR_ID) {
      bucket = 'OWNED_BY_OTHER_USER';
      conflict_reason = `live user_id=${live.user_id}`;
    } else {
      const diffs: string[] = [];
      for (const f of DRIFT_FIELDS) {
        if (valuesDiffer(live[f], snap[f])) diffs.push(f);
      }
      if (diffs.length === 0) {
        bucket = 'OK_PRESENT_OWNED_BY_SARDAR';
      } else {
        bucket = 'FIELDS_DRIFTED';
        drift_fields = diffs.join('|');
      }
    }

    counts[bucket]++;
    rows.push({
      retailer_id: id,
      snapshot_name: (snap.name as string) ?? '',
      snapshot_phone: (snap.phone as string) ?? '',
      snapshot_beat_id: (snap.beat_id as string) ?? '',
      current_user_id: (live?.user_id as string) ?? '',
      current_name: (live?.name as string) ?? '',
      current_phone: (live?.phone as string) ?? '',
      bucket,
      drift_fields,
      conflict_reason,
    });
  }

  // Orphan orders/visits scan for May 20-21 (2026).
  const FROM = '2026-05-20T00:00:00Z';
  const TO = '2026-05-22T00:00:00Z';
  const bucketOf = new Map(rows.map((r) => [r.retailer_id, r.bucket]));
  const conflictIds = rows
    .filter((r) => r.bucket === 'MISSING' || r.bucket === 'OWNED_BY_OTHER_USER' || r.bucket === 'DUPLICATE_BY_PHONE_OR_NAME')
    .map((r) => r.retailer_id);

  const orphanOrders: Array<Record<string, unknown>> = [];
  if (conflictIds.length > 0) {
    for (let i = 0; i < conflictIds.length; i += BATCH) {
      const chunk = conflictIds.slice(i, i + BATCH);
      const { data } = await admin
        .from('orders')
        .select('id, retailer_id, retailer_name, user_id, total_amount, order_date, created_at')
        .in('retailer_id', chunk)
        .gte('created_at', FROM)
        .lt('created_at', TO);
      for (const o of data ?? []) orphanOrders.push(o);
    }
  }

  // Also include Sardar's orders in the window whose retailer_id is null (true orphans).
  const { data: nullRetailerOrders } = await admin
    .from('orders')
    .select('id, retailer_id, retailer_name, user_id, total_amount, order_date, created_at')
    .eq('user_id', SARDAR_ID)
    .is('retailer_id', null)
    .gte('created_at', FROM)
    .lt('created_at', TO);
  for (const o of nullRetailerOrders ?? []) orphanOrders.push(o);

  const orphanOrderCount = orphanOrders.length;

  // Build CSVs.
  const auditCsvHeader = 'retailer_id,snapshot_name,snapshot_phone,snapshot_beat_id,current_user_id,current_name,current_phone,bucket,drift_fields,conflict_reason';
  const auditCsvBody = rows.map((r) => [
    r.retailer_id, r.snapshot_name, r.snapshot_phone, r.snapshot_beat_id,
    r.current_user_id, r.current_name, r.current_phone, r.bucket,
    r.drift_fields, r.conflict_reason,
  ].map(csvEscape).join(',')).join('\n');
  const auditCsv = auditCsvHeader + '\n' + auditCsvBody + '\n';

  const ordersCsvHeader = 'order_id,retailer_id,retailer_name,user_id,total_amount,order_date,created_at,retailer_bucket';
  const ordersCsvBody = orphanOrders.map((o) => [
    o.id, o.retailer_id ?? '', o.retailer_name ?? '', o.user_id ?? '',
    o.total_amount ?? '', o.order_date ?? '', o.created_at ?? '',
    o.retailer_id ? (bucketOf.get(o.retailer_id as string) ?? '') : 'NULL_RETAILER_ID',
  ].map(csvEscape).join(',')).join('\n');
  const ordersCsv = ordersCsvHeader + '\n' + ordersCsvBody + '\n';

  // Sardar current totals.
  const { count: sardarRetailerCount } = await admin
    .from('retailers').select('*', { count: 'exact', head: true }).eq('user_id', SARDAR_ID);

  const summary = {
    snapshot_count: SARDAR_SNAPSHOT.length,
    sardar_retailers_now: sardarRetailerCount ?? null,
    buckets: counts,
    orphan_orders_may_20_21: orphanOrderCount,
    window: { from: FROM, to: TO },
    mode: 'audit',
    generated_at: new Date().toISOString(),
  };

  const { data: runInsert } = await admin
    .from('sardar_restore_audit_runs')
    .insert({ run_by: callerId, mode: 'audit', summary })
    .select('id')
    .single();

  return new Response(JSON.stringify({
    ok: true,
    read_only: true,
    run_id: runInsert?.id ?? null,
    summary,
    audit_csv: auditCsv,
    orphan_orders_csv: ordersCsv,
  }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
});
