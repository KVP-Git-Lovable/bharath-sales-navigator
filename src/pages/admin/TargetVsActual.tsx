import React, { useState, useMemo } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target, BarChart3, Settings } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSubordinates } from '@/hooks/useSubordinates';
import { TeamTargetDashboard } from '@/components/admin/TeamTargetDashboard';
import { TargetConfigTab } from '@/components/admin/TargetConfigTab';
import { AssignTargetsTab } from '@/components/admin/AssignTargetsTab';
import { UserScope } from '@/components/admin/TopControlBar';
import { toast } from 'sonner';

// Get current FY year
const getCurrentFY = () => {
  const now = new Date();
  return now.getMonth() < 3 ? now.getFullYear() : now.getFullYear() + 1;
};

// Generate FY options
const generateFYOptions = () => {
  const currentFY = getCurrentFY();
  const options = [];
  for (let i = -2; i <= 2; i++) {
    const year = currentFY + i;
    options.push({
      value: year,
      label: `FY ${year - 1}-${String(year).slice(-2)}`,
    });
  }
  return options;
};

const TargetVsActual = () => {
  const { hasAdminAccess, loading, user } = useAdminAccess();
  const { subordinates, isManager, isLoading: subordinatesLoading } = useSubordinates();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Determine initial tab from URL params (support redirect from old hierarchy page)
  const initialMode = searchParams.get('mode');
  const initialTab = initialMode === 'hierarchy' ? 'assign-targets' : 'target-config';
  
  const [activeTab, setActiveTab] = useState<'target-config' | 'assign-targets' | 'target-vs-actual'>(initialTab as any);
  const [fyYear, setFYYear] = useState(getCurrentFY());
  
  // Assign Targets tab state
  const [userScope, setUserScope] = useState<UserScope>('single');
  const [selectedUserId, setSelectedUserId] = useState<string>('self');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const fyOptions = useMemo(() => generateFYOptions(), []);

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
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Target Management</h1>
              <p className="text-muted-foreground text-sm">Configure, assign, and track team targets</p>
            </div>
            
            {/* FY Selector in Header */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">FY:</span>
              <Select value={String(fyYear)} onValueChange={(v) => setFYYear(parseInt(v))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fyOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="target-config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
              <TabsTrigger value="assign-targets" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Assign</span>
              </TabsTrigger>
              <TabsTrigger value="target-vs-actual" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
            </TabsList>

            {/* Target Configuration Tab */}
            <TabsContent value="target-config" className="mt-6">
              <TargetConfigTab fyYear={fyYear} />
            </TabsContent>

            {/* Assign Targets Tab */}
            <TabsContent value="assign-targets" className="mt-6">
              <AssignTargetsTab
                fyYear={fyYear}
                userScope={userScope}
                onUserScopeChange={setUserScope}
                selectedUserId={selectedUserId}
                onSelectedUserChange={setSelectedUserId}
                selectedUserIds={selectedUserIds}
                onSelectedUserIdsChange={setSelectedUserIds}
              />
            </TabsContent>

            {/* Target vs Actual Dashboard Tab */}
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