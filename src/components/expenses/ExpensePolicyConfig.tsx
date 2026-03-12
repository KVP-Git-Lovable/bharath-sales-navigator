import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Car, Utensils, Receipt, Shield, Plus, Trash2, Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ExpenseCategoriesConfig from './ExpenseCategoriesConfig';
import ApprovalWorkflowsConfig from './ApprovalWorkflowsConfig';
import ApprovalRulesConfig from './ApprovalRulesConfig';

interface ExpenseConfig {
  id: string;
  ta_type: 'fixed' | 'from_beat';
  fixed_ta_amount: number;
  da_amount: number;
  ta_per_km_rate: number;
  da_calculation_basis: 'per_day' | 'per_half_day';
  max_additional_expense_per_day: number;
  max_additional_expense_per_month: number;
  require_bill_above_amount: number;
  allowed_categories: string[];
  expense_policy_notes: string;
}

interface UserExpenseOverride {
  id: string;
  user_id: string;
  ta_type: string | null;
  fixed_ta_amount: number;
  da_amount: number;
  user_name?: string;
}

interface TeamExpenseOverride {
  id: string;
  manager_id: string;
  ta_type: string | null;
  fixed_ta_amount: number;
  da_amount: number;
  manager_name?: string;
}

const DEFAULT_CATEGORIES = ['food', 'travel', 'accommodation', 'communication', 'other'];

// ─── User/Team Override Row Editor ────────────────────────────────────────────

const OverrideRow: React.FC<{
  override: { id: string; ta_type: string | null; fixed_ta_amount: number; da_amount: number; name?: string };
  onUpdate: (field: string, value: any) => void;
  onDelete: () => void;
  globalConfig: ExpenseConfig;
}> = ({ override, onUpdate, onDelete, globalConfig }) => (
  <TableRow>
    <TableCell className="text-xs font-medium py-2 px-2">{override.name || 'Unknown'}</TableCell>
    <TableCell className="py-2 px-2">
      <Select value={override.ta_type || ''} onValueChange={(v) => onUpdate('ta_type', v || null)}>
        <SelectTrigger className="h-8 text-xs w-[110px]">
          <SelectValue placeholder="Global" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fixed">Fixed</SelectItem>
          <SelectItem value="from_beat">From Beat</SelectItem>
        </SelectContent>
      </Select>
    </TableCell>
    <TableCell className="py-2 px-2">
      <Input
        type="number" min="0" className="h-8 text-xs w-[80px]"
        value={override.fixed_ta_amount}
        onChange={(e) => onUpdate('fixed_ta_amount', Number(e.target.value))}
      />
    </TableCell>
    <TableCell className="py-2 px-2">
      <Input
        type="number" min="0" className="h-8 text-xs w-[80px]"
        value={override.da_amount}
        onChange={(e) => onUpdate('da_amount', Number(e.target.value))}
      />
    </TableCell>
    <TableCell className="py-2 px-1">
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </TableCell>
  </TableRow>
);

// ─── Profile Selector for adding overrides ────────────────────────────────────

const ProfileSelector: React.FC<{
  excludeIds: string[];
  onSelect: (userId: string, name: string) => void;
  label: string;
}> = ({ excludeIds, onSelect, label }) => {
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.rpc('get_profiles_for_selector');
      setProfiles((data || []).filter((p: any) => !excludeIds.includes(p.id)));
    };
    if (open) fetch();
  }, [open, excludeIds]);

  return (
    <Select
      onValueChange={(val) => {
        const profile = profiles.find(p => p.id === val);
        if (profile) onSelect(profile.id, profile.full_name);
      }}
      onOpenChange={setOpen}
    >
      <SelectTrigger className="h-8 text-xs w-[180px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {profiles.map(p => (
          <SelectItem key={p.id} value={p.id} className="text-xs">{p.full_name}</SelectItem>
        ))}
        {profiles.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No users available</div>
        )}
      </SelectContent>
    </Select>
  );
};

