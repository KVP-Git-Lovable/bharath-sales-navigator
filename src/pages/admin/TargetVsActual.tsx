import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubordinates } from '@/hooks/useSubordinates';
import { AdminSetTarget } from '@/components/admin/AdminSetTarget';
import { TeamTargetDashboard } from '@/components/admin/TeamTargetDashboard';

const TargetVsActual = () => {
  const { userRole, loading } = useAuth();
  const { isManager, isLoading: subordinatesLoading } = useSubordinates();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'set-target' | 'target-vs-actual'>('set-target');

  if (loading || subordinatesLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Only admin or managers can access
  if (userRole !== 'admin' && !isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate('/admin-controls')} 
              variant="ghost" 
              size="sm"
              className="p-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Target vs Actual</h1>
              <p className="text-muted-foreground text-sm">Set team targets and track achievements</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'set-target' | 'target-vs-actual')}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="set-target" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Set Target</span>
                <span className="sm:hidden">Set</span>
              </TabsTrigger>
              <TabsTrigger value="target-vs-actual" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Target vs Actual</span>
                <span className="sm:hidden">Dashboard</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="set-target" className="mt-6">
              <AdminSetTarget />
            </TabsContent>

            <TabsContent value="target-vs-actual" className="mt-6">
              <TeamTargetDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default TargetVsActual;
