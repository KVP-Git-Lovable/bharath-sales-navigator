import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Calendar, AlertCircle, Info, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { useFYWorkingDays, MonthlyWorkingDays } from '@/hooks/useWorkingDaysCalculator';
import { cn } from '@/lib/utils';

export type AdjustmentMode = 'redistribute' | 'reduce';

interface TargetAdjustmentSettingsProps {
  userId: string | undefined;
  fyYear: number;
  autoAdjust: boolean;
  adjustmentMode: AdjustmentMode;
  onAutoAdjustChange: (enabled: boolean) => void;
  onAdjustmentModeChange: (mode: AdjustmentMode) => void;
  className?: string;
}

const FY_MONTH_NAMES = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
];

export function TargetAdjustmentSettings({
  userId,
  fyYear,
  autoAdjust,
  adjustmentMode,
  onAutoAdjustChange,
  onAdjustmentModeChange,
  className,
}: TargetAdjustmentSettingsProps) {
  const { data: workingDays, isLoading } = useFYWorkingDays(userId, fyYear);

  // Calculate totals
  const totals = workingDays
    ? Object.values(workingDays).reduce(
        (acc, month) => ({
          holidays: acc.holidays + month.holidays,
          leaves: acc.leaves + month.approvedLeaves,
          totalDays: acc.totalDays + month.totalDaysInMonth,
          workingDays: acc.workingDays + month.effectiveWorkingDays,
        }),
        { holidays: 0, leaves: 0, totalDays: 0, workingDays: 0 }
      )
    : { holidays: 0, leaves: 0, totalDays: 0, workingDays: 0 };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Target Adjustment Settings
        </CardTitle>
        <CardDescription>
          Automatically adjust targets based on holidays and approved leaves
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-2xl font-bold">{totals.workingDays}</p>
            <p className="text-xs text-muted-foreground">Working Days</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-600">{totals.holidays}</p>
            <p className="text-xs text-muted-foreground">Holidays</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">{totals.leaves}</p>
            <p className="text-xs text-muted-foreground">Approved Leaves</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-2xl font-bold">{totals.totalDays - totals.workingDays}</p>
            <p className="text-xs text-muted-foreground">Non-Working</p>
          </div>
        </div>

        {/* Auto-Adjust Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Switch
              id="auto-adjust"
              checked={autoAdjust}
              onCheckedChange={onAutoAdjustChange}
            />
            <div>
              <Label htmlFor="auto-adjust" className="font-medium cursor-pointer">
                Auto-adjust targets
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically recalculate daily targets based on working days
              </p>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>When enabled, targets will be adjusted based on holidays and approved leaves for each user.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Adjustment Mode */}
        {autoAdjust && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Adjustment Mode</Label>
            <RadioGroup
              value={adjustmentMode}
              onValueChange={(v) => onAdjustmentModeChange(v as AdjustmentMode)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <label
                className={cn(
                  'flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
                  adjustmentMode === 'redistribute' && 'border-primary bg-primary/5'
                )}
              >
                <RadioGroupItem value="redistribute" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-primary" />
                    <span className="font-medium">Redistribute</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Spread the same total target across remaining working days (higher daily targets)
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  'flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
                  adjustmentMode === 'reduce' && 'border-primary bg-primary/5'
                )}
              >
                <RadioGroupItem value="reduce" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Reduce</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Proportionally reduce total target based on non-working days
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>
        )}

        {/* Monthly Breakdown (Collapsed by default) */}
        {workingDays && autoAdjust && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
              <span>View Monthly Breakdown</span>
              <Badge variant="outline" className="text-xs">
                {Object.keys(workingDays).length} months
              </Badge>
            </summary>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(workingDays).map(([monthKey, data]) => {
                const monthIndex = parseInt(monthKey) - 1;
                const hasAdjustments = data.holidays > 0 || data.approvedLeaves > 0;
                return (
                  <div
                    key={monthKey}
                    className={cn(
                      'p-2 rounded border text-center text-xs',
                      hasAdjustments && 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950'
                    )}
                  >
                    <p className="font-medium">{FY_MONTH_NAMES[monthIndex]}</p>
                    <p className="text-muted-foreground">
                      {data.effectiveWorkingDays} / {data.totalDaysInMonth} days
                    </p>
                    {hasAdjustments && (
                      <div className="flex justify-center gap-1 mt-1">
                        {data.holidays > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1">
                            {data.holidays}H
                          </Badge>
                        )}
                        {data.approvedLeaves > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1">
                            {data.approvedLeaves}L
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
