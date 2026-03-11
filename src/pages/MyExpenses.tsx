import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ModuleHelpButton } from '@/components/help/ModuleHelpButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Users, User as UserIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useSubordinates } from '@/hooks/useSubordinates';
import { useMonthlyExpenseSummary } from '@/hooks/useMonthlyExpenseSummary';
import MonthNavigator from '@/components/expenses/MonthNavigator';
import ExpenseSummaryCards from '@/components/expenses/ExpenseSummaryCards';
import WeeklyBreakdown from '@/components/expenses/WeeklyBreakdown';
import TeamExpenseSummary from '@/components/expenses/TeamExpenseSummary';
import AdditionalExpenses from '@/components/AdditionalExpenses';

const MyExpenses = () => {
  const { user } = useAuth();
  const { isManager } = useSubordinates();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isAdditionalOpen, setIsAdditionalOpen] = useState(false);

  const yearMonth = format(selectedMonth, 'yyyy-MM');
  const { data: summary, isLoading } = useMonthlyExpenseSummary(user?.id, yearMonth);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Expenses</h1>
              <ModuleHelpButton categoryId="expenses" />
            </div>
          </div>

          {/* Month Navigator */}
          <MonthNavigator selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

          {/* Manager tabs or direct content */}
          {isManager ? (
            <Tabs defaultValue="my" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="my" className="text-xs gap-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  My Expenses
                </TabsTrigger>
                <TabsTrigger value="team" className="text-xs gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Team Summary
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my" className="space-y-4 mt-3">
                <MyExpenseContent
                  summary={summary}
                  isLoading={isLoading}
                  showBreakdown={showBreakdown}
                  onToggleBreakdown={() => setShowBreakdown(!showBreakdown)}
                  onAddExpense={() => setIsAdditionalOpen(true)}
                />
              </TabsContent>

              <TabsContent value="team" className="mt-3">
                <TeamExpenseSummary yearMonth={yearMonth} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <MyExpenseContent
                summary={summary}
                isLoading={isLoading}
                showBreakdown={showBreakdown}
                onToggleBreakdown={() => setShowBreakdown(!showBreakdown)}
                onAddExpense={() => setIsAdditionalOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Additional Expenses Dialog */}
      <Dialog open={isAdditionalOpen} onOpenChange={setIsAdditionalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AdditionalExpenses />
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

interface MyExpenseContentProps {
  summary: ReturnType<typeof useMonthlyExpenseSummary>['data'];
  isLoading: boolean;
  showBreakdown: boolean;
  onToggleBreakdown: () => void;
  onAddExpense: () => void;
}

const MyExpenseContent: React.FC<MyExpenseContentProps> = ({
  summary, isLoading, showBreakdown, onToggleBreakdown, onAddExpense
}) => {
  return (
    <>
      {/* Summary Cards */}
      <ExpenseSummaryCards
        ta={summary?.ta || 0}
        da={summary?.da || 0}
        additional={summary?.additionalApproved || 0}
        total={summary?.total || 0}
        presentDays={summary?.presentDays || 0}
        loading={isLoading}
        onTotalClick={onToggleBreakdown}
        isExpanded={showBreakdown}
      />

      {/* Pending / Rejected info */}
      {summary && (summary.additionalPending > 0 || summary.additionalRejected > 0) && (
        <div className="flex items-center gap-2 flex-wrap text-xs px-1">
          {summary.additionalPending > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              ⏳ Pending: ₹{summary.additionalPending.toLocaleString('en-IN')}
            </span>
          )}
          {summary.additionalRejected > 0 && (
            <span className="text-destructive">
              ✕ Rejected: ₹{summary.additionalRejected.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      )}

      {/* Weekly Breakdown (expandable) */}
      {showBreakdown && summary && (
        <WeeklyBreakdown weeks={summary.weeklyBreakdown} />
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button size="sm" onClick={onAddExpense} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Additional Expense
        </Button>
      </div>
    </>
  );
};

export default MyExpenses;
