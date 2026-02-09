import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, Minus } from 'lucide-react';

export type TargetStrategy = 'roll_down' | 'roll_up' | 'independent';

interface TargetStrategySelectorProps {
  value: TargetStrategy;
  onChange: (strategy: TargetStrategy) => void;
  managerName?: string;
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
