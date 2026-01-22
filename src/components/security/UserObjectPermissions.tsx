import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User, Database, Save, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const OBJECTS = [
  { name: 'retailers', label: 'Retailers' },
  { name: 'orders', label: 'Orders' },
  { name: 'visits', label: 'Visits' },
  { name: 'products', label: 'Products' },
  { name: 'territories', label: 'Territories' },
  { name: 'attendance', label: 'Attendance' },
  { name: 'expenses', label: 'Expenses' },
  { name: 'beats', label: 'Beats' },
  { name: 'distributors', label: 'Distributors' },
  { name: 'invoices', label: 'Invoices' },
];

interface UserPermission {
  id: string;
  user_id: string;
  object_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_view_all: boolean;
  can_modify_all: boolean;
}

interface UserOption {
  id: string;
  full_name: string;
  username: string;
  profile_picture_url: string | null;
}

export const UserObjectPermissions = () => {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<UserPermission>>>({});

  // Fetch users
  const { data: users } = useQuery({
    queryKey: ['users-for-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, profile_picture_url')
        .order('full_name');
      if (error) throw error;
      return data as UserOption[];
    }
  });

  // Filter users based on search
  const filteredUsers = users?.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected user info
  const selectedUser = users?.find(u => u.id === selectedUserId);

  // Fetch permissions for selected user
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-object-permissions', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      
      const { data, error } = await supabase
        .from('user_object_permissions')
        .select('*')
        .eq('user_id', selectedUserId);
      
      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!selectedUserId
  });

  // Fetch user's profile permissions (inherited from profile)
  const { data: profilePermissions } = useQuery({
    queryKey: ['user-profile-permissions', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      
      // First get the user's profile_id
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('profile_id')
        .eq('user_id', selectedUserId)
        .single();
      
      if (!userProfile?.profile_id) return [];
      
      // Then get the profile permissions
      const { data, error } = await supabase
        .from('profile_object_permissions')
        .select('*')
        .eq('profile_id', userProfile.profile_id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId
  });

  // Save mutations
  const saveMutation = useMutation({
    mutationFn: async (changes: Record<string, Partial<UserPermission>>) => {
      const updates = Object.entries(changes).map(([objectName, perms]) => ({
        user_id: selectedUserId,
        object_name: objectName,
        ...perms
      }));

      const { error } = await supabase
        .from('user_object_permissions')
        .upsert(updates, { onConflict: 'user_id,object_name' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-object-permissions'] });
      setPendingChanges({});
      toast.success('User permissions updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update permissions');
    }
  });

  // Clear user permissions mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_object_permissions')
        .delete()
        .eq('user_id', selectedUserId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-object-permissions'] });
      setPendingChanges({});
      toast.success('User-specific permissions cleared. User will inherit profile permissions.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to clear permissions');
    }
  });

  const handlePermissionChange = (objectName: string, field: string, value: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [objectName]: {
        ...prev[objectName],
        [field]: value
      }
    }));
  };

  const getPermissionValue = (objectName: string, field: string): boolean => {
    // First check pending changes
    if (pendingChanges[objectName]?.[field as keyof UserPermission] !== undefined) {
      return pendingChanges[objectName][field as keyof UserPermission] as boolean;
    }
    // Then check user-specific permissions
    const perm = permissions?.find(p => p.object_name === objectName);
    if (perm) {
      return perm[field as keyof UserPermission] as boolean || false;
    }
    return false;
  };

  const getProfilePermissionValue = (objectName: string, field: string): boolean => {
    const perm = profilePermissions?.find(p => p.object_name === objectName);
    return perm?.[field as keyof typeof perm] as boolean || false;
  };

  const hasUserOverride = (objectName: string): boolean => {
    return !!permissions?.find(p => p.object_name === objectName);
  };

  const handleSave = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info('No changes to save');
      return;
    }
    saveMutation.mutate(pendingChanges);
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;
  const hasUserPermissions = permissions && permissions.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User-Specific Permissions
            </CardTitle>
            <CardDescription>
              Override profile permissions for individual users
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {hasUserPermissions && (
              <Button 
                variant="outline" 
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
              >
                Clear Overrides
              </Button>
            )}
            {hasPendingChanges && (
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Selector */}
        <div className="space-y-2">
          <Label>Select User</Label>
          <Select value={selectedUserId} onValueChange={(val) => {
            setSelectedUserId(val);
            setPendingChanges({});
          }}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Choose a user to configure permissions" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              {filteredUsers?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.profile_picture_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.full_name || user.username}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected User Info */}
        {selectedUser && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedUser.profile_picture_url || undefined} />
              <AvatarFallback>
                {selectedUser.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{selectedUser.full_name || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.username}</p>
            </div>
            {hasUserPermissions ? (
              <Badge variant="secondary" className="ml-auto">Has Custom Permissions</Badge>
            ) : (
              <Badge variant="outline" className="ml-auto">Using Profile Permissions</Badge>
            )}
          </div>
        )}

        {/* Info Alert */}
        {selectedUserId && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">How it works:</p>
              <p className="text-muted-foreground">
                User-specific permissions override profile permissions. If no user-specific permission is set, 
                the user inherits permissions from their assigned security profile.
              </p>
            </div>
          </div>
        )}

        {/* Permissions Grid */}
        {selectedUserId && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[200px]">Object</TableHead>
                  <TableHead className="text-center">Read</TableHead>
                  <TableHead className="text-center">Create</TableHead>
                  <TableHead className="text-center">Edit</TableHead>
                  <TableHead className="text-center">Delete</TableHead>
                  <TableHead className="text-center">View All</TableHead>
                  <TableHead className="text-center">Modify All</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {OBJECTS.map((obj) => {
                  const hasOverride = hasUserOverride(obj.name);
                  return (
                    <TableRow key={obj.name} className={hasOverride ? 'bg-primary/5' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-primary" />
                          {obj.label}
                          {hasOverride && (
                            <Badge variant="secondary" className="text-xs">Override</Badge>
                          )}
                        </div>
                      </TableCell>
                      {['can_read', 'can_create', 'can_edit', 'can_delete', 'can_view_all', 'can_modify_all'].map((field) => (
                        <TableCell key={field} className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Checkbox
                              checked={getPermissionValue(obj.name, field)}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(obj.name, field, checked as boolean)
                              }
                            />
                            {!hasOverride && getProfilePermissionValue(obj.name, field) && (
                              <span className="text-[10px] text-muted-foreground">(profile)</span>
                            )}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!selectedUserId && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a user to configure their specific permissions</p>
          </div>
        )}

        {/* Legend */}
        {selectedUserId && (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Read:</strong> View records
                </div>
                <div>
                  <strong>Create:</strong> Add new records
                </div>
                <div>
                  <strong>Edit:</strong> Update own records
                </div>
                <div>
                  <strong>Delete:</strong> Remove own records
                </div>
                <div>
                  <strong>View All:</strong> See all users' records
                </div>
                <div>
                  <strong>Modify All:</strong> Edit/delete all records
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
