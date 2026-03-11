import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, User, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubordinates } from '@/hooks/useSubordinates';
import { useMonthlyExpenseSummary } from '@/hooks/useMonthlyExpenseSummary';
import { useAuth } from '@/hooks/useAuth';
import WeeklyBreakdown from './WeeklyBreakdown';
import MonthNavigator from './MonthNavigator';
import ExpenseSummaryCards from './ExpenseSummaryCards';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import RejectionReasonDialog from '@/components/RejectionReasonDialog';

interface TeamExpenseSummaryProps {
  yearMonth: string;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ─── Approvals Tab ───────────────────────────────────────────────────────────

interface ExpenseRecord {
  id: string;
  user_id: string;
  category: string;
  custom_category: string | null;
  amount: number;
  description: string | null;
  bill_url: string | null;
  expense_date: string;
  status: string;
  employee_name?: string;
}

const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  submitted: { label: 'Pending', variant: 'outline' },
  manager_approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

const TeamApprovalsList: React.FC<{ yearMonth: string }> = ({ yearMonth }) => {
  const { user } = useAuth();
  const { subordinateIds, subordinates } = useSubordinates();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  const [year, month] = yearMonth.split('-').map(Number);
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  const fetchExpenses = async () => {
    if (!user?.id || subordinateIds.length === 0) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('additional_expenses')
        .select('*')
        .in('user_id', subordinateIds)
        .gte('expense_date', startStr)
        .lte('expense_date', endStr)
        .in('status', ['submitted', 'manager_approved', 'rejected'])
        .order('expense_date', { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map((exp: any) => {
        const sub = subordinates.find(s => s.subordinate_user_id === exp.user_id);
        return { ...exp, employee_name: sub?.full_name || 'Unknown' };
      });
      setExpenses(mapped);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subordinateIds.length > 0) fetchExpenses();
  }, [subordinateIds, yearMonth]);

  const handleApprove = async (expenseId: string) => {
    if (!user?.id) return;
    setActionLoading(expenseId);
    try {
      const { error } = await (supabase as any)
        .from('additional_expenses')
        .update({ status: 'manager_approved', approved_by: user.id, approved_at: new Date().toISOString() })
        .eq('id', expenseId).eq('status', 'submitted');
      if (error) throw error;
      toast.success('Expense approved');
      fetchExpenses();
    } catch { toast.error('Failed to approve'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (reason: string) => {
    if (!user?.id || !selectedExpenseId) return;
    try {
      const { error } = await (supabase as any)
        .from('additional_expenses')
        .update({ status: 'rejected', approved_by: user.id, approved_at: new Date().toISOString(), rejection_reason: reason })
        .eq('id', selectedExpenseId).eq('status', 'submitted');
      if (error) throw error;
      toast.success('Expense rejected');
      setSelectedExpenseId(null);
      fetchExpenses();
    } catch { toast.error('Failed to reject'); }
  };

  const openBill = async (billUrl: string) => {
    try {
      const { data } = await supabase.storage.from('expense-bills').createSignedUrl(billUrl, 300);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch { toast.error('Failed to open bill'); }
  };

  const pending = expenses.filter(e => e.status === 'submitted');
  const processed = expenses.filter(e => e.status !== 'submitted');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No expenses found for this month</p>;
  }

  const ExpenseCard: React.FC<{ exp: ExpenseRecord; showActions: boolean }> = ({ exp, showActions }) => (
    <Card className="border">
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium truncate">{exp.employee_name}</p>
          <Badge variant={STATUS_BADGE_MAP[exp.status]?.variant || 'secondary'} className="text-[10px]">
            {STATUS_BADGE_MAP[exp.status]?.label || exp.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {new Date(exp.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            {' · '}
            {exp.category === 'Other' ? exp.custom_category : exp.category}
          </span>
          <span className="text-sm font-bold text-primary">₹{exp.amount.toLocaleString()}</span>
        </div>
        {exp.description && <p className="text-[11px] text-muted-foreground truncate">{exp.description}</p>}
        <div className="flex items-center justify-between pt-1">
          <div>
            {exp.bill_url && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => openBill(exp.bill_url!)}>
                <Eye className="h-3 w-3" /> Bill
              </Button>
            )}
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => handleApprove(exp.id)} disabled={actionLoading === exp.id}>
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:bg-destructive/10"
                onClick={() => { setSelectedExpenseId(exp.id); setRejectionDialogOpen(true); }}
                disabled={actionLoading === exp.id}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">Pending ({pending.length})</p>
          {pending.map(exp => <ExpenseCard key={exp.id} exp={exp} showActions />)}
        </div>
      )}
      {processed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Processed ({processed.length})</p>
          {processed.map(exp => <ExpenseCard key={exp.id} exp={exp} showActions={false} />)}
        </div>
      )}
      <RejectionReasonDialog
        isOpen={rejectionDialogOpen}
        onClose={() => { setRejectionDialogOpen(false); setSelectedExpenseId(null); }}
        onConfirm={handleReject}
        title="Reject Expense"
        description="Please provide a reason for rejecting this expense."
      />
    </div>
  );
};

// ─── Overview: Individual Member Rows ────────────────────────────────────────

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

// ─── Overview Tab with Aggregated Summary Cards ──────────────────────────────

const TeamOverview: React.FC<{ yearMonth: string }> = ({ yearMonth }) => {
  const { subordinates } = useSubordinates();

  // Fetch summaries for all subordinates
  const summaryHooks = subordinates.map(sub => ({
    sub,
    result: useMonthlyExpenseSummary(sub.subordinate_user_id, yearMonth),
  }));

  const isLoading = summaryHooks.some(h => h.result.isLoading);

  const aggregated = useMemo(() => {
    let ta = 0, da = 0, additional = 0, total = 0, presentDays = 0;
    summaryHooks.forEach(h => {
      const s = h.result.data;
      if (s) {
        ta += s.ta;
        da += s.da;
        additional += s.additionalApproved;
        total += s.total;
        presentDays += s.presentDays;
      }
    });
    return { ta, da, additional, total, presentDays };
  }, [summaryHooks.map(h => h.result.data)]);

  return (
    <div className="space-y-3">
      {/* Aggregated Summary Cards */}
      <ExpenseSummaryCards
        ta={aggregated.ta}
        da={aggregated.da}
        additional={aggregated.additional}
        total={aggregated.total}
        presentDays={aggregated.presentDays}
        loading={isLoading}
        onTotalClick={() => {}}
        isExpanded={false}
      />

      {/* Individual member rows */}
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
    </div>
  );
};

// ─── Main TeamExpenseSummary ──────────────────────────────────────────────────

const TeamExpenseSummary: React.FC<TeamExpenseSummaryProps> = ({ yearMonth: parentYearMonth }) => {
  const { subordinates, isLoading: loadingSubs } = useSubordinates();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const yearMonth = format(selectedMonth, 'yyyy-MM');

  if (loadingSubs) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!subordinates.length) {
    return <p className="text-sm text-muted-foreground text-center py-6">No team members found</p>;
  }

  return (
    <div className="space-y-3">
      <MonthNavigator selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      <Tabs defaultValue="approvals" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="approvals" className="text-xs gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <User className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="mt-3">
          <TeamApprovalsList yearMonth={yearMonth} />
        </TabsContent>

        <TabsContent value="overview" className="mt-3">
          <TeamOverview yearMonth={yearMonth} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamExpenseSummary;
