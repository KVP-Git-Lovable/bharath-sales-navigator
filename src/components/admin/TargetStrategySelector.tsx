import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, Minus, Users, AlertTriangle, Ban } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

export type TargetStrategy = 'roll_down' | 'roll_up' | 'independent' | 'no_target';
export type SplitMethod = 'equal' | 'percentage' | 'manual';

interface TargetStrategySelectorProps {
  value: TargetStrategy;
  onChange: (strategy: TargetStrategy) => void;
  managerName?: string;
}

interface InlineStrategySelectorProps {
  value: TargetStrategy;
  onChange: (strategy: TargetStrategy) => void;
  disabled?: boolean;
}

export interface LevelInfo {
  level: number;
  userCount: number;
  managerCount: number;
  users?: Array<{ fullName: string; designation?: string }>;
}

interface LevelStrategyConfigProps {
  levels: LevelInfo[];
  levelStrategies: Map<number, TargetStrategy>;
  onLevelStrategyChange: (level: number, strategy: TargetStrategy) => void;
  splitMethod: SplitMethod;
  onSplitMethodChange: (method: SplitMethod) => void;
  onAutoCalculate: () => void;
  isCalculating?: boolean;
}

const strategies: { value: TargetStrategy; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: 'roll_down',
    label: 'Roll Down',
    description: "Manager's target is distributed to subordinates. Subordinate targets are derived from the manager's total.",
    icon: ArrowDownCircle,
  },
  {
    value: 'roll_up',
    label: 'Roll Up',
    description: "Manager's target is auto-calculated as the sum of subordinate targets. Subordinates set their own targets.",
    icon: ArrowUpCircle,
  },
  {
    value: 'independent',
    label: 'Independent',
    description: "Manager has their own separate target. Subordinate targets are set independently and don't affect the manager's target.",
    icon: Minus,
  },
];

const strategyIcons: Record<TargetStrategy, React.ElementType> = {
  roll_down: ArrowDownCircle,
  roll_up: ArrowUpCircle,
  independent: Minus,
};

const strategyLabels: Record<TargetStrategy, string> = {
  roll_down: 'Roll Down',
  roll_up: 'Roll Up',
  independent: 'Independent',
};

const strategyColors: Record<TargetStrategy, string> = {
  roll_down: 'text-blue-600 dark:text-blue-400',
  roll_up: 'text-emerald-600 dark:text-emerald-400',
  independent: 'text-amber-600 dark:text-amber-400',
};

// Full card-based selector for top-level usage
export function TargetStrategySelector({ value, onChange, managerName }: TargetStrategySelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Target Strategy</span>
        {managerName && (
          <span className="text-xs text-muted-foreground">for {managerName}</span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {strategies.map((strategy) => {
          const Icon = strategy.icon;
          const isSelected = value === strategy.value;
          return (
            <button
              key={strategy.value}
              onClick={() => onChange(strategy.value)}
              className={cn(
                'flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn(
                  'h-4 w-4',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}>
                  {strategy.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {strategy.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Compact inline dropdown selector for per-row usage in AllocationTable
export function InlineStrategySelector({ value, onChange, disabled }: InlineStrategySelectorProps) {
  const Icon = strategyIcons[value];
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Select
              value={value}
              onValueChange={(v) => onChange(v as TargetStrategy)}
              disabled={disabled}
            >
              <SelectTrigger className={cn(
                "h-7 w-[120px] text-xs gap-1 px-2",
                strategyColors[value]
              )}>
                <Icon className="h-3 w-3 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((s) => {
                  const SIcon = s.icon;
                  return (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <SIcon className={cn('h-3 w-3', strategyColors[s.value])} />
                        <span>{s.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">
            {strategies.find(s => s.value === value)?.description}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Strategy badge for displaying in org tree
export function StrategyBadge({ strategy }: { strategy: TargetStrategy }) {
  const Icon = strategyIcons[strategy];
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            'inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
            strategy === 'roll_up' && 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
            strategy === 'roll_down' && 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
            strategy === 'independent' && 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
          )}>
            <Icon className="h-2.5 w-2.5" />
            {strategyLabels[strategy]}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">
            {strategies.find(s => s.value === strategy)?.description}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// NEW: Level-wise strategy configuration panel
export function LevelStrategyConfig({
  levels,
  levelStrategies,
  onLevelStrategyChange,
  splitMethod,
  onSplitMethodChange,
  onAutoCalculate,
  isCalculating,
}: LevelStrategyConfigProps) {
  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Configure Target Distribution</span>
      </div>

      {/* Level-wise strategy */}
      <div className="space-y-3">
        {levels.map((lvl) => {
          const strategy = levelStrategies.get(lvl.level) || 'roll_down';
          const Icon = strategyIcons[strategy];
          return (
            <div key={lvl.level} className="space-y-1.5">
              <div className="flex items-center gap-3 py-1.5">
                <Badge variant="outline" className="text-xs min-w-[40px] justify-center">
                  L{lvl.level}
                </Badge>
                <span className="text-sm text-muted-foreground min-w-[80px]">
                  {lvl.userCount} user{lvl.userCount !== 1 ? 's' : ''}
                  {lvl.managerCount > 0 && (
                    <span className="text-[10px]"> ({lvl.managerCount} mgr{lvl.managerCount !== 1 ? 's' : ''})</span>
                  )}
                </span>
                <Select
                  value={strategy}
                  onValueChange={(v) => onLevelStrategyChange(lvl.level, v as TargetStrategy)}
                >
                  <SelectTrigger className={cn(
                    "h-8 w-[140px] text-xs gap-1.5",
                    strategyColors[strategy]
                  )}>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((s) => {
                      const SIcon = s.icon;
                      return (
                        <SelectItem key={s.value} value={s.value} className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <SIcon className={cn('h-3.5 w-3.5', strategyColors[s.value])} />
                            <span>{s.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {/* User names chips */}
              {lvl.users && lvl.users.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-[52px]">
                  {lvl.users.map((u, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground"
                    >
                      {u.fullName}
                      {u.designation && (
                        <span className="text-[9px] opacity-70">· {u.designation}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Root user info note */}
      <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
        <AlertTriangle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-snug">
          The root user distributes targets but does not hold a personal target.
        </p>
      </div>

      {/* Split method */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <span className="text-sm text-muted-foreground">Split Method:</span>
        <div className="flex gap-1">
          {([
            { value: 'equal' as SplitMethod, label: 'Equal Split', desc: 'Divide equally among children' },
            { value: 'percentage' as SplitMethod, label: 'Percentage', desc: 'Distribute by percentage' },
            { value: 'manual' as SplitMethod, label: 'Manual', desc: 'Enter values manually' },
          ]).map((m) => (
            <button
              key={m.value}
              onClick={() => onSplitMethodChange(m.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all border',
                splitMethod === m.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-calculate button */}
      <button
        onClick={onAutoCalculate}
        disabled={isCalculating}
        className={cn(
          'w-full py-2.5 rounded-lg text-sm font-semibold transition-all',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isCalculating ? 'Calculating…' : '⚡ Auto-Calculate & Preview'}
      </button>
    </div>
  );
}
