import { supabase } from '@/integrations/supabase/client';

/**
 * Startup schema health check.
 *
 * Detects when columns the product/order flow depends on have been silently
 * dropped (Lovable schema-snapshot reconcile, manual migration, etc.).
 * When critical order columns are missing, order submission is blocked so
 * salesmen don't queue orders that will dead-letter after 48h x 5 retries.
 * Product-display columns (products.rate, products.unit,
 * product_variants.variant_name) are surfaced in the banner too so the
 * "₹0 / 0 variants" regression cannot ship silently again.
 */

export type CriticalColumn =
  | 'order_items.rate'
  | 'product_variants.price'
  | 'products.rate'
  | 'products.unit'
  | 'products.base_unit'
  | 'product_variants.variant_name';

// Columns that must exist before we allow an order to be queued/synced.
const ORDER_BLOCKING: CriticalColumn[] = [
  'order_items.rate',
  'product_variants.price',
];

export interface SchemaHealthResult {
  ok: boolean;
  missing: CriticalColumn[];
  checkedAt: number;
}

const CACHE_KEY = 'schemaHealth:v2';
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

async function probe(table: string, column: string): Promise<boolean> {
  try {
    const { error } = await (supabase as any).from(table).select(column).limit(1);
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

  const checks: Array<{ key: CriticalColumn; table: string; column: string }> = [
    { key: 'order_items.rate',           table: 'order_items',      column: 'rate' },
    { key: 'product_variants.price',     table: 'product_variants', column: 'price' },
    { key: 'products.rate',              table: 'products',         column: 'rate' },
    { key: 'products.unit',              table: 'products',         column: 'unit' },
    { key: 'products.base_unit',         table: 'products',         column: 'base_unit' },
    { key: 'product_variants.variant_name', table: 'product_variants', column: 'variant_name' },
  ];

  const results = await Promise.all(checks.map((c) => probe(c.table, c.column)));
  const missing: CriticalColumn[] = checks
    .filter((_, i) => !results[i])
    .map((c) => c.key);

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

/** True if the cache says order-critical columns are missing. */
export function isOrderPlacementBlocked(): boolean {
  const cached = readCache();
  if (!cached) return false;
  return cached.missing.some((m) => ORDER_BLOCKING.includes(m));
}

export const SCHEMA_HEALTH_EVENT = EVENT_NAME;