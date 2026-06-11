import { supabase } from '@/integrations/supabase/client';

/**
 * Startup schema health check.
 *
 * Detects when critical columns (order_items.rate, product_variants.price)
 * have been silently dropped by a Lovable schema-snapshot reconcile.
 * When missing, the UI surfaces a hard banner and order submission is blocked
 * so salesmen don't queue orders that will dead-letter after 48h x 5 retries.
 */

export type CriticalColumn = 'order_items.rate' | 'product_variants.price';

export interface SchemaHealthResult {
  ok: boolean;
  missing: CriticalColumn[];
  checkedAt: number;
}

const CACHE_KEY = 'schemaHealth:v1';
const CACHE_TTL_MS = 5 * 60 * 1000;
const EVENT_NAME = 'schemaHealthChanged';

function readCache(): SchemaHealthResult | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SchemaHealthResult;
    if (Date.now() - parsed.checkedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(result: SchemaHealthResult) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: result }));
  } catch {
    // sessionStorage may be unavailable (private mode); ignore.
  }
}

function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    msg.includes('does not exist') ||
    msg.includes('could not find') // PostgREST cache miss
  );
}

async function probe(
  table: 'order_items' | 'product_variants',
  column: 'rate' | 'price',
): Promise<boolean> {
  try {
    const { error } = await supabase.from(table).select(column).limit(1);
    if (error && isMissingColumnError(error)) return false;
    return true; // any other error (network/RLS) is NOT a schema problem
  } catch {
    return true;
  }
}

export async function runSchemaHealthCheck(
  options: { force?: boolean } = {},
): Promise<SchemaHealthResult> {
  if (!options.force) {
    const cached = readCache();
    if (cached) return cached;
  }

  const [rateOk, priceOk] = await Promise.all([
    probe('order_items', 'rate'),
    probe('product_variants', 'price'),
  ]);

  const missing: CriticalColumn[] = [];
  if (!rateOk) missing.push('order_items.rate');
  if (!priceOk) missing.push('product_variants.price');

  const result: SchemaHealthResult = {
    ok: missing.length === 0,
    missing,
    checkedAt: Date.now(),
  };
  writeCache(result);
  return result;
}

/** Synchronous read of the cached result. Returns null if no check ran yet. */
export function getCachedSchemaHealth(): SchemaHealthResult | null {
  return readCache();
}

/** True if the cache says critical order columns are missing. */
export function isOrderPlacementBlocked(): boolean {
  const cached = readCache();
  if (!cached) return false;
  return cached.missing.length > 0;
}

export const SCHEMA_HEALTH_EVENT = EVENT_NAME;