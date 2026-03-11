import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubordinates } from '@/hooks/useSubordinates';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import RejectionReasonDialog from '@/components/RejectionReasonDialog';

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
  submitted_at: string | null;
  employee_name?: string;
}

type FilterStatus = 'submitted' | 'manager_approved' | 'rejected' | 'all';
type DateFilter = 'this_week' | 'this_month' | 'last_month' | 'custom';

const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'outline' },
  manager_approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  paid: { label: 'Paid', variant: 'default' },
};

const ExpenseApprovals = () => {
  const { user } = useAuth();
  const { subordinateIds, subordinates, isManager, isLoading: subsLoading } = useSubordinates();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('submitted');
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRangeStart, setDateRangeStart] = useState<Date>();
  const [dateRangeEnd, setDateRangeEnd] = useState<Date>();
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getDateRange = () => {
    const today = new Date();
    switch (dateFilter) {
      case 'this_week':
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case 'this_month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'last_month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'custom':
        if (dateRangeStart && dateRangeEnd) return { start: dateRangeStart, end: dateRangeEnd };
        return { start: startOfMonth(today), end: endOfMonth(today) };
      default:
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  };

  const fetchExpenses = async () => {
    if (!user?.id || subordinateIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      let query = (supabase as any)
        .from('additional_expenses')
        .select('*')
        .in('user_id', subordinateIds)
        .gte('expense_date', format(start, 'yyyy-MM-dd'))
        .lte('expense_date', format(end, 'yyyy-MM-dd'))
        .order('expense_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else {
        query = query.in('status', ['submitted', 'manager_approved', 'rejected']);
      }

      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map employee names
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
    if (!subsLoading && subordinateIds.length > 0) {
      fetchExpenses();
    }
  }, [subordinateIds, subsLoading, statusFilter, dateFilter, selectedEmployee, dateRangeStart, dateRangeEnd]);

  const handleApprove = async (expenseId: string) => {
    if (!user?.id) return;
    setActionLoading(expenseId);
    try {
      const { error } = await (supabase as any)
        .from('additional_expenses')
        .update({
          status: 'manager_approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', expenseId)
        .eq('status', 'submitted');

      if (error) throw error;
      toast.success('Expense approved');
      fetchExpenses();
    } catch (error) {
      console.error('Error approving expense:', error);
      toast.error('Failed to approve expense');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!user?.id || !selectedExpenseId) return;
    try {
      const { error } = await (supabase as any)
        .from('additional_expenses')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', selectedExpenseId)
        .eq('status', 'submitted');

      if (error) throw error;
      toast.success('Expense rejected');
      setSelectedExpenseId(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      toast.error('Failed to reject expense');
    }
  };

  const openBill = async (billUrl: string) => {
    try {
      const { data } = await supabase.storage
        .from('expense-bills')
        .createSignedUrl(billUrl, 300);
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch {
      toast.error('Failed to open bill');
    }
  };

  // Summary by employee
  const employeeSummary = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    expenses.forEach(exp => {
      const existing = map.get(exp.user_id) || { name: exp.employee_name || 'Unknown', total: 0, count: 0 };
      existing.total += exp.amount;
      existing.count += 1;
      map.set(exp.user_id, existing);
    });
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }));
  }, [expenses]);

  if (!isManager && !subsLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">You don't have team members to manage expenses for.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold">Team Expense Approvals</h1>

          {/* Filters */}
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-3">
                <Select value={statusFilter} onValueChange={(v: FilterStatus) => setStatusFilter(v)}>
                  <SelectTrigger className="w-[140px] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Pending</SelectItem>
                    <SelectItem value="manager_approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={(v: DateFilter) => setDateFilter(v)}>
                  <SelectTrigger className="w-[140px] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-[160px] h-9 text-sm">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {subordinates.map(sub => (
                      <SelectItem key={sub.subordinate_user_id} value={sub.subordinate_user_id}>
                        {sub.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {dateFilter === 'custom' && (
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("h-9 w-[110px] text-xs", !dateRangeStart && "text-muted-foreground")}>
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {dateRangeStart ? format(dateRangeStart, "MMM dd") : "Start"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateRangeStart} onSelect={setDateRangeStart} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("h-9 w-[110px] text-xs", !dateRangeEnd && "text-muted-foreground")}>
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {dateRangeEnd ? format(dateRangeEnd, "MMM dd") : "End"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateRangeEnd} onSelect={setDateRangeEnd} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employee Summary Cards */}
          {employeeSummary.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {employeeSummary.map(emp => (
                <Card key={emp.id} className="border">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{emp.name}</p>
                    <p className="text-lg font-bold text-primary">₹{emp.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{emp.count} expense{emp.count !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Expenses Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Expenses ({expenses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Employee</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-right text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-center text-xs">Bill</TableHead>
                        <TableHead className="text-center text-xs">Status</TableHead>
                        <TableHead className="text-center text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No expenses found for the selected filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        expenses.map(exp => (
                          <TableRow key={exp.id}>
                            <TableCell className="text-xs font-medium">{exp.employee_name}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {new Date(exp.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </TableCell>
                            <TableCell className="text-xs">
                              {exp.category === 'Other' ? exp.custom_category : exp.category}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">₹{exp.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">{exp.description || '-'}</TableCell>
                            <TableCell className="text-center">
                              {exp.bill_url ? (
                                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openBill(exp.bill_url!)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={STATUS_BADGE_MAP[exp.status]?.variant || 'secondary'} className="text-[10px]">
                                {STATUS_BADGE_MAP[exp.status]?.label || exp.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {exp.status === 'submitted' && (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleApprove(exp.id)}
                                    disabled={actionLoading === exp.id}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-destructive hover:bg-destructive/10"
                                    onClick={() => { setSelectedExpenseId(exp.id); setRejectionDialogOpen(true); }}
                                    disabled={actionLoading === exp.id}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RejectionReasonDialog
        isOpen={rejectionDialogOpen}
        onClose={() => { setRejectionDialogOpen(false); setSelectedExpenseId(null); }}
        onConfirm={handleReject}
        title="Reject Expense"
        description="Please provide a reason for rejecting this expense."
      />
    </Layout>
  );
};

export default ExpenseApprovals;
