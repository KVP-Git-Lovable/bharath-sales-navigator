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
import { toast } from 'sonner';
import { Settings, Clock, Edit, Save, Plus } from 'lucide-react';
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


const AttendancePolicyConfig = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
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
      const [leaveTypesRes, policiesRes] = await Promise.all([
        supabase.from('leave_types').select('*').order('name'),
        supabase.from('leave_policy').select('*'),
      ]);

      if (leaveTypesRes.error) throw leaveTypesRes.error;
      if (policiesRes.error) throw policiesRes.error;

      setLeaveTypes(leaveTypesRes.data || []);
      
      // Join leave types with policies
      const enrichedPolicies = (policiesRes.data || []).map(policy => ({
        ...policy,
        leave_types: leaveTypesRes.data?.find(lt => lt.id === policy.leave_type_id),
      }));
      setLeavePolicies(enrichedPolicies);
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
