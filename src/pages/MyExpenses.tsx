import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import BeatAllowanceManagement from '@/components/BeatAllowanceManagement';
import ExpenseMonthlySummary from '@/components/expenses/ExpenseMonthlySummary';
import { ModuleHelpButton } from "@/components/help/ModuleHelpButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, BarChart3 } from 'lucide-react';

const MyExpenses = () => {
  const [view, setView] = useState<'daily' | 'monthly'>('daily');

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header with inline help */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">Expenses</h1>
            <ModuleHelpButton categoryId="expenses" />
          </div>

          {/* View Toggle */}
          <Tabs value={view} onValueChange={(v) => setView(v as 'daily' | 'monthly')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="daily" className="text-xs gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Daily View
              </TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Monthly Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <BeatAllowanceManagement />
            </TabsContent>

            <TabsContent value="monthly">
              <ExpenseMonthlySummary />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default MyExpenses;
