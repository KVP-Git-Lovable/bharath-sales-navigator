import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Cloud, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TeamFilter = 'all' | 'present' | 'on_leave' | 'absent';

interface TeamSummaryCardsProps {
  presentCount: number;
  onLeaveCount: number;
  absentCount: number;
  activeFilter: TeamFilter;
  onFilterChange: (filter: TeamFilter) => void;
}

export const TeamSummaryCards = ({
  presentCount,
  onLeaveCount,
  absentCount,
  activeFilter,
  onFilterChange,
}: TeamSummaryCardsProps) => {
  const cards = [
    {
      key: 'present' as TeamFilter,
      label: 'Present\nToday',
      count: presentCount,
      icon: CheckCircle,
      bgClass: 'bg-green-50 dark:bg-green-950/50',
      activeBgClass: 'bg-green-100 dark:bg-green-950 ring-2 ring-green-400',
      iconClass: 'text-green-500',
      countClass: 'text-green-700 dark:text-green-300',
      labelClass: 'text-green-600 dark:text-green-400',
    },
    {
      key: 'on_leave' as TeamFilter,
      label: 'On Leave',
      count: onLeaveCount,
      icon: Cloud,
      bgClass: 'bg-amber-50 dark:bg-amber-950/50',
      activeBgClass: 'bg-amber-100 dark:bg-amber-950 ring-2 ring-amber-400',
      iconClass: 'text-amber-500',
      countClass: 'text-amber-700 dark:text-amber-300',
      labelClass: 'text-amber-600 dark:text-amber-400',
    },
    {
      key: 'absent' as TeamFilter,
      label: 'Absent',
      count: absentCount,
      icon: XCircle,
      bgClass: 'bg-red-50 dark:bg-red-950/50',
      activeBgClass: 'bg-red-100 dark:bg-red-950 ring-2 ring-red-400',
      iconClass: 'text-red-500',
      countClass: 'text-red-700 dark:text-red-300',
      labelClass: 'text-red-600 dark:text-red-400',
    },
  ];

  const totalMembers = presentCount + onLeaveCount + absentCount;

  return (
    <div className="space-y-2">
      <p className="text-center text-sm text-muted-foreground font-medium">
        {totalMembers} Members
      </p>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => {
          const isActive = activeFilter === card.key;
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              className={cn(
                'cursor-pointer transition-all border-0 shadow-sm',
                isActive ? card.activeBgClass : card.bgClass,
              )}
              onClick={() => onFilterChange(isActive ? 'all' : card.key)}
            >
              <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                <Icon className={cn('h-5 w-5 mb-1.5', card.iconClass)} />
                <div className="flex items-baseline gap-1.5">
                  <span className={cn('text-2xl font-bold leading-none', card.countClass)}>
                    {card.count}
                  </span>
                  <span className={cn('text-[11px] leading-tight whitespace-pre-line', card.labelClass)}>
                    {card.label}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
