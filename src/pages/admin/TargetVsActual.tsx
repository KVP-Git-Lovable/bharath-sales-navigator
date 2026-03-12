import React, { useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target, BarChart3, Settings, Users, FileText, ClipboardList } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSubordinates } from '@/hooks/useSubordinates';
import { TeamTargetDashboard } from '@/components/admin/TeamTargetDashboard';
import { HierarchyAllocationTab } from '@/components/admin/HierarchyAllocationTab';
import { TargetTypesTab } from '@/components/admin/target-config/TargetTypesTab';
import { TargetPoliciesTab } from '@/components/admin/target-config/TargetPoliciesTab';
import { TargetPlansTab } from '@/components/admin/target-config/TargetPlansTab';
import { useAllUserIds } from '@/hooks/useAllUserIds';

export type UserScope = 'self' | 'single' | 'multiple' | 'team' | 'all';

const getCurrentFY = () => {
  const now = new Date();
  return now.getMonth() < 3 ? now.getFullYear() : now.getFullYear() + 1;
};

const generateFYOptions = () => {
  const currentFY = getCurrentFY();
  const options = [];
  for (let i = -2; i <= 2; i++) {
    const year = currentFY + i;
    options.push({ value: year, label: `FY ${year - 1}-${String(year).slice(-2)}` });
  }
  return options;
};

const TargetVsActual = () => {
  const { hasAdminAccess, loading, user } = useAdminAccess();
  const { subordinates, isManager, isLoading: subordinatesLoading } = useSubordinates();
  const { allUserIds, isLoading: allUsersLoading } = useAllUserIds();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>('types');
  const [fyYear, setFYYear] = useState(getCurrentFY());

  const [userScope, setUserScope] = useState<UserScope>(hasAdminAccess ? 'all' : 'team');
  const [selectedUserId, setSelectedUserId] = useState<string>('self');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const fyOptions = useMemo(() => generateFYOptions(), []);

  const effectiveUserIds = useMemo(() => {
    switch (userScope) {
      case 'self': return user?.id ? [user.id] : [];
      case 'single':
        if (selectedUserId === 'self' || !selectedUserId) return user?.id ? [user.id] : [];
        return [selectedUserId];
      case 'multiple': return selectedUserIds;
      case 'team': return subordinates.map(s => s.subordinate_user_id);
      case 'all': return allUserIds;
      default: return [];
    }
  }, [userScope, user?.id, selectedUserId, selectedUserIds, subordinates, allUserIds]);

  if (loading || subordinatesLoading || allUsersLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!hasAdminAccess && !isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/admin-controls')} variant="ghost" size="sm" className="p-2">
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Target Management</h1>
              <p className="text-muted-foreground text-sm">Configure, assign, and track team targets</p>
            </div>
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

          {/* Main Tabs — 5-tab layout */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 max-w-2xl">
              <TabsTrigger value="types" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Types</span>
              </TabsTrigger>
              <TabsTrigger value="policies" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Policies</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Plans</span>
              </TabsTrigger>
              <TabsTrigger value="allocate" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Allocate</span>
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Actual</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="types" className="mt-6">
              <TargetTypesTab />
            </TabsContent>

            <TabsContent value="policies" className="mt-6">
              <TargetPoliciesTab />
            </TabsContent>

            <TabsContent value="plans" className="mt-6">
              <TargetPlansTab fyYear={fyYear} />
            </TabsContent>

            <TabsContent value="allocate" className="mt-6">
              <HierarchyAllocationTab fyYear={fyYear} />
            </TabsContent>

            <TabsContent value="dashboard" className="mt-6">
              <TeamTargetDashboard
                userScope={userScope}
                onUserScopeChange={setUserScope}
                effectiveUserIds={effectiveUserIds}
                fyYear={fyYear}
                hasAdminAccess={hasAdminAccess}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default TargetVsActual;
