import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import { useSubordinates } from '@/hooks/useSubordinates';
import { useMonthlyExpenseSummary } from '@/hooks/useMonthlyExpenseSummary';
import WeeklyBreakdown from './WeeklyBreakdown';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TeamExpenseSummaryProps {
  yearMonth: string;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const TeamMemberRow: React.FC<{ userId: string; name: string; yearMonth: string }> = ({
  userId, name, yearMonth
}) => {
  const [expanded, setExpanded] = useState(false);
  const { data: summary, isLoading } = useMonthlyExpenseSummary(userId, yearMonth);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardContent className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                {isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : summary ? (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="text-blue-600">TA: {fmt(summary.ta)}</span>
                    <span>·</span>
                    <span className="text-green-600">DA: {fmt(summary.da)}</span>
                    <span>·</span>
                    <span className="text-purple-600">Add: {fmt(summary.additionalApproved)}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {summary && summary.additionalPending > 0 && (
                  <Badge variant="outline" className="text-[10px] border-yellow-300 text-yellow-700">
                    Pending {fmt(summary.additionalPending)}
                  </Badge>
                )}
                <span className="text-sm font-bold text-primary">
                  {isLoading ? '...' : summary ? fmt(summary.total) : '₹0'}
                </span>
                {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {summary && (
            <div className="px-3 pb-3">
              <WeeklyBreakdown weeks={summary.weeklyBreakdown} />
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const TeamExpenseSummary: React.FC<TeamExpenseSummaryProps> = ({ yearMonth }) => {
  const { subordinates, isLoading: loadingSubs } = useSubordinates();

  if (loadingSubs) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!subordinates.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">No team members found</p>
    );
  }

  return (
    <div className="space-y-2">
      {subordinates.map((sub) => (
        <TeamMemberRow
          key={sub.subordinate_user_id}
          userId={sub.subordinate_user_id}
          name={sub.full_name}
          yearMonth={yearMonth}
        />
      ))}
    </div>
  );
};

export default TeamExpenseSummary;
