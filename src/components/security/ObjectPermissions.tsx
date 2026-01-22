import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Shield, Save, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { PERMISSION_MODULES, PERMISSION_FIELDS, PermissionField } from './permissionModules';

interface ObjectPermission {
  id: string;
  profile_id: string;
  object_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_view_all: boolean;
  can_modify_all: boolean;
}

export const ObjectPermissions = () => {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<ObjectPermission>>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Fetch profiles
  const { data: profiles } = useQuery({
    queryKey: ['security-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_profiles')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch permissions for selected profile
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['profile-object-permissions', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      
      const { data, error } = await supabase
        .from('profile_object_permissions')
        .select('*')
        .eq('profile_id', selectedProfileId);
      
      if (error) throw error;
      return data as ObjectPermission[];
    },
    enabled: !!selectedProfileId
  });

  // Save mutations
  const saveMutation = useMutation({
    mutationFn: async (changes: Record<string, Partial<ObjectPermission>>) => {
      const updates = Object.entries(changes).map(([objectName, perms]) => ({
        profile_id: selectedProfileId,
        object_name: objectName,
        ...perms
      }));

      const { error } = await supabase
        .from('profile_object_permissions')
        .upsert(updates, { onConflict: 'profile_id,object_name' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-object-permissions'] });
      setPendingChanges({});
      toast.success('Permissions updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update permissions');
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
    if (pendingChanges[objectName]?.[field] !== undefined) {
      return pendingChanges[objectName][field] as boolean;
    }
    const perm = permissions?.find(p => p.object_name === objectName);
    return perm?.[field as keyof ObjectPermission] as boolean || false;
  };

  const handleSave = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info('No changes to save');
      return;
    }
    saveMutation.mutate(pendingChanges);
  };

  const toggleModule = (moduleName: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleName)) {
        newSet.delete(moduleName);
      } else {
        newSet.add(moduleName);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedModules(new Set(PERMISSION_MODULES.map(m => m.name)));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // Check if all features in a module have a specific permission enabled
  const isColumnAllChecked = (moduleName: string, field: string): boolean => {
    const module = PERMISSION_MODULES.find(m => m.name === moduleName);
    if (!module) return false;
    return module.features.every(feature => getPermissionValue(feature.name, field));
  };

  // Check if some (but not all) features have a permission enabled
  const isColumnIndeterminate = (moduleName: string, field: string): boolean => {
    const module = PERMISSION_MODULES.find(m => m.name === moduleName);
    if (!module) return false;
    const checkedCount = module.features.filter(feature => getPermissionValue(feature.name, field)).length;
    return checkedCount > 0 && checkedCount < module.features.length;
  };

  // Toggle all features in a module for a specific permission
  const handleColumnToggle = (moduleName: string, field: string, checked: boolean) => {
    const module = PERMISSION_MODULES.find(m => m.name === moduleName);
    if (!module) return;

    const newChanges: Record<string, Partial<ObjectPermission>> = { ...pendingChanges };
    module.features.forEach(feature => {
      newChanges[feature.name] = {
        ...newChanges[feature.name],
        [field]: checked
      };
    });
    setPendingChanges(newChanges);
  };

  // Count enabled permissions per module
  const getModuleEnabledCount = (moduleName: string) => {
    const module = PERMISSION_MODULES.find(m => m.name === moduleName);
    if (!module) return 0;
    
    let count = 0;
    module.features.forEach(feature => {
      PERMISSION_FIELDS.forEach(field => {
        if (getPermissionValue(feature.name, field.key)) count++;
      });
    });
    return count;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Object Permissions</CardTitle>
            <CardDescription>Configure what features each profile can access</CardDescription>
          </div>
          {hasPendingChanges && (
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Selector */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label>Select Profile</Label>
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Choose a profile to configure" />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {profile.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProfileId && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          )}
        </div>

        {/* Module-based Permissions */}
        {selectedProfileId && (
          <div className="space-y-3">
            {PERMISSION_MODULES.map((module) => {
              const isExpanded = expandedModules.has(module.name);
              const enabledCount = getModuleEnabledCount(module.name);
              
              return (
                <Collapsible
                  key={module.name}
                  open={isExpanded}
                  onOpenChange={() => toggleModule(module.name)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Layers className="h-4 w-4 text-primary" />
                          <span className="font-medium">{module.label}</span>
                          <span className="text-xs text-muted-foreground">
                            ({module.features.length} features)
                          </span>
                        </div>
                        {enabledCount > 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {enabledCount} permissions enabled
                          </span>
                        )}
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-background">
                            <TableHead className="w-[250px]">Feature</TableHead>
                            <TableHead className="text-center w-[100px]">
                              <div className="flex flex-col items-center gap-1">
                                <span>Read</span>
                                <Checkbox
                                  checked={isColumnAllChecked(module.name, 'can_read')}
                                  ref={(el) => {
                                    if (el) {
                                      (el as any).indeterminate = isColumnIndeterminate(module.name, 'can_read');
                                    }
                                  }}
                                  onCheckedChange={(checked) => 
                                    handleColumnToggle(module.name, 'can_read', checked as boolean)
                                  }
                                />
                              </div>
                            </TableHead>
                            <TableHead className="text-center w-[100px]">
                              <div className="flex flex-col items-center gap-1">
                                <span>Create</span>
                                <Checkbox
                                  checked={isColumnAllChecked(module.name, 'can_create')}
                                  ref={(el) => {
                                    if (el) {
                                      (el as any).indeterminate = isColumnIndeterminate(module.name, 'can_create');
                                    }
                                  }}
                                  onCheckedChange={(checked) => 
                                    handleColumnToggle(module.name, 'can_create', checked as boolean)
                                  }
                                />
                              </div>
                            </TableHead>
                            <TableHead className="text-center w-[100px]">
                              <div className="flex flex-col items-center gap-1">
                                <span>Edit</span>
                                <Checkbox
                                  checked={isColumnAllChecked(module.name, 'can_edit')}
                                  ref={(el) => {
                                    if (el) {
                                      (el as any).indeterminate = isColumnIndeterminate(module.name, 'can_edit');
                                    }
                                  }}
                                  onCheckedChange={(checked) => 
                                    handleColumnToggle(module.name, 'can_edit', checked as boolean)
                                  }
                                />
                              </div>
                            </TableHead>
                            <TableHead className="text-center w-[100px]">
                              <div className="flex flex-col items-center gap-1">
                                <span>Delete</span>
                                <Checkbox
                                  checked={isColumnAllChecked(module.name, 'can_delete')}
                                  ref={(el) => {
                                    if (el) {
                                      (el as any).indeterminate = isColumnIndeterminate(module.name, 'can_delete');
                                    }
                                  }}
                                  onCheckedChange={(checked) => 
                                    handleColumnToggle(module.name, 'can_delete', checked as boolean)
                                  }
                                />
                              </div>
                            </TableHead>
                            <TableHead className="text-center w-[100px]">
                              <div className="flex flex-col items-center gap-1">
                                <span>View All</span>
                                <Checkbox
                                  checked={isColumnAllChecked(module.name, 'can_view_all')}
                                  ref={(el) => {
                                    if (el) {
                                      (el as any).indeterminate = isColumnIndeterminate(module.name, 'can_view_all');
                                    }
                                  }}
                                  onCheckedChange={(checked) => 
                                    handleColumnToggle(module.name, 'can_view_all', checked as boolean)
                                  }
                                />
                              </div>
                            </TableHead>
                            <TableHead className="text-center w-[100px]">
                              <div className="flex flex-col items-center gap-1">
                                <span>Modify All</span>
                                <Checkbox
                                  checked={isColumnAllChecked(module.name, 'can_modify_all')}
                                  ref={(el) => {
                                    if (el) {
                                      (el as any).indeterminate = isColumnIndeterminate(module.name, 'can_modify_all');
                                    }
                                  }}
                                  onCheckedChange={(checked) => 
                                    handleColumnToggle(module.name, 'can_modify_all', checked as boolean)
                                  }
                                />
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {module.features.map((feature) => (
                            <TableRow key={feature.name}>
                              <TableCell className="font-medium text-sm">
                                {feature.label}
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_read')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_read', checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_create')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_create', checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_edit')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_edit', checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_delete')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_delete', checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_view_all')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_view_all', checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_modify_all')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_modify_all', checked as boolean)
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}

        {!selectedProfileId && (
          <div className="text-center py-12 text-muted-foreground">
            Select a profile to configure its permissions
          </div>
        )}

        {/* Legend */}
        {selectedProfileId && (
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
