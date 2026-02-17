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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, Save, Search, AlertCircle, ChevronDown, ChevronRight, Layers, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SignedAvatarImage } from '@/components/ui/signed-image';
import { PERMISSION_MODULES, PERMISSION_FIELDS, PermissionField, getAllPermissionItems, getTotalFeatureCount, getAllModulePermissionItems, SYSTEM_ADMINISTRATOR_PROFILE } from './permissionModules';

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
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

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

  // Fetch user's profile permissions (inherited from profile) and profile name
  const { data: userProfileData } = useQuery({
    queryKey: ['user-profile-data', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      
      // First get the user's profile_id
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('profile_id')
        .eq('user_id', selectedUserId)
        .single();
      
      if (!userProfile?.profile_id) return null;
      
      // Get the profile name
      const { data: profile } = await supabase
        .from('security_profiles')
        .select('id, name')
        .eq('id', userProfile.profile_id)
        .single();
      
      // Then get the profile permissions
      const { data: permissions, error } = await supabase
        .from('profile_object_permissions')
        .select('*')
        .eq('profile_id', userProfile.profile_id);
      
      if (error) throw error;
      return { 
        profileName: profile?.name || null, 
        permissions: permissions || [] 
      };
    },
    enabled: !!selectedUserId
  });

  const profilePermissions = userProfileData?.permissions || [];
  const isUserSystemAdministrator = userProfileData?.profileName === SYSTEM_ADMINISTRATOR_PROFILE;
  const allPermissionItems = getAllModulePermissionItems();

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

  const toggleModule = (moduleName: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleName)) {
      newExpanded.delete(moduleName);
    } else {
      newExpanded.add(moduleName);
    }
    setExpandedModules(newExpanded);
  };

  const toggleFeature = (featureName: string) => {
    setExpandedFeatures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(featureName)) {
        newSet.delete(featureName);
      } else {
        newSet.add(featureName);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedModules(new Set(PERMISSION_MODULES.map(m => m.name)));
    // Also expand all features with sub-features
    const allFeatures: string[] = [];
    PERMISSION_MODULES.forEach(m => {
      m.features.forEach(f => {
        if (f.subFeatures && f.subFeatures.length > 0) {
          allFeatures.push(f.name);
        }
      });
    });
    setExpandedFeatures(new Set(allFeatures));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedFeatures(new Set());
  };

  const handlePermissionChange = (featureName: string, field: string, value: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [featureName]: {
        ...prev[featureName],
        [field]: value
      }
    }));
  };

  const getPermissionValue = (featureName: string, field: string): boolean => {
    // For System Administrator profile, auto-grant ALL permissions across all modules
    if (isUserSystemAdministrator && allPermissionItems.includes(featureName)) {
      // Still allow pending changes to override
      if (pendingChanges[featureName]?.[field as keyof UserPermission] !== undefined) {
        return pendingChanges[featureName][field as keyof UserPermission] as boolean;
      }
      // Check user-specific override
      const perm = permissions?.find(p => p.object_name === featureName);
      if (perm) {
        return perm[field as keyof UserPermission] as boolean || false;
      }
      return true; // Auto-grant for System Administrator
    }
    
    // First check pending changes
    if (pendingChanges[featureName]?.[field as keyof UserPermission] !== undefined) {
      return pendingChanges[featureName][field as keyof UserPermission] as boolean;
    }
    // Then check user-specific permissions
    const perm = permissions?.find(p => p.object_name === featureName);
    if (perm) {
      return perm[field as keyof UserPermission] as boolean || false;
    }
    return false;
  };

  const getProfilePermissionValue = (featureName: string, field: string): boolean => {
    // For System Administrator profile, auto-grant ALL permissions
    if (isUserSystemAdministrator && allPermissionItems.includes(featureName)) {
      return true;
    }
    const perm = profilePermissions?.find(p => p.object_name === featureName);
    return perm?.[field as keyof typeof perm] as boolean || false;
  };

  const hasUserOverride = (featureName: string): boolean => {
    return !!permissions?.find(p => p.object_name === featureName) || !!pendingChanges[featureName];
  };

  // Column-level bulk selection helpers
  const isColumnAllChecked = (moduleName: string, field: PermissionField): boolean => {
    const module = PERMISSION_MODULES.find(m => m.name === moduleName);
    if (!module) return false;
    const items = getAllPermissionItems(module);
    return items.every(item => getPermissionValue(item.name, field));
  };

  const isColumnIndeterminate = (moduleName: string, field: PermissionField): boolean => {
    const module = PERMISSION_MODULES.find(m => m.name === moduleName);
    if (!module) return false;
    const items = getAllPermissionItems(module);
    const checkedCount = items.filter(item => getPermissionValue(item.name, field)).length;
    return checkedCount > 0 && checkedCount < items.length;
  };

  const handleColumnToggle = (moduleName: string, field: PermissionField, checked: boolean) => {
    const module = PERMISSION_MODULES.find(m => m.name === moduleName);
    if (!module) return;
    
    const items = getAllPermissionItems(module);
    const newChanges = { ...pendingChanges };
    items.forEach(item => {
      newChanges[item.name] = {
        ...newChanges[item.name],
        [field]: checked
      };
    });
    setPendingChanges(newChanges);
  };

  // Feature-level column helpers for sub-features
  const isFeatureColumnAllChecked = (featureName: string, subFeatures: { name: string; label: string }[], field: string): boolean => {
    return subFeatures.every(sf => getPermissionValue(sf.name, field));
  };

  const isFeatureColumnIndeterminate = (featureName: string, subFeatures: { name: string; label: string }[], field: string): boolean => {
    const checkedCount = subFeatures.filter(sf => getPermissionValue(sf.name, field)).length;
    return checkedCount > 0 && checkedCount < subFeatures.length;
  };

  const handleFeatureColumnToggle = (subFeatures: { name: string; label: string }[], field: string, checked: boolean) => {
    const newChanges: Record<string, Partial<UserPermission>> = { ...pendingChanges };
    subFeatures.forEach(sf => {
      newChanges[sf.name] = {
        ...newChanges[sf.name],
        [field]: checked
      };
    });
    setPendingChanges(newChanges);
  };

  const getModuleEnabledCount = (moduleName: string): number => {
    const module = PERMISSION_MODULES.find(m => m.name === moduleName);
    if (!module) return 0;
    
    const items = getAllPermissionItems(module);
    let count = 0;
    items.forEach(item => {
      PERMISSION_FIELDS.forEach(field => {
        if (getPermissionValue(item.name, field.key)) count++;
      });
    });
    return count;
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

  const renderPermissionCheckboxes = (objectName: string) => (
    <>
      {PERMISSION_FIELDS.map((field) => (
        <TableCell key={field.key} className="text-center">
          <div className="flex flex-col items-center gap-1">
            <Checkbox
              checked={getPermissionValue(objectName, field.key)}
              onCheckedChange={(checked) => 
                handlePermissionChange(objectName, field.key, checked as boolean)
              }
            />
            {!hasUserOverride(objectName) && getProfilePermissionValue(objectName, field.key) && (
              <span className="text-[10px] text-muted-foreground">(profile)</span>
            )}
          </div>
        </TableCell>
      ))}
    </>
  );

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
                      <SignedAvatarImage src={user.profile_picture_url || undefined} />
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
              <SignedAvatarImage src={selectedUser.profile_picture_url || undefined} />
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

        {/* Expand/Collapse Controls */}
        {selectedUserId && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              <Layers className="h-4 w-4 mr-1" />
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        )}

        {/* Module-based Permissions Grid */}
        {selectedUserId && (
          <div className="space-y-3">
            {PERMISSION_MODULES.map((module) => {
              const isExpanded = expandedModules.has(module.name);
              const enabledCount = getModuleEnabledCount(module.name);
              const totalCount = getTotalFeatureCount(module);
              const hasSubFeatures = module.features.some(f => f.subFeatures && f.subFeatures.length > 0);
              
              return (
                <Collapsible 
                  key={module.name} 
                  open={isExpanded}
                  onOpenChange={() => toggleModule(module.name)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Layers className="h-4 w-4 text-primary" />
                        <span className="font-medium">{module.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {totalCount} {hasSubFeatures ? 'sub-features' : 'features'}
                        </Badge>
                      </div>
                      {enabledCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {enabledCount} enabled
                        </Badge>
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border rounded-lg mt-2 overflow-hidden">
                      {hasSubFeatures ? (
                        // Render 3-level hierarchy for modules with sub-features
                        <div className="divide-y">
                          {module.features.map((feature) => {
                            const isFeatureExpanded = expandedFeatures.has(feature.name);
                            const subFeatures = feature.subFeatures || [];
                            
                            if (subFeatures.length === 0) {
                              // Simple feature without sub-features
                              return (
                                <Table key={feature.name}>
                                  <TableBody>
                                    <TableRow>
                                      <TableCell className="w-[250px] font-medium text-sm pl-8">
                                        <div className="flex items-center gap-2">
                                          {feature.label}
                                          {hasUserOverride(feature.name) && (
                                            <Badge variant="secondary" className="text-xs">Override</Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      {renderPermissionCheckboxes(feature.name)}
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              );
                            }
                            
                            return (
                              <Collapsible
                                key={feature.name}
                                open={isFeatureExpanded}
                                onOpenChange={() => toggleFeature(feature.name)}
                              >
                                <CollapsibleTrigger className="w-full">
                                  <div className="flex items-center gap-3 p-3 pl-6 bg-muted/30 hover:bg-muted/50 transition-colors border-b">
                                    {isFeatureExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium">{feature.label}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({subFeatures.length} sub-features)
                                    </span>
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/30">
                                        <TableHead className="w-[250px] pl-12">Sub-feature</TableHead>
                                        {PERMISSION_FIELDS.map((field) => (
                                          <TableHead key={field.key} className="text-center w-[100px]">
                                            <div className="flex flex-col items-center gap-1">
                                              <Checkbox
                                                checked={isFeatureColumnAllChecked(feature.name, subFeatures, field.key)}
                                                ref={(el) => {
                                                  if (el) {
                                                    (el as any).indeterminate = isFeatureColumnIndeterminate(feature.name, subFeatures, field.key);
                                                  }
                                                }}
                                                onCheckedChange={(checked) => 
                                                  handleFeatureColumnToggle(subFeatures, field.key, checked as boolean)
                                                }
                                              />
                                              <span className="text-xs">{field.label}</span>
                                            </div>
                                          </TableHead>
                                        ))}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {subFeatures.map((subFeature) => (
                                        <TableRow key={subFeature.name} className={hasUserOverride(subFeature.name) ? 'bg-primary/5' : ''}>
                                          <TableCell className="font-medium text-sm pl-12">
                                            <div className="flex items-center gap-2">
                                              {subFeature.label}
                                              {hasUserOverride(subFeature.name) && (
                                                <Badge variant="secondary" className="text-xs">Override</Badge>
                                              )}
                                            </div>
                                          </TableCell>
                                          {renderPermissionCheckboxes(subFeature.name)}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        </div>
                      ) : (
                        // Render 2-level hierarchy for modules without sub-features
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="w-[250px]">Feature</TableHead>
                              {PERMISSION_FIELDS.map((field) => (
                                <TableHead key={field.key} className="text-center w-[100px]">
                                  <div className="flex flex-col items-center gap-1">
                                    <Checkbox
                                      checked={isColumnAllChecked(module.name, field.key)}
                                      ref={(el) => {
                                        if (el) {
                                          (el as any).indeterminate = isColumnIndeterminate(module.name, field.key);
                                        }
                                      }}
                                      onCheckedChange={(checked) => 
                                        handleColumnToggle(module.name, field.key, checked as boolean)
                                      }
                                    />
                                    <span className="text-xs">{field.label}</span>
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {module.features.map((feature) => {
                              const hasOverride = hasUserOverride(feature.name);
                              return (
                                <TableRow key={feature.name} className={hasOverride ? 'bg-primary/5' : ''}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      {feature.label}
                                      {hasOverride && (
                                        <Badge variant="secondary" className="text-xs">Override</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  {renderPermissionCheckboxes(feature.name)}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {!selectedUserId && (
          <div className="text-center py-8 text-muted-foreground">
            Select a user to configure permissions
          </div>
        )}
      </CardContent>
    </Card>
  );
};
