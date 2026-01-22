import React, { useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target, BarChart3 } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSubordinates } from '@/hooks/useSubordinates';
import { AdminSetTarget } from '@/components/admin/AdminSetTarget';
import { TeamTargetDashboard } from '@/components/admin/TeamTargetDashboard';
import { TopControlBar, UserScope } from '@/components/admin/TopControlBar';
import { toast } from 'sonner';

// Get current FY year
const getCurrentFY = () => {
  const now = new Date();
  return now.getMonth() < 3 ? now.getFullYear() : now.getFullYear() + 1;
};

const TargetVsActual = () => {
  const { hasAdminAccess, loading, user } = useAdminAccess();
  const { subordinates, isManager, isLoading: subordinatesLoading } = useSubordinates();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'set-target' | 'target-vs-actual'>('set-target');
  
  // Top Control Bar state
  const [userScope, setUserScope] = useState<UserScope>('single');
  const [selectedUserId, setSelectedUserId] = useState<string>('self');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [fyYear, setFYYear] = useState(getCurrentFY());

  // Get effective user IDs based on scope
  const effectiveUserIds = useMemo(() => {
    switch (userScope) {
      case 'self':
        return user?.id ? [user.id] : [];
      case 'single':
        if (selectedUserId === 'self' || !selectedUserId) {
          return user?.id ? [user.id] : [];
        }
        return [selectedUserId];
      case 'multiple':
        return selectedUserIds;
      case 'team':
        return subordinates.map(s => s.subordinate_user_id);
      default:
        return [];
    }
  }, [userScope, user?.id, selectedUserId, selectedUserIds, subordinates]);

  const handleBulkAction = (action: 'copy' | 'export') => {
    if (action === 'copy') {
      toast.info('Copy targets feature coming soon');
    } else if (action === 'export') {
      toast.info('Export feature coming soon');
    }
  };

  if (loading || subordinatesLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Only admin, System Administrator, or managers can access
  if (!hasAdminAccess && !isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-6xl mx-auto space-y-4">
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

          {/* Top Control Bar */}
          <TopControlBar
            userScope={userScope}
            onUserScopeChange={setUserScope}
            selectedUserId={selectedUserId}
            onSelectedUserChange={setSelectedUserId}
            selectedUserIds={selectedUserIds}
            fyYear={fyYear}
            onFYYearChange={setFYYear}
            onBulkAction={handleBulkAction}
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'set-target' | 'target-vs-actual')}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="set-target" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Assign Targets</span>
                <span className="sm:hidden">Assign</span>
              </TabsTrigger>
              <TabsTrigger value="target-vs-actual" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Target vs Actual</span>
                <span className="sm:hidden">Dashboard</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="set-target" className="mt-6">
              <AdminSetTarget 
                userScope={userScope}
                selectedUserId={selectedUserId}
                selectedUserIds={selectedUserIds}
                onSelectedUserIdsChange={setSelectedUserIds}
                fyYear={fyYear}
              />
            </TabsContent>

            <TabsContent value="target-vs-actual" className="mt-6">
              <TeamTargetDashboard 
                userScope={userScope}
                effectiveUserIds={effectiveUserIds}
                fyYear={fyYear}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default TargetVsActual;
