import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Minus, Ban, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const strategyExplanations = [
  {
    key: 'roll_down',
    label: 'Roll Down',
    icon: ArrowDownCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    description: "Manager's target is split among subordinates.",
    detail: "When you set a manager's target to ₹10L and they have 5 subordinates, each gets ₹2L (equal split). As subordinates achieve their targets, the manager's progress automatically fills up.",
    example: 'Manager: ₹10L → 5 reps × ₹2L each',
  },
  {
    key: 'roll_up',
    label: 'Roll Up',
    icon: ArrowUpCircle,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    description: "Subordinates set their own targets, which sum up to form the manager's total.",
    detail: "Each subordinate enters their own target independently. The manager's target is automatically calculated as the sum of all subordinate targets. No top-down distribution needed.",
    example: '5 reps (₹1L + ₹3L + ₹2L + ₹2L + ₹2L) → Manager: ₹10L',
  },
  {
    key: 'independent',
    label: 'Independent',
    icon: Minus,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    description: "Manager and subordinates have separate, unrelated targets.",
    detail: "The manager has their own personal target. Subordinate targets are set independently and have no effect on the manager's target. Both operate in isolation.",
    example: 'Manager: ₹5L (own) | Each rep: ₹2L (own)',
  },
  {
    key: 'no_target',
    label: 'No Target',
    icon: Ban,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50 border-border',
    description: "User has no target assigned for this period.",
    detail: "Use this for users who have left, are on extended leave, or new joiners who shouldn't have a target yet. Their allocation is excluded from distribution calculations. You can reassign their target to other team members.",
    example: 'User on leave → Target: ₹0 (excluded from split)',
  },
];

export function StrategyExplanationPanel() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
        <Info className="h-4 w-4 text-primary" />
        <span className="font-medium">How do target strategies work?</span>
        {isOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 pb-3">
          {strategyExplanations.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn('rounded-lg border p-3.5 space-y-2', s.bgColor)}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-5 w-5', s.color)} />
                  <span className={cn('text-sm font-semibold', s.color)}>{s.label}</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{s.description}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{s.detail}</p>
                <div className="mt-2 px-2.5 py-1.5 rounded-md bg-background/60 border">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Example</p>
                  <p className="text-xs font-mono text-foreground/90">{s.example}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
