import React from 'react';
import { Layout } from '@/components/Layout';
import BeatAllowanceManagement from '@/components/BeatAllowanceManagement';
import ExpenseMonthlySummary from '@/components/expenses/ExpenseMonthlySummary';
import { ModuleHelpButton } from "@/components/help/ModuleHelpButton";

const MyExpenses = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-end mb-2">
            <ModuleHelpButton categoryId="expenses" />
          </div>
          
          {/* Monthly Summary with approval status */}
          <ExpenseMonthlySummary />
          
          {/* Detailed expense tracking */}
          <BeatAllowanceManagement />
        </div>
      </div>
    </Layout>
  );
};

export default MyExpenses;
