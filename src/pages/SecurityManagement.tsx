import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Shield, Lock, Loader2, Users } from 'lucide-react';
import { RolePermissionsTab } from '@/components/security/RolePermissionsTab';
import { PermissionSetGroupsTab } from '@/components/security/PermissionSetGroupsTab';

export default function SecurityManagement() {
  const navigate = useNavigate();
  const { userRole, securityProfileName, loading, user } = useAuth();
  const [activeTab, setActiveTab] = useState('role-permissions');

  // Check if user has admin access - either through role OR System Administrator profile
  const hasAdminAccess = userRole === 'admin' || securityProfileName === 'System Administrator';

  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not logged in, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Wait a bit for role to load if user exists but role is null
  // This handles the race condition where user is set but role fetch is still pending
  if (userRole === null && securityProfileName === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect if we have confirmed the user doesn't have admin access
  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-7xl mx-auto space-y-6">
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
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Security & Access Control
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage user profiles, permissions, and data access
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5" />
              How Security Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Role Permissions:</strong> Control what modules each role can access (View, Create, Edit, Delete)</p>
            <p><strong className="text-foreground">Permission Set Groups:</strong> Override role permissions for specific users when needed</p>
            <p><strong className="text-foreground">Manager Hierarchy:</strong> Managers automatically see their team's data based on reporting structure</p>
          </CardContent>
        </Card>

        {/* Permission Set Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="role-permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role Permissions
            </TabsTrigger>
            <TabsTrigger value="permission-set-groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Permission Set Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="role-permissions" className="mt-6">
            <div className="bg-card border rounded-xl p-6">
              <RolePermissionsTab />
            </div>
          </TabsContent>

          <TabsContent value="permission-set-groups" className="mt-6">
            <div className="bg-card border rounded-xl p-6">
              <PermissionSetGroupsTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
