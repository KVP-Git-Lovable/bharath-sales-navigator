import React from 'react';
import { Car, Utensils, Receipt, IndianRupee } from 'lucide-react';

interface ExpenseSummaryCardsProps {
  ta: number;
  da: number;
  additional: number;
  total: number;
  presentDays: number;
  loading: boolean;
  onTotalClick: () => void;
  isExpanded: boolean;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const ExpenseSummaryCards: React.FC<ExpenseSummaryCardsProps> = ({
  ta, da, additional, total, presentDays, loading, onTotalClick, isExpanded
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Travel (TA)',
      value: fmt(ta),
      icon: Car,
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-700 dark:text-blue-400',
    },
    {
      label: `Daily (DA) · ${presentDays}d`,
      value: fmt(da),
      icon: Utensils,
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-600',
      valueColor: 'text-green-700 dark:text-green-400',
    },
    {
      label: 'Additional',
      value: fmt(additional),
      icon: Receipt,
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-800',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-700 dark:text-purple-400',
    },
    {
      label: 'Total Expenses',
      value: fmt(total),
      icon: IndianRupee,
      bg: 'bg-primary/5',
      border: 'border-primary/20',
      iconColor: 'text-primary',
      valueColor: 'text-primary',
      clickable: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card) => (
        <button
          key={card.label}
          className={`flex items-center gap-2.5 p-3 rounded-xl border ${card.bg} ${card.border} text-left transition-all ${
            card.clickable ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : 'cursor-default'
          } ${card.clickable && isExpanded ? 'ring-2 ring-primary/30' : ''}`}
          onClick={card.clickable ? onTotalClick : undefined}
          type="button"
        >
          <card.icon className={`h-5 w-5 ${card.iconColor} shrink-0`} />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground leading-tight">{card.label}</p>
            <p className={`text-sm font-bold ${card.valueColor}`}>{card.value}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ExpenseSummaryCards;