const ExpensePolicyConfig = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<ExpenseConfig | null>(null);
  const [approvalMode, setApprovalMode] = useState<'auto' | 'manager' | 'multi_level'>('manager');
  const [maxLevels, setMaxLevels] = useState(1);
  const [approvalConfigId, setApprovalConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Override states
  const [userOverrides, setUserOverrides] = useState<UserExpenseOverride[]>([]);
  const [teamOverrides, setTeamOverrides] = useState<TeamExpenseOverride[]>([]);
  const [savingOverrides, setSavingOverrides] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchApprovalConfig();
    fetchOverrides();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_master_config')
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('expense_master_config')
          .insert({
            ta_type: 'from_beat',
            fixed_ta_amount: 0,
            da_amount: 0,
          } as any)
          .select()
          .single();

        if (insertError) throw insertError;
        if (newData) {
          setConfig({
            id: newData.id,
            ta_type: (newData.ta_type as 'fixed' | 'from_beat') || 'from_beat',
            fixed_ta_amount: newData.fixed_ta_amount || 0,
            da_amount: newData.da_amount || 0,
            ta_per_km_rate: (newData as any).ta_per_km_rate || 0,
            da_calculation_basis: ((newData as any).da_calculation_basis as 'per_day' | 'per_half_day') || 'per_day',
            max_additional_expense_per_day: (newData as any).max_additional_expense_per_day || 0,
            max_additional_expense_per_month: (newData as any).max_additional_expense_per_month || 0,
            require_bill_above_amount: (newData as any).require_bill_above_amount || 500,
            allowed_categories: (newData as any).allowed_categories || DEFAULT_CATEGORIES,
            expense_policy_notes: (newData as any).expense_policy_notes || '',
          });
        }
      } else if (error) {
        throw error;
      } else if (data) {
        setConfig({
          id: data.id,
          ta_type: (data.ta_type as 'fixed' | 'from_beat') || 'from_beat',
          fixed_ta_amount: data.fixed_ta_amount || 0,
          da_amount: data.da_amount || 0,
          ta_per_km_rate: (data as any).ta_per_km_rate || 0,
          da_calculation_basis: ((data as any).da_calculation_basis as 'per_day' | 'per_half_day') || 'per_day',
          max_additional_expense_per_day: (data as any).max_additional_expense_per_day || 0,
          max_additional_expense_per_month: (data as any).max_additional_expense_per_month || 0,
          require_bill_above_amount: (data as any).require_bill_above_amount || 500,
          allowed_categories: (data as any).allowed_categories || DEFAULT_CATEGORIES,
          expense_policy_notes: (data as any).expense_policy_notes || '',
        });
      }
    } catch (error) {
      console.error('Error fetching expense config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('approval_config')
        .select('*')
        .eq('entity_type', 'expense')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setApprovalConfigId(data.id);
        setApprovalMode(((data as any).approval_mode as 'auto' | 'manager' | 'multi_level') || 'manager');
        setMaxLevels(data.max_levels || 1);
      }
    } catch (error) {
      console.error('Error fetching approval config:', error);
    }
  };

  const fetchOverrides = async () => {
    try {
      // Fetch user overrides
      const { data: userData } = await (supabase as any).from('user_expense_config').select('*');
      // Fetch team overrides
      const { data: teamData } = await (supabase as any).from('team_expense_config').select('*');

      // Fetch profile names
      const allIds = [
        ...(userData || []).map((u: any) => u.user_id),
        ...(teamData || []).map((t: any) => t.manager_id),
      ];
      let nameMap = new Map<string, string>();
      if (allIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', allIds);
        profiles?.forEach((p: any) => nameMap.set(p.id, p.full_name || 'Unknown'));
      }

      setUserOverrides((userData || []).map((u: any) => ({
        ...u,
        user_name: nameMap.get(u.user_id) || 'Unknown',
      })));
      setTeamOverrides((teamData || []).map((t: any) => ({
        ...t,
        manager_name: nameMap.get(t.manager_id) || 'Unknown',
      })));
    } catch (error) {
      console.error('Error fetching overrides:', error);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('expense_master_config')
        .update({
          ta_type: config.ta_type,
          fixed_ta_amount: config.fixed_ta_amount,
          da_amount: config.da_amount,
          ta_per_km_rate: config.ta_per_km_rate,
          da_calculation_basis: config.da_calculation_basis,
          max_additional_expense_per_day: config.max_additional_expense_per_day,
          max_additional_expense_per_month: config.max_additional_expense_per_month,
          require_bill_above_amount: config.require_bill_above_amount,
          allowed_categories: config.allowed_categories,
          expense_policy_notes: config.expense_policy_notes,
        } as any)
        .eq('id', config.id);

      if (error) throw error;

      if (approvalConfigId) {
        const { error: acError } = await supabase
          .from('approval_config')
          .update({
            approval_mode: approvalMode,
            max_levels: approvalMode === 'multi_level' ? maxLevels : 1,
          } as any)
          .eq('id', approvalConfigId);
        if (acError) throw acError;
      }

      toast({ title: "Success", description: "Expense policy saved successfully" });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({ title: "Error", description: "Failed to save policy", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Override CRUD ──────────────────────────────────────────────────────────

  const addUserOverride = async (userId: string, name: string) => {
    try {
      const { data, error } = await (supabase as any).from('user_expense_config')
        .insert({ user_id: userId, ta_type: config?.ta_type || 'from_beat', fixed_ta_amount: config?.fixed_ta_amount || 0, da_amount: config?.da_amount || 0 })
        .select().single();
      if (error) throw error;
      setUserOverrides(prev => [...prev, { ...data, user_name: name }]);
      toast({ title: "Added", description: `User override added for ${name}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add override", variant: "destructive" });
    }
  };

  const addTeamOverride = async (managerId: string, name: string) => {
    try {
      const { data, error } = await (supabase as any).from('team_expense_config')
        .insert({ manager_id: managerId, ta_type: config?.ta_type || 'from_beat', fixed_ta_amount: config?.fixed_ta_amount || 0, da_amount: config?.da_amount || 0 })
        .select().single();
      if (error) throw error;
      setTeamOverrides(prev => [...prev, { ...data, manager_name: name }]);
      toast({ title: "Added", description: `Team override added for ${name}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add override", variant: "destructive" });
    }
  };

  const updateUserOverride = async (id: string, field: string, value: any) => {
    setUserOverrides(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const updateTeamOverride = async (id: string, field: string, value: any) => {
    setTeamOverrides(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const deleteUserOverride = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('user_expense_config').delete().eq('id', id);
      if (error) throw error;
      setUserOverrides(prev => prev.filter(u => u.id !== id));
      toast({ title: "Deleted", description: "User override removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete override", variant: "destructive" });
    }
  };

  const deleteTeamOverride = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('team_expense_config').delete().eq('id', id);
      if (error) throw error;
      setTeamOverrides(prev => prev.filter(t => t.id !== id));
      toast({ title: "Deleted", description: "Team override removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete override", variant: "destructive" });
    }
  };

  const saveAllOverrides = async () => {
    setSavingOverrides(true);
    try {
      // Save user overrides
      for (const u of userOverrides) {
        await (supabase as any).from('user_expense_config')
          .update({ ta_type: u.ta_type, fixed_ta_amount: u.fixed_ta_amount, da_amount: u.da_amount, updated_at: new Date().toISOString() })
          .eq('id', u.id);
      }
      // Save team overrides
      for (const t of teamOverrides) {
        await (supabase as any).from('team_expense_config')
          .update({ ta_type: t.ta_type, fixed_ta_amount: t.fixed_ta_amount, da_amount: t.da_amount, updated_at: new Date().toISOString() })
          .eq('id', t.id);
      }
      toast({ title: "Success", description: "All overrides saved" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save overrides", variant: "destructive" });
    } finally {
      setSavingOverrides(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading expense configuration...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* TA Policy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4 text-blue-600" />
            Travel Allowance (TA) Policy
            <Badge variant="outline" className="text-[10px] ml-auto">Global Default</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">TA Calculation Method</Label>
              <Select
                value={config.ta_type}
                onValueChange={(value: 'fixed' | 'from_beat') =>
                  setConfig(prev => prev ? { ...prev, ta_type: value } : null)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed TA per Day</SelectItem>
                  <SelectItem value="from_beat">TA from Beat Distance</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {config.ta_type === 'fixed'
                  ? 'Same TA amount every working day'
                  : 'TA calculated from assigned beat travel allowance'}
              </p>
            </div>

            {config.ta_type === 'fixed' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Fixed TA Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={config.fixed_ta_amount}
                  onChange={(e) =>
                    setConfig(prev => prev ? { ...prev, fixed_ta_amount: Number(e.target.value) } : null)
                  }
                />
              </div>
            )}

            {config.ta_type === 'from_beat' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Per KM Rate (₹) — optional</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={config.ta_per_km_rate}
                  onChange={(e) =>
                    setConfig(prev => prev ? { ...prev, ta_per_km_rate: Number(e.target.value) } : null)
                  }
                />
                <p className="text-[11px] text-muted-foreground">Set 0 to use beat-level fixed TA</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DA Policy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Utensils className="h-4 w-4 text-green-600" />
            Daily Allowance (DA) Policy
            <Badge variant="outline" className="text-[10px] ml-auto">Global Default</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">DA Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                value={config.da_amount}
                onChange={(e) =>
                  setConfig(prev => prev ? { ...prev, da_amount: Number(e.target.value) } : null)
                }
              />
              <p className="text-[11px] text-muted-foreground">Daily allowance given on attendance-marked days</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">DA Calculation Basis</Label>
              <Select
                value={config.da_calculation_basis}
                onValueChange={(value: 'per_day' | 'per_half_day') =>
                  setConfig(prev => prev ? { ...prev, da_calculation_basis: value } : null)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_day">Full Day Only</SelectItem>
                  <SelectItem value="per_half_day">Half Day = 50% DA</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">How DA applies for half-day attendance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Manager/Team-Level Config ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-600" />
            Manager-Level Overrides
            <Badge variant="secondary" className="text-[10px] ml-auto">Overrides Global</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] text-muted-foreground mb-3">
            Set different TA/DA for all team members under a manager. Global default: TA ₹{config.fixed_ta_amount} ({config.ta_type}), DA ₹{config.da_amount}
          </p>
          {teamOverrides.length > 0 ? (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] px-2">Manager</TableHead>
                    <TableHead className="text-[11px] px-2">TA Type</TableHead>
                    <TableHead className="text-[11px] px-2">TA (₹)</TableHead>
                    <TableHead className="text-[11px] px-2">DA (₹)</TableHead>
                    <TableHead className="text-[11px] px-1 w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamOverrides.map(t => (
                    <OverrideRow
                      key={t.id}
                      override={{ ...t, name: t.manager_name }}
                      onUpdate={(field, value) => updateTeamOverride(t.id, field, value)}
                      onDelete={() => deleteTeamOverride(t.id)}
                      globalConfig={config}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">No manager-level overrides configured</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <ProfileSelector
              excludeIds={teamOverrides.map(t => t.manager_id)}
              onSelect={addTeamOverride}
              label="+ Add Manager"
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── User-Level Config ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-600" />
            User-Level Overrides
            <Badge variant="secondary" className="text-[10px] ml-auto">Highest Priority</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] text-muted-foreground mb-3">
            Set specific TA/DA for individual users. These override both global and manager-level settings.
          </p>
          {userOverrides.length > 0 ? (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] px-2">User</TableHead>
                    <TableHead className="text-[11px] px-2">TA Type</TableHead>
                    <TableHead className="text-[11px] px-2">TA (₹)</TableHead>
                    <TableHead className="text-[11px] px-2">DA (₹)</TableHead>
                    <TableHead className="text-[11px] px-1 w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userOverrides.map(u => (
                    <OverrideRow
                      key={u.id}
                      override={{ ...u, name: u.user_name }}
                      onUpdate={(field, value) => updateUserOverride(u.id, field, value)}
                      onDelete={() => deleteUserOverride(u.id)}
                      globalConfig={config}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">No user-level overrides configured</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <ProfileSelector
              excludeIds={userOverrides.map(u => u.user_id)}
              onSelect={addUserOverride}
              label="+ Add User"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Overrides Button */}
      {(userOverrides.length > 0 || teamOverrides.length > 0) && (
        <div className="flex justify-end">
          <Button onClick={saveAllOverrides} disabled={savingOverrides} variant="outline">
            {savingOverrides ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Overrides
          </Button>
        </div>
      )}

      {/* Additional Expenses Policy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-purple-600" />
            Additional Expenses Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Max per Day (₹)</Label>
              <Input
                type="number"
                min="0"
                value={config.max_additional_expense_per_day}
                onChange={(e) =>
                  setConfig(prev => prev ? { ...prev, max_additional_expense_per_day: Number(e.target.value) } : null)
                }
              />
              <p className="text-[11px] text-muted-foreground">0 = no limit</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max per Month (₹)</Label>
              <Input
                type="number"
                min="0"
                value={config.max_additional_expense_per_month}
                onChange={(e) =>
                  setConfig(prev => prev ? { ...prev, max_additional_expense_per_month: Number(e.target.value) } : null)
                }
              />
              <p className="text-[11px] text-muted-foreground">0 = no limit</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bill Required Above (₹)</Label>
              <Input
                type="number"
                min="0"
                value={config.require_bill_above_amount}
                onChange={(e) =>
                  setConfig(prev => prev ? { ...prev, require_bill_above_amount: Number(e.target.value) } : null)
                }
              />
              <p className="text-[11px] text-muted-foreground">Mandatory bill attachment above this amount</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Categories */}
      <ExpenseCategoriesConfig />

      {/* Approval Workflows */}
      <ApprovalWorkflowsConfig />

      {/* Approval Rules */}
      <ApprovalRulesConfig />

      {/* Policy Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            Policy Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.expense_policy_notes}
            onChange={(e) =>
              setConfig(prev => prev ? { ...prev, expense_policy_notes: e.target.value } : null)
            }
            placeholder="Add any additional policy notes or guidelines for expense claims..."
            rows={3}
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Expense Policy
        </Button>
      </div>
    </div>
  );
};

export default ExpensePolicyConfig;
