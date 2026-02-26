import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, Package, IndianRupee, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DistributionSummaryHeaderProps {
  targetPlanName: string;
  fyYear: number;
  isLocked?: boolean;
  enabledMetrics: {
    quantity: boolean;
    revenue: boolean;
    visits: boolean;
  };
  quantityUnit: string;
  totalQuantity: number;
  totalRevenue: number;
  totalVisits: number;
  allocatedQuantity: number;
  allocatedRevenue: number;
  allocatedVisits: number;
  selectedUserName?: string;
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num);

const formatCurrency = (num: number) => {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${formatNumber(num)}`;
};

export function DistributionSummaryHeader({
  targetPlanName,
  fyYear,
  isLocked,
  enabledMetrics,
  quantityUnit,
  totalQuantity,
  totalRevenue,
  totalVisits,
  allocatedQuantity,
  allocatedRevenue,
  allocatedVisits,
  selectedUserName,
}: DistributionSummaryHeaderProps) {
  // Calculate primary distribution percentage (use the first enabled metric)
  const getDistributionPercent = () => {
    if (enabledMetrics.quantity && totalQuantity > 0) {
      return Math.min(100, Math.round((allocatedQuantity / totalQuantity) * 100));
    }
    if (enabledMetrics.revenue && totalRevenue > 0) {
      return Math.min(100, Math.round((allocatedRevenue / totalRevenue) * 100));
    }
    if (enabledMetrics.visits && totalVisits > 0) {
      return Math.min(100, Math.round((allocatedVisits / totalVisits) * 100));
    }
    return 0;
  };

  const distributionPercent = getDistributionPercent();

  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-destructive';
  };

  const getStatusInfo = (pct: number) => {
    if (pct >= 100) return { label: 'Fully Distributed', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' };
    if (pct >= 90) return { label: 'Almost Complete', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' };
    if (pct >= 50) return { label: 'Partially Distributed', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400' };
    return { label: 'Needs Distribution', icon: AlertTriangle, color: 'text-destructive' };
  };

  const status = getStatusInfo(distributionPercent);
  const StatusIcon = status.icon;

  const metrics = [
    {
      enabled: enabledMetrics.quantity,
      label: 'Quantity',
      icon: Package,
      total: totalQuantity,
      allocated: allocatedQuantity,
      remaining: totalQuantity - allocatedQuantity,
      unit: quantityUnit,
      format: (n: number) => formatNumber(n),
    },
    {
      enabled: enabledMetrics.revenue,
      label: 'Revenue',
      icon: IndianRupee,
      total: totalRevenue,
      allocated: allocatedRevenue,
      remaining: totalRevenue - allocatedRevenue,
      unit: '',
      format: (n: number) => formatCurrency(n),
    },
    {
      enabled: enabledMetrics.visits,
      label: 'Visits',
      icon: Users,
      total: totalVisits,
      allocated: allocatedVisits,
      remaining: totalVisits - allocatedVisits,
      unit: 'visits',
      format: (n: number) => formatNumber(n),
    },
  ].filter(m => m.enabled);

  return (
    <Card className="border-primary/20 overflow-hidden">
      {/* Top accent bar */}
      <div className={cn('h-1', getProgressColor(distributionPercent))} />
      <CardContent className="py-4 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">
              {targetPlanName || 'FY Sales Plan'}
            </h3>
            {isLocked && (
              <Badge variant="default" className="gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm font-medium">
              FY {fyYear - 1}-{String(fyYear).slice(-2)}
            </Badge>
          </div>
        </div>

        {/* Distribution progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className={cn('h-4 w-4', status.color)} />
              <span className={cn('text-sm font-medium', status.color)}>
                {status.label}
              </span>
            </div>
            <span className="text-sm font-bold">{distributionPercent}%</span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn('h-full rounded-full transition-all duration-500', getProgressColor(distributionPercent))}
              style={{ width: `${Math.min(100, distributionPercent)}%` }}
            />
          </div>
        </div>

        {selectedUserName && (
          <p className="text-sm text-muted-foreground">
            Allocating for: <span className="font-medium text-foreground">{selectedUserName}</span>
          </p>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {metrics.map(metric => {
            const MetricIcon = metric.icon;
            const isOver = metric.remaining < 0;
            const pct = metric.total > 0 ? Math.round((metric.allocated / metric.total) * 100) : 0;

            return (
              <div key={metric.label} className="bg-muted/40 rounded-lg p-3 border space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-md">
                    <MetricIcon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {metric.label}
                  </span>
                  <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                    {pct}%
                  </Badge>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-lg font-bold">
                      {metric.format(metric.total)}
                    </p>
                    {metric.unit && (
                      <p className="text-xs text-muted-foreground">{metric.unit}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Assigned: <span className="font-medium text-foreground">{metric.format(metric.allocated)}</span>
                  </span>
                  <span className={cn(
                    'font-medium',
                    isOver ? 'text-destructive' : metric.remaining === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  )}>
                    {isOver ? `Over: ${metric.format(Math.abs(metric.remaining))}` : `Left: ${metric.format(metric.remaining)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
