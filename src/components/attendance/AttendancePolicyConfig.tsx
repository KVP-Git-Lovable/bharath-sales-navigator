import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Settings, Calendar, Clock, Edit, Save, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LeaveType {
  id: string;
  name: string;
  description: string | null;
}

interface LeavePolicy {
  id: string;
  leave_type_id: string;
  yearly_entitlement: number;
  monthly_accrual: number | null;
  accrual_type: string;
  carry_forward_allowed: boolean;
  max_carry_forward: number;
  is_active: boolean;
  leave_types?: LeaveType;
}

interface WeekOffConfig {
  id: string;
  day_of_week: number;
  is_off: boolean;
  alternate_pattern: string | null;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const alternatePatterns = [
  { value: 'none', label: 'Working Day' },
  { value: 'all', label: 'Full Off' },
  { value: '1st_3rd', label: '1st & 3rd Week Off' },
  { value: '2nd_4th', label: '2nd & 4th Week Off' },
];

const AttendancePolicyConfig = () => {
  const [activeSubTab, setActiveSubTab] = useState('leave-entitlements');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
  const [weekOffConfig, setWeekOffConfig] = useState<WeekOffConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    leave_type_id: '',
    yearly_entitlement: 12,
    monthly_accrual: 0,
    accrual_type: 'yearly',
    carry_forward_allowed: false,
    max_carry_forward: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leaveTypesRes, policiesRes, weekOffRes] = await Promise.all([
        supabase.from('leave_types').select('*').order('name'),
        supabase.from('leave_policy').select('*'),
        supabase.from('week_off_config').select('*').order('day_of_week'),
      ]);

      if (leaveTypesRes.error) throw leaveTypesRes.error;
      if (policiesRes.error) throw policiesRes.error;
      if (weekOffRes.error) throw weekOffRes.error;

      setLeaveTypes(leaveTypesRes.data || []);
      
      // Join leave types with policies
      const enrichedPolicies = (policiesRes.data || []).map(policy => ({
        ...policy,
        leave_types: leaveTypesRes.data?.find(lt => lt.id === policy.leave_type_id),
      }));
      setLeavePolicies(enrichedPolicies);
      setWeekOffConfig(weekOffRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load attendance policies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!formData.leave_type_id) {
      toast.error('Please select a leave type');
      return;
    }

