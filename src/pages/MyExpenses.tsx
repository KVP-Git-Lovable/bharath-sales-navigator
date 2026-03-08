import React from 'react';
import { Layout } from '@/components/Layout';
import BeatAllowanceManagement from '@/components/BeatAllowanceManagement';
import { ModuleHelpButton } from "@/components/help/ModuleHelpButton";

const MyExpenses = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-end mb-2">
            <ModuleHelpButton categoryId="expenses" />
          </div>
          <BeatAllowanceManagement />
        </div>
      </div>
    </Layout>
  );
};

export default MyExpenses;
