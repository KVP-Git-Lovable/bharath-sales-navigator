import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, RefreshCw } from 'lucide-react';

interface ActivityRow {
  full_name: string;
  total_usage_seconds: number;
  most_used_module: string;
  most_used_count: number;
  least_used_module: string;
  least_used_count: number;
  data_usage_bytes: number;
}

function formatUsageTime(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDataUsage(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
}

const RANGE_OPTIONS = [
  { label: 'Today', days: 1 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
];

export const ActivityLoggingSection = () => {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_activity_logging_summary', { p_days: days });
      if (error) throw error;
      setRows((data as unknown as ActivityRow[]) || []);
    } catch (e: any) {
      console.error('Activity fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold text-foreground">Activity Logging</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.days}
                variant={days === opt.days ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDays(opt.days)}
              >
                {opt.label}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="h-7 ml-1" onClick={fetchActivity} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">No activity data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Usage Time</TableHead>
                  <TableHead>Most Used</TableHead>
                  <TableHead>Least Used</TableHead>
                  <TableHead>Data Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell>{formatUsageTime(row.total_usage_seconds)}</TableCell>
                    <TableCell>
                      <span>{row.most_used_module}</span>
                      {row.most_used_count > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">({row.most_used_count})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span>{row.least_used_module}</span>
                      {row.least_used_count > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">({row.least_used_count})</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDataUsage(row.data_usage_bytes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