    setIsSaving(true);
    try {
      const policyData = {
        leave_type_id: formData.leave_type_id,
        yearly_entitlement: formData.yearly_entitlement,
        monthly_accrual: formData.accrual_type === 'monthly' ? formData.monthly_accrual : null,
        accrual_type: formData.accrual_type,
        carry_forward_allowed: formData.carry_forward_allowed,
        max_carry_forward: formData.carry_forward_allowed ? formData.max_carry_forward : 0,
        is_active: true,
      };

      if (editingPolicy) {
        const { error } = await supabase
          .from('leave_policy')
          .update(policyData)
          .eq('id', editingPolicy.id);
        
        if (error) throw error;
        toast.success('Leave policy updated successfully');
      } else {
        const { error } = await supabase
          .from('leave_policy')
          .insert(policyData);
        
        if (error) {
          if (error.code === '23505') {
            toast.error('A policy for this leave type already exists');
            return;
          }
          throw error;
        }
        toast.success('Leave policy created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving policy:', error);
      toast.error('Failed to save leave policy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWeekOffChange = async (dayOfWeek: number, field: 'is_off' | 'alternate_pattern', value: boolean | string) => {
    try {
      const updateData: Partial<WeekOffConfig> = {};
      if (field === 'is_off') {
        updateData.is_off = value as boolean;
        updateData.alternate_pattern = value ? 'all' : 'none';
      } else {
        updateData.alternate_pattern = value as string;
        updateData.is_off = value !== 'none';
      }

      const { error } = await supabase
        .from('week_off_config')
        .update(updateData)
        .eq('day_of_week', dayOfWeek);

      if (error) throw error;
      
      setWeekOffConfig(prev => 
        prev.map(config => 
          config.day_of_week === dayOfWeek 
            ? { ...config, ...updateData }
            : config
        )
      );
      toast.success(`${dayNames[dayOfWeek]} schedule updated`);
    } catch (error) {
      console.error('Error updating week-off config:', error);
      toast.error('Failed to update week-off configuration');
    }
  };

  const openEditDialog = (policy: LeavePolicy) => {
    setEditingPolicy(policy);
    setFormData({
      leave_type_id: policy.leave_type_id,
      yearly_entitlement: policy.yearly_entitlement,
      monthly_accrual: policy.monthly_accrual || 0,
      accrual_type: policy.accrual_type,
      carry_forward_allowed: policy.carry_forward_allowed,
      max_carry_forward: policy.max_carry_forward,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingPolicy(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      leave_type_id: '',
      yearly_entitlement: 12,
      monthly_accrual: 0,
      accrual_type: 'yearly',
      carry_forward_allowed: false,
      max_carry_forward: 0,
    });
    setEditingPolicy(null);
  };

  const getUnconfiguredLeaveTypes = () => {
    const configuredIds = leavePolicies.map(p => p.leave_type_id);
    return leaveTypes.filter(lt => !configuredIds.includes(lt.id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leave-entitlements" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Leave Entitlements
          </TabsTrigger>
          <TabsTrigger value="week-off" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Week-Off Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave-entitlements" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leave Entitlements</CardTitle>
                  <CardDescription>
                    Configure yearly leave quotas and accrual settings for each leave type
                  </CardDescription>
                </div>
                <Button onClick={openCreateDialog} disabled={getUnconfiguredLeaveTypes().length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Policy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {leavePolicies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No leave policies configured. Click "Add Policy" to create your first leave entitlement.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Yearly Entitlement</TableHead>
                      <TableHead>Accrual Type</TableHead>
                      <TableHead>Carry Forward</TableHead>
                      <TableHead>Max Carry Forward</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leavePolicies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">
                          {policy.leave_types?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{policy.yearly_entitlement} days</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{policy.accrual_type}</TableCell>
                        <TableCell>
                          {policy.carry_forward_allowed ? (
                            <Badge className="bg-green-100 text-green-800">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {policy.carry_forward_allowed ? `${policy.max_carry_forward} days` : '-'}
                        </TableCell>
                        <TableCell>
                          {policy.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(policy)}>
                            <Edit className="h-4 w-4" />
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

        <TabsContent value="week-off" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Week-Off Configuration</CardTitle>
              <CardDescription>
                Define which days are weekly off and configure alternate week-off patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekOffConfig.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{dayNames[config.day_of_week]}</TableCell>
                      <TableCell>
                        <Select
                          value={config.alternate_pattern || 'none'}
                          onValueChange={(value) => handleWeekOffChange(config.day_of_week, 'alternate_pattern', value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {alternatePatterns.map((pattern) => (
                              <SelectItem key={pattern.value} value={pattern.value}>
                                {pattern.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {config.is_off ? (
                          <Badge className="bg-orange-100 text-orange-800">Off</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Working</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Leave Policy Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'Edit Leave Policy' : 'Create Leave Policy'}</DialogTitle>
            <DialogDescription>
              Configure leave entitlements and accrual settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Leave Type</Label>
              <Select
                value={formData.leave_type_id}
                onValueChange={(value) => setFormData({ ...formData, leave_type_id: value })}
                disabled={!!editingPolicy}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {(editingPolicy ? leaveTypes : getUnconfiguredLeaveTypes()).map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Yearly Entitlement (days)</Label>
              <Input
                type="number"
                value={formData.yearly_entitlement}
                onChange={(e) => setFormData({ ...formData, yearly_entitlement: parseInt(e.target.value) || 0 })}
                min={0}
                max={365}
              />
            </div>

            <div>
              <Label>Accrual Type</Label>
              <Select
                value={formData.accrual_type}
                onValueChange={(value) => setFormData({ ...formData, accrual_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">Yearly (All at once)</SelectItem>
                  <SelectItem value="monthly">Monthly Accrual</SelectItem>
                  <SelectItem value="quarterly">Quarterly Accrual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.accrual_type === 'monthly' && (
              <div>
                <Label>Monthly Accrual (days per month)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.monthly_accrual}
                  onChange={(e) => setFormData({ ...formData, monthly_accrual: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={10}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.carry_forward_allowed}
                onCheckedChange={(checked) => setFormData({ ...formData, carry_forward_allowed: checked })}
              />
              <Label>Allow Carry Forward</Label>
            </div>

            {formData.carry_forward_allowed && (
              <div>
                <Label>Maximum Carry Forward (days)</Label>
                <Input
                  type="number"
                  value={formData.max_carry_forward}
                  onChange={(e) => setFormData({ ...formData, max_carry_forward: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={365}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePolicy} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendancePolicyConfig;
