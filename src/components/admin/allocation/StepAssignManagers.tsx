import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Users, Equal, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InlineStrategySelector } from '../TargetStrategySelector';
import type { TargetStrategy } from '../TargetStrategySelector';

const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num);
const formatCurrency = (num: number) => {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${formatNumber(num)}`;
};
const parseNumber = (value: string) => {
  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
};
const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const strategyDescriptions: Record<TargetStrategy, string> = {
  roll_down: 'Target will be distributed to subordinates',
  roll_up: 'Target = sum of subordinate targets',
  independent: 'Separate personal target, not linked to subordinates',
};

interface ManagerRow {
  userId: string;
  fullName: string;
  profilePictureUrl: string | null;
  designation?: string;
  subordinateCount: number;
  quantityTarget: number;
  revenueTarget: number;
  visitsTarget: number;
  targetStrategy: TargetStrategy;
}

interface StepAssignManagersProps {
  managers: ManagerRow[];
  totalQuantity: number;
  totalRevenue: number;
  totalVisits: number;
  quantityUnit: string;
  enabledMetrics: { quantity: boolean; revenue: boolean; visits: boolean };
  onTargetChange: (userId: string, field: string, value: number) => void;
  onStrategyChange: (userId: string, strategy: TargetStrategy) => void;
  onEqualSplit: () => void;
}

export function StepAssignManagers({
  managers,
  totalQuantity,
  totalRevenue,
  totalVisits,
  quantityUnit,
  enabledMetrics,
  onTargetChange,
  onStrategyChange,
  onEqualSplit,
}: StepAssignManagersProps) {
  const allocatedQty = managers.reduce((s, m) => s + m.quantityTarget, 0);
  const allocatedRev = managers.reduce((s, m) => s + m.revenueTarget, 0);
  const allocatedVis = managers.reduce((s, m) => s + m.visitsTarget, 0);

  const qtyPct = totalQuantity > 0 ? Math.min(100, (allocatedQty / totalQuantity) * 100) : 0;
  const revPct = totalRevenue > 0 ? Math.min(100, (allocatedRev / totalRevenue) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Remaining to allocate bar */}
      <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Target to Distribute</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onEqualSplit}>
              <Equal className="h-3 w-3" /> Equal Split
            </Button>
          </div>
        </div>

        {enabledMetrics.quantity && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Qty: {formatNumber(allocatedQty)} / {formatNumber(totalQuantity)} {quantityUnit}</span>
              <span className={cn('font-medium', allocatedQty > totalQuantity ? 'text-destructive' : allocatedQty === totalQuantity ? 'text-emerald-600' : 'text-muted-foreground')}>
                {totalQuantity - allocatedQty > 0 ? `${formatNumber(totalQuantity - allocatedQty)} remaining` : allocatedQty === totalQuantity ? '✓ Fully allocated' : `Over by ${formatNumber(allocatedQty - totalQuantity)}`}
              </span>
            </div>
            <Progress value={qtyPct} className="h-2" />
          </div>
        )}
        {enabledMetrics.revenue && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Revenue: {formatCurrency(allocatedRev)} / {formatCurrency(totalRevenue)}</span>
              <span className={cn('font-medium', allocatedRev > totalRevenue ? 'text-destructive' : allocatedRev === totalRevenue ? 'text-emerald-600' : 'text-muted-foreground')}>
                {totalRevenue - allocatedRev > 0 ? `${formatCurrency(totalRevenue - allocatedRev)} remaining` : allocatedRev === totalRevenue ? '✓ Fully allocated' : `Over by ${formatCurrency(allocatedRev - totalRevenue)}`}
              </span>
            </div>
            <Progress value={revPct} className="h-2" />
          </div>
        )}
      </div>

      {/* Manager cards */}
      <div className="space-y-3">
        {managers.map((mgr) => (
          <div
            key={mgr.userId}
            className="p-4 rounded-lg border bg-card space-y-3"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={mgr.profilePictureUrl || undefined} alt={mgr.fullName} />
                <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">{getInitials(mgr.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{mgr.fullName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {mgr.designation && <span className="text-xs text-muted-foreground">{mgr.designation}</span>}
                  <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0 h-4">
                    <Users className="h-2.5 w-2.5" />{mgr.subordinateCount}
                  </Badge>
                </div>
              </div>
              <InlineStrategySelector
                value={mgr.targetStrategy}
                onChange={(s) => onStrategyChange(mgr.userId, s)}
              />
            </div>

            {/* Strategy description */}
            <p className="text-[11px] text-muted-foreground italic pl-[52px]">
              {strategyDescriptions[mgr.targetStrategy]}
            </p>

            {/* Target inputs */}
            <div className="flex flex-wrap items-center gap-3 pl-[52px]">
              {enabledMetrics.quantity && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Qty</span>
                  <Input
                    type="text"
                    value={mgr.quantityTarget > 0 ? formatNumber(mgr.quantityTarget) : ''}
                    onChange={(e) => onTargetChange(mgr.userId, 'quantityTarget', parseNumber(e.target.value))}
                    placeholder="0"
                    className="h-9 w-24 text-right text-sm"
                  />
                  <span className="text-xs text-muted-foreground">{quantityUnit}</span>
                </div>
              )}
              {enabledMetrics.revenue && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">₹</span>
                  <Input
                    type="text"
                    value={mgr.revenueTarget > 0 ? formatNumber(mgr.revenueTarget) : ''}
                    onChange={(e) => onTargetChange(mgr.userId, 'revenueTarget', parseNumber(e.target.value))}
                    placeholder="0"
                    className="h-9 w-28 text-right text-sm"
                  />
                </div>
              )}
              {enabledMetrics.visits && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Visits</span>
                  <Input
                    type="text"
                    value={mgr.visitsTarget > 0 ? formatNumber(mgr.visitsTarget) : ''}
                    onChange={(e) => onTargetChange(mgr.userId, 'visitsTarget', Math.round(parseNumber(e.target.value)))}
                    placeholder="0"
                    className="h-9 w-20 text-right text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
