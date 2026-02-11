import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, UserX } from 'lucide-react';
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
      label: 'Present Today',
      count: presentCount,
      icon: Users,
      activeClass: 'bg-green-100 border-green-400 dark:bg-green-950 dark:border-green-600',
      defaultClass: 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800',
      textClass: 'text-green-700 dark:text-green-300',
      iconClass: 'text-green-600',
    },
    {
      key: 'on_leave' as TeamFilter,
      label: 'On Leave',
      count: onLeaveCount,
      icon: Calendar,
      activeClass: 'bg-amber-100 border-amber-400 dark:bg-amber-950 dark:border-amber-600',
      defaultClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800',
      textClass: 'text-amber-700 dark:text-amber-300',
      iconClass: 'text-amber-600',
    },
    {
      key: 'absent' as TeamFilter,
      label: 'Absent',
      count: absentCount,
      icon: UserX,
      activeClass: 'bg-red-100 border-red-400 dark:bg-red-950 dark:border-red-600',
      defaultClass: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800',
      textClass: 'text-red-700 dark:text-red-300',
      iconClass: 'text-red-600',
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
      {cards.map((card) => {
        const isActive = activeFilter === card.key;
        const Icon = card.icon;
        return (
          <Card
            key={card.key}
            className={cn(
              'min-w-[110px] flex-1 cursor-pointer transition-all snap-start border-2',
              isActive ? card.activeClass : card.defaultClass,
              isActive && 'shadow-md'
            )}
            onClick={() => onFilterChange(isActive ? 'all' : card.key)}
          >
            <CardContent className="p-3 text-center">
              <Icon className={cn('h-5 w-5 mx-auto mb-1', card.iconClass)} />
              <div className={cn('text-2xl font-bold', card.textClass)}>{card.count}</div>
              <div className={cn('text-xs', card.textClass)}>{card.label}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
