import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  runSchemaHealthCheck,
  getCachedSchemaHealth,
  SCHEMA_HEALTH_EVENT,
  type SchemaHealthResult,
} from '@/utils/schemaHealthCheck';

/**
 * Sticky banner shown when critical DB columns (order_items.rate /
 * product_variants.price) are missing. Runs the probe on mount and on every
 * `online` event. Stays mounted at App level alongside SlowConnectionBanner.
 */
export function SchemaHealthBanner() {
  const [health, setHealth] = useState<SchemaHealthResult | null>(() => getCachedSchemaHealth());

  useEffect(() => {
    let cancelled = false;

    const check = (force = false) => {
      runSchemaHealthCheck({ force })
        .then((r) => {
          if (!cancelled) setHealth(r);
        })
        .catch(() => {});
    };

    // Initial check on mount.
    check(false);

    const onOnline = () => check(true);
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<SchemaHealthResult>).detail;
      if (detail) setHealth(detail);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener(SCHEMA_HEALTH_EVENT, onEvent as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener(SCHEMA_HEALTH_EVENT, onEvent as EventListener);
    };
  }, []);

  if (!health || health.ok) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[300] bg-orange-100 border-b border-orange-300 text-orange-900 px-4 py-2 shadow-md">
      <div className="max-w-7xl mx-auto flex items-start gap-3 text-sm">
        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-semibold">Database schema issue detected</div>
          <div className="text-xs opacity-90 mt-0.5">
            Missing columns:{' '}
            <code className="font-mono">{health.missing.join(', ')}</code>. Order
            placement is disabled to prevent data loss. Please contact your admin
            immediately.
          </div>
        </div>
      </div>
    </div>
  );
}