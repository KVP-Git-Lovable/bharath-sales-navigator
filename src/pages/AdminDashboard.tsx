import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Users, UserPlus, Shield, BarChart3, Settings, Database, Calendar, ArrowLeft, Target } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import HolidayManagement from '@/components/HolidayManagement';
import CreateUserForm from '@/components/CreateUserForm';
import UserInvitationForm from '@/components/UserInvitationForm';
import ApproverManagement from '@/components/ApproverManagement';
import TargetSetupMaster from '@/components/admin/TargetSetupMaster';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  phone_number: string;
  recovery_email: string;
  role: 'admin' | 'user';
  assigned_at: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  profile?: {
    id: string;
    username: string;
    full_name: string;
    created_at: string;
    profile_picture_url?: string;
    user_status?: string;
  };
}

export const AdminDashboard = () => {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleChangeOpen, setIsRoleChangeOpen] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    username: '',
    fullName: '',
    role: 'user' as 'admin' | 'user'
  });

  useEffect(() => {
    if (!loading && userRole === 'admin') {
      fetchUsers();
    }
  }, [userRole, loading]);

  // Set up real-time subscription for automatic updates
  useEffect(() => {
    if (userRole === 'admin') {
      const profilesChannel = supabase
        .channel('profiles-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'profiles' },
          () => {
            console.log('Profile change detected, refreshing user list...');
            fetchUsers();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'user_roles' },
          () => {
            console.log('User role change detected, refreshing user list...');
            fetchUsers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(profilesChannel);
      };
    }
  }, [userRole]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      
      // Use secure function that only returns limited profile data for admins
      const { data: limitedProfiles, error: profileError } = await supabase.rpc('get_limited_profiles_for_admin');
      
      if (profileError) {
        console.error('Error fetching limited profiles:', profileError);
        toast.error('Failed to fetch user profiles: ' + profileError.message);
        return;
      }

      // Call the edge function to get user authentication data
      const { data, error } = await supabase.functions.invoke('admin-get-users');
      
      if (error) {
        console.error('Error calling admin-get-users function:', error);
        toast.error('Failed to fetch users: ' + error.message);
        return;
      }

      // Merge limited profile data to ensure sensitive data is not exposed
      if (data?.users && limitedProfiles) {
        const secureUsers = data.users.map((user: any) => {
          const limitedProfile = limitedProfiles.find((p: any) => p.id === user.id);
          return {
            ...user,
            // Override with limited profile data to prevent sensitive data exposure
            profile: limitedProfile || {
              id: user.id,
              username: 'Unknown',
              full_name: 'Unknown User',
              created_at: new Date().toISOString()
            }
          };
        });
        setUsers(secureUsers);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const createUser = async () => {
    try {
      // Since we can't use admin.createUser from client, we'll just update the form message
      toast.error('User creation from admin dashboard requires server-side implementation. Users can register normally through the signup page.');
      return;
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  };

  const changeUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        toast.error('Failed to update user role');
        return;
      }

      toast.success(`User role updated to ${newRole}`);
      setIsRoleChangeOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error changing user role:', error);
      toast.error('Failed to update user role');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            size="sm"
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users and system settings</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'admin').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'user').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Good</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users & Roles
            </TabsTrigger>
            <TabsTrigger value="create-user" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create User
            </TabsTrigger>
            <TabsTrigger value="invite-user" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite User
            </TabsTrigger>
            <TabsTrigger value="approvers" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Approvers
            </TabsTrigger>
            <TabsTrigger value="target-setup" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Target Setup
            </TabsTrigger>
            <TabsTrigger value="holidays" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Holidays
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>
                  General system statistics and recent activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Recent Signups</p>
                      <p className="text-2xl font-bold">
                        {users.filter(u => new Date(u.id).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Last 7 days</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Active Sessions</p>
                      <p className="text-2xl font-bold">{users.length}</p>
                      <p className="text-xs text-muted-foreground">Currently online</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Users & Roles Management</CardTitle>
                <CardDescription>
                  View and manage all user accounts and their assigned roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold">Total Users: {users.length}</h4>
                      <p className="text-sm text-muted-foreground">
                        Admins: {users.filter(u => u.role === 'admin').length} | 
                        Users: {users.filter(u => u.role === 'user').length}
                      </p>
                    </div>
                    <Button onClick={fetchUsers} variant="outline" size="sm">
                      Refresh
                    </Button>
                  </div>
                </div>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Photo</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={user.profile?.profile_picture_url} />
                              <AvatarFallback>{user.profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.full_name}</TableCell>
                          <TableCell>{user.phone_number}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {user.last_sign_in_at 
                              ? new Date(user.last_sign_in_at).toLocaleDateString()
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.email_confirmed_at ? 'default' : 'secondary'}>
                              {user.email_confirmed_at ? 'Verified' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsRoleChangeOpen(true);
                              }}
                            >
                              Change Role
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-user" className="space-y-6">
            <CreateUserForm />
          </TabsContent>

          <TabsContent value="invite-user" className="space-y-6">
            <UserInvitationForm />
          </TabsContent>

          <TabsContent value="approvers" className="space-y-6">
            <ApproverManagement />
          </TabsContent>

          <TabsContent value="target-setup" className="space-y-4">
            <TargetSetupMaster />
          </TabsContent>

          <TabsContent value="holidays" className="space-y-4">
            <HolidayManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>User Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to register accounts
                      </p>
                    </div>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Verification</Label>
                      <p className="text-sm text-muted-foreground">
                        Require email verification for new accounts
                      </p>
                    </div>
                    <Badge variant="secondary">Optional</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Database Status</Label>
                      <p className="text-sm text-muted-foreground">
                        Current database connection status
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-green-600" />
                      <Badge variant="default">Connected</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Role Change Dialog */}
        <Dialog open={isRoleChangeOpen} onOpenChange={setIsRoleChangeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Change the role for {selectedUser?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p>Current role: <Badge>{selectedUser?.role}</Badge></p>
              <div className="flex gap-2">
                <Button
                  variant={selectedUser?.role === 'user' ? 'default' : 'outline'}
                  onClick={() => selectedUser && changeUserRole(selectedUser.id, 'user')}
                  disabled={selectedUser?.role === 'user'}
                >
                  Make User
                </Button>
                <Button
                  variant={selectedUser?.role === 'admin' ? 'default' : 'outline'}
                  onClick={() => selectedUser && changeUserRole(selectedUser.id, 'admin')}
                  disabled={selectedUser?.role === 'admin'}
                >
                  Make Admin
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleChangeOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};