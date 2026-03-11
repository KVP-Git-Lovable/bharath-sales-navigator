import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, CheckCircle, XCircle, Eye, CalendarRange, CalendarDays } from 'lucide-react';
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
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-sm font-medium truncate min-w-0">{name}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {summary && summary.additionalPending > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-yellow-300 text-yellow-700">
                    Pending {fmt(summary.additionalPending)}
                  </Badge>
                )}
                {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
            </div>
            {isLoading ? (
              <div className="h-8 rounded bg-muted animate-pulse" />
            ) : summary ? (
              <div className="grid grid-cols-5 gap-1 text-center">
                <div>
                  <p className="text-[9px] text-muted-foreground">TA</p>
                  <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">{fmt(summary.ta)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">DA</p>
                  <p className="text-[11px] font-semibold text-green-600 dark:text-green-400">{fmt(summary.da)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Add</p>
                  <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">{fmt(summary.additionalApproved)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Total</p>
                  <p className="text-[11px] font-bold text-primary">{fmt(summary.total)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Orders</p>
                  <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">{fmt(summary.orderValue)}</p>
                </div>
              </div>
            ) : null}
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

// Helper component to collect a single subordinate's summary into aggregation
const useTeamAggregatedExpenses = (subordinateIds: string[], yearMonth: string) => {
  const [aggregated, setAggregated] = useState({ ta: 0, da: 0, additional: 0, total: 0, presentDays: 0, orderValue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subordinateIds.length === 0) { setLoading(false); return; }

    const fetchAll = async () => {
      setLoading(true);
      const [yr, mo] = yearMonth.split('-').map(Number);
      const start = startOfMonth(new Date(yr, mo - 1));
      const end = endOfMonth(start);
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      try {
        // Fetch attendance, config, beat_plans, beats, and additional for all subordinates at once
        const [attendanceRes, configRes, beatPlansRes, beatsRes, additionalRes, ordersRes] = await Promise.all([
          supabase.from('attendance').select('user_id, date, status')
            .in('user_id', subordinateIds).gte('date', startStr).lte('date', endStr),
          supabase.from('expense_master_config').select('*').single(),
          supabase.from('beat_plans').select('user_id, plan_date, beat_id')
            .in('user_id', subordinateIds).gte('plan_date', startStr).lte('plan_date', endStr),
          supabase.from('beats').select('beat_id, travel_allowance'),
          (supabase as any).from('additional_expenses').select('user_id, amount, status, expense_date')
            .in('user_id', subordinateIds).gte('expense_date', startStr).lte('expense_date', endStr),
          supabase.from('orders').select('user_id, total_amount')
            .in('user_id', subordinateIds).gte('order_date', startStr).lte('order_date', endStr)
            .eq('status', 'confirmed'),
        ]);

        const config = configRes.data;
        const daAmount = config?.da_amount || 0;
        const taType = config?.ta_type || 'from_beat';
        const fixedTa = config?.fixed_ta_amount || 0;

        const beatTAMap = new Map<string, number>();
        beatsRes.data?.forEach((b: any) => beatTAMap.set(b.beat_id, b.travel_allowance || 0));

        let totalTA = 0, totalDA = 0, totalAdditional = 0, totalPresent = 0;

        subordinateIds.forEach(uid => {
          const presentDates = new Set(
            attendanceRes.data?.filter((a: any) => a.user_id === uid && ['present', 'regularized'].includes(a.status)).map((a: any) => a.date) || []
          );
          totalPresent += presentDates.size;
          totalDA += presentDates.size * daAmount;

          // TA
          if (taType === 'fixed') {
            totalTA += presentDates.size * fixedTa;
          } else {
            beatPlansRes.data?.filter((p: any) => p.user_id === uid && presentDates.has(p.plan_date)).forEach((plan: any) => {
              totalTA += beatTAMap.get(plan.beat_id) || 0;
            });
          }

          // Additional approved
          const userAdditional = additionalRes.data?.filter((e: any) => e.user_id === uid && ['manager_approved', 'paid'].includes(e.status)) || [];
          totalAdditional += userAdditional.reduce((s: number, e: any) => s + (e.amount || 0), 0);
        });

        const totalOrderValue = (ordersRes.data || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

        setAggregated({
          ta: totalTA, da: totalDA, additional: totalAdditional,
          total: totalTA + totalDA + totalAdditional, presentDays: totalPresent,
          orderValue: totalOrderValue,
        });
      } catch (err) {
        console.error('Error aggregating team expenses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [subordinateIds.join(','), yearMonth]);

  return { aggregated, loading };
};

const TeamOverview: React.FC<{ yearMonth: string }> = ({ yearMonth }) => {
  const { subordinates, subordinateIds } = useSubordinates();
  const { aggregated, loading } = useTeamAggregatedExpenses(subordinateIds, yearMonth);

  return (
    <div className="space-y-3">
      <ExpenseSummaryCards
        ta={aggregated.ta}
        da={aggregated.da}
        additional={aggregated.additional}
        total={aggregated.total}
        presentDays={aggregated.presentDays}
        loading={loading}
        onTotalClick={() => {}}
        isExpanded={false}
        orderValue={aggregated.orderValue}
      />

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
