import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, ShoppingCart, MapPin, Loader2 } from 'lucide-react';

type Period = 'this_month' | 'last_month';

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date();
  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: start.toISOString(), end: now.toISOString() };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const LicenseDetailsSection = () => {
  const [period, setPeriod] = useState<Period>('this_month');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ retailers: 0, orders: 0, visits: 0 });

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateRange(period);

    const [retailers, orders, visits] = await Promise.all([
      supabase.from('retailers').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
      supabase.from('visits').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
    ]);

    setCounts({
      retailers: retailers.count ?? 0,
      orders: orders.count ?? 0,
      visits: visits.count ?? 0,
    });
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const stats = [
    { label: 'Retailers', value: counts.retailers, icon: <Store className="h-5 w-5" /> },
    { label: 'Orders', value: counts.orders, icon: <ShoppingCart className="h-5 w-5" /> },
    { label: 'Visits', value: counts.visits, icon: <MapPin className="h-5 w-5" /> },
  ];

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg font-semibold text-foreground">License Details</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Current license plan:</span>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[140px] bg-white border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-4">
                <div className="text-primary">{s.icon}</div>
                <p className="text-2xl font-bold text-foreground">{s.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
