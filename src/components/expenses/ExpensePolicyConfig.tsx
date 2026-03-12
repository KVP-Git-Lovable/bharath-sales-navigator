import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, Loader2, Car, Utensils, Receipt, Shield, Plus, Trash2, Users, User, Info } from 'lucide-react';
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

interface OverrideEntry {
  id: string;
  ref_id: string; // user_id or manager_id
  type: 'user' | 'team';
  amount: number;
  name: string;
}

const DEFAULT_CATEGORIES = ['food', 'travel', 'accommodation', 'communication', 'other'];

// ─── Profile Selector (extracted outside to prevent remount on parent re-render) ──

const ProfileSelector = React.memo<{
  excludeIds: string[];
  onSelect: (userId: string, name: string) => void;
  label: string;
  managersOnly?: boolean;
}>(({ excludeIds, onSelect, label, managersOnly = false }) => {
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (managersOnly) {
        const { data: managerIds } = await supabase
          .from('employees')
          .select('manager_id')
          .not('manager_id', 'is', null);

        const uniqueManagerIds = [...new Set((managerIds || []).map((e: any) => e.manager_id))];

        if (uniqueManagerIds.length === 0) {
          setProfiles([]);
          return;
        }

        const { data: managerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', uniqueManagerIds)
          .order('full_name');

        setProfiles((managerProfiles || []).filter((p: any) => !excludeIds.includes(p.id)));
      } else {
        const { data } = await supabase.rpc('get_profiles_for_selector');
        setProfiles((data || []).filter((p: any) => !excludeIds.includes(p.id)));
      }
    };
    if (open) fetchProfiles();
  }, [open, excludeIds, managersOnly]);

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
});

ProfileSelector.displayName = 'ProfileSelector';

// ─── Override Table (extracted outside to prevent remount on parent re-render) ──

const OverrideTable = React.memo<{
  field: 'ta' | 'da';
  overrides: OverrideEntry[];
  defaultAmount: number;
  onUpdateAmount: (field: 'ta' | 'da', id: string, amount: number) => void;
  onDelete: (field: 'ta' | 'da', entry: OverrideEntry) => void;
  onAdd: (field: 'ta' | 'da', type: 'user' | 'team', refId: string, name: string) => void;
}>(({ field, overrides, defaultAmount, onUpdateAmount, onDelete, onAdd }) => {
  const excludeIds = overrides.map(o => o.ref_id);

  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Default: <span className="font-semibold text-foreground">₹{defaultAmount}</span> for users not listed below
        </p>
      </div>

      {overrides.length > 0 && (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] px-2">User / Team</TableHead>
                <TableHead className="text-[11px] px-2">Type</TableHead>
                <TableHead className="text-[11px] px-2">{field === 'ta' ? 'TA' : 'DA'} Amount (₹)</TableHead>
                <TableHead className="text-[11px] px-1 w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overrides.map(o => (
                <TableRow key={`${o.id}-${field}`}>
                  <TableCell className="text-xs font-medium py-2 px-2">{o.name}</TableCell>
                  <TableCell className="py-2 px-2">
                    <Badge variant={o.type === 'user' ? 'default' : 'secondary'} className="text-[10px]">
                      {o.type === 'user' ? <><User className="h-3 w-3 mr-1" />User</> : <><Users className="h-3 w-3 mr-1" />Team</>}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <Input
                      type="number"
                      min="0"
                      className="h-8 text-xs w-[100px]"
                      value={o.amount}
                      onChange={(e) => onUpdateAmount(field, o.id, Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell className="py-2 px-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(field, o)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <ProfileSelector
          excludeIds={excludeIds}
          onSelect={(id, name) => onAdd(field, 'user', id, name)}
          label="+ Add User"
        />
        <ProfileSelector
          excludeIds={excludeIds}
          onSelect={(id, name) => onAdd(field, 'team', id, name)}
          label="+ Add Team (Manager)"
          managersOnly
        />
      </div>

      {overrides.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No custom {field === 'ta' ? 'TA' : 'DA'} overrides yet. Add users or teams above.
        </p>
      )}
    </div>
  );
});

OverrideTable.displayName = 'OverrideTable';

const ExpensePolicyConfig = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<ExpenseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Distribution modes
  const [taDistribution, setTaDistribution] = useState<'same_for_all' | 'custom'>('same_for_all');
  const [daDistribution, setDaDistribution] = useState<'same_for_all' | 'custom'>('same_for_all');

  // Unified override lists (TA and DA separately)
  const [taOverrides, setTaOverrides] = useState<OverrideEntry[]>([]);
  const [daOverrides, setDaOverrides] = useState<OverrideEntry[]>([]);

  useEffect(() => {
    fetchConfig();
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

  const fetchOverrides = async () => {
    try {
      const { data: userData } = await (supabase as any).from('user_expense_config').select('*');
      const { data: teamData } = await (supabase as any).from('team_expense_config').select('*');

      const allIds = [
        ...(userData || []).map((u: any) => u.user_id),
        ...(teamData || []).map((t: any) => t.manager_id),
      ];
      let nameMap = new Map<string, string>();
      if (allIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', allIds);
        profiles?.forEach((p: any) => nameMap.set(p.id, p.full_name || 'Unknown'));
      }

      // Build TA overrides
      const taList: OverrideEntry[] = [];
      const daList: OverrideEntry[] = [];

      (userData || []).forEach((u: any) => {
        const name = nameMap.get(u.user_id) || 'Unknown';
        if (u.fixed_ta_amount > 0 || u.ta_type) {
          taList.push({ id: u.id, ref_id: u.user_id, type: 'user', amount: u.fixed_ta_amount || 0, name });
        }
        if (u.da_amount > 0) {
          daList.push({ id: u.id, ref_id: u.user_id, type: 'user', amount: u.da_amount || 0, name });
        }
      });

      (teamData || []).forEach((t: any) => {
        const name = nameMap.get(t.manager_id) || 'Unknown';
        if (t.fixed_ta_amount > 0 || t.ta_type) {
          taList.push({ id: t.id, ref_id: t.manager_id, type: 'team', amount: t.fixed_ta_amount || 0, name });
        }
        if (t.da_amount > 0) {
          daList.push({ id: t.id, ref_id: t.manager_id, type: 'team', amount: t.da_amount || 0, name });
        }
      });

      setTaOverrides(taList);
      setDaOverrides(daList);

      // Set distribution mode based on existing data
      if (taList.length > 0) setTaDistribution('custom');
      if (daList.length > 0) setDaDistribution('custom');
    } catch (error) {
      console.error('Error fetching overrides:', error);
    }
  };

  // ─── Override CRUD helpers ──────────────────────────────────────────────────

  const addOverride = async (
    field: 'ta' | 'da',
    type: 'user' | 'team',
    refId: string,
    name: string
  ) => {
    try {
      const defaultAmount = field === 'ta' ? (config?.fixed_ta_amount || 0) : (config?.da_amount || 0);
      const table = type === 'user' ? 'user_expense_config' : 'team_expense_config';
      const refField = type === 'user' ? 'user_id' : 'manager_id';

      // Check if record already exists
      const { data: existing } = await (supabase as any).from(table).select('*').eq(refField, refId).maybeSingle();

      if (existing) {
        // Update the specific field
        const updateData = field === 'ta'
          ? { fixed_ta_amount: defaultAmount, ta_type: config?.ta_type || 'fixed', updated_at: new Date().toISOString() }
          : { da_amount: defaultAmount, updated_at: new Date().toISOString() };
        await (supabase as any).from(table).update(updateData).eq('id', existing.id);

        const entry: OverrideEntry = { id: existing.id, ref_id: refId, type, amount: defaultAmount, name };
        if (field === 'ta') setTaOverrides(prev => [...prev, entry]);
        else setDaOverrides(prev => [...prev, entry]);
      } else {
        // Insert new record
        const insertData = type === 'user'
          ? {
              user_id: refId,
              ta_type: field === 'ta' ? (config?.ta_type || 'fixed') : 'from_beat',
              fixed_ta_amount: field === 'ta' ? defaultAmount : 0,
              da_amount: field === 'da' ? defaultAmount : 0,
            }
          : {
              manager_id: refId,
              ta_type: field === 'ta' ? (config?.ta_type || 'fixed') : 'from_beat',
              fixed_ta_amount: field === 'ta' ? defaultAmount : 0,
              da_amount: field === 'da' ? defaultAmount : 0,
            };

        const { data, error } = await (supabase as any).from(table).insert(insertData).select().single();
        if (error) throw error;

        const entry: OverrideEntry = { id: data.id, ref_id: refId, type, amount: defaultAmount, name };
        if (field === 'ta') setTaOverrides(prev => [...prev, entry]);
        else setDaOverrides(prev => [...prev, entry]);
      }

      toast({ title: "Added", description: `${type === 'team' ? 'Team' : 'User'} override added for ${name}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add", variant: "destructive" });
    }
  };

  const updateOverrideAmount = (field: 'ta' | 'da', id: string, amount: number) => {
    if (field === 'ta') {
      setTaOverrides(prev => prev.map(o => o.id === id ? { ...o, amount } : o));
    } else {
      setDaOverrides(prev => prev.map(o => o.id === id ? { ...o, amount } : o));
    }
  };

  const deleteOverride = async (field: 'ta' | 'da', entry: OverrideEntry) => {
    try {
      const table = entry.type === 'user' ? 'user_expense_config' : 'team_expense_config';
      // Check if the other field also has an override for this same record
      const otherList = field === 'ta' ? daOverrides : taOverrides;
      const hasOther = otherList.some(o => o.id === entry.id);

      if (hasOther) {
        // Just zero out this field, don't delete the row
        const updateData = field === 'ta'
          ? { fixed_ta_amount: 0, ta_type: null, updated_at: new Date().toISOString() }
          : { da_amount: 0, updated_at: new Date().toISOString() };
        await (supabase as any).from(table).update(updateData).eq('id', entry.id);
      } else {
        // No other field uses this row, delete it entirely
        await (supabase as any).from(table).delete().eq('id', entry.id);
      }

      if (field === 'ta') setTaOverrides(prev => prev.filter(o => o.id !== entry.id));
      else setDaOverrides(prev => prev.filter(o => o.id !== entry.id));

      toast({ title: "Removed", description: "Override removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove", variant: "destructive" });
    }
  };

  // ─── Save All ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);

      // Save global config
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

      // Save TA overrides
      for (const o of taOverrides) {
        const table = o.type === 'user' ? 'user_expense_config' : 'team_expense_config';
        await (supabase as any).from(table)
          .update({ fixed_ta_amount: o.amount, ta_type: 'fixed', updated_at: new Date().toISOString() })
          .eq('id', o.id);
      }

      // Save DA overrides
      for (const o of daOverrides) {
        const table = o.type === 'user' ? 'user_expense_config' : 'team_expense_config';
        await (supabase as any).from(table)
          .update({ da_amount: o.amount, updated_at: new Date().toISOString() })
          .eq('id', o.id);
      }

      // If switching to same_for_all, clean up overrides
      if (taDistribution === 'same_for_all' && taOverrides.length > 0) {
        for (const o of taOverrides) {
          const table = o.type === 'user' ? 'user_expense_config' : 'team_expense_config';
          const hasDA = daOverrides.some(d => d.id === o.id);
          if (hasDA) {
            await (supabase as any).from(table).update({ fixed_ta_amount: 0, ta_type: null }).eq('id', o.id);
          } else {
            await (supabase as any).from(table).delete().eq('id', o.id);
          }
        }
        setTaOverrides([]);
      }

      if (daDistribution === 'same_for_all' && daOverrides.length > 0) {
        for (const o of daOverrides) {
          const table = o.type === 'user' ? 'user_expense_config' : 'team_expense_config';
          const hasTA = taOverrides.some(t => t.id === o.id);
          if (hasTA) {
            await (supabase as any).from(table).update({ da_amount: 0 }).eq('id', o.id);
          } else {
            await (supabase as any).from(table).delete().eq('id', o.id);
          }
        }
        setDaOverrides([]);
      }

      toast({ title: "Success", description: "Expense policy saved successfully" });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({ title: "Error", description: "Failed to save policy", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Stable callbacks for OverrideTable ─────────────────────────────────────

  const handleUpdateOverrideAmount = useCallback((field: 'ta' | 'da', id: string, amount: number) => {
    updateOverrideAmount(field, id, amount);
  }, []);

  const handleDeleteOverride = useCallback((field: 'ta' | 'da', entry: OverrideEntry) => {
    deleteOverride(field, entry);
  }, [daOverrides, taOverrides]);

  const handleAddOverride = useCallback((field: 'ta' | 'da', type: 'user' | 'team', refId: string, name: string) => {
    addOverride(field, type, refId, name);
  }, [config]);

  // ─── Render ─────────────────────────────────────────────────────────────────

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
      {/* ─── TA Policy Card ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            Travel Allowance (TA) Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TA Calculation Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">TA Calculation Method</Label>
            <Select
              value={config.ta_type}
              onValueChange={(value: 'fixed' | 'from_beat') =>
                setConfig(prev => prev ? { ...prev, ta_type: value } : null)
              }
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed TA per Day</SelectItem>
                <SelectItem value="from_beat">TA from Beat Distance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* From Beat — info message */}
          {config.ta_type === 'from_beat' && (
            <div className="rounded-md bg-muted/50 border p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  TA will be auto-calculated from each beat's travel allowance value. Configure beat-level TA in the Beat Management section.
                </p>
                <div className="mt-2 space-y-1.5">
                  <Label className="text-xs">Per KM Rate (₹) — optional</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    className="max-w-[180px]"
                    value={config.ta_per_km_rate}
                    onChange={(e) =>
                      setConfig(prev => prev ? { ...prev, ta_per_km_rate: Number(e.target.value) } : null)
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">Set 0 to use beat-level fixed TA</p>
                </div>
              </div>
            </div>
          )}

          {/* Fixed TA — distribution options */}
          {config.ta_type === 'fixed' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Distribution</Label>
                <RadioGroup
                  value={taDistribution}
                  onValueChange={(v) => setTaDistribution(v as 'same_for_all' | 'custom')}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="same_for_all" id="ta-same" />
                    <Label htmlFor="ta-same" className="text-xs cursor-pointer">Same for all</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="custom" id="ta-custom" />
                    <Label htmlFor="ta-custom" className="text-xs cursor-pointer">Custom per user/team</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  {taDistribution === 'custom' ? 'Default TA Amount (₹)' : 'Fixed TA Amount (₹)'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  className="max-w-[180px]"
                  value={config.fixed_ta_amount}
                  onChange={(e) =>
                    setConfig(prev => prev ? { ...prev, fixed_ta_amount: Number(e.target.value) } : null)
                  }
                />
                {taDistribution === 'same_for_all' && (
                  <p className="text-[11px] text-muted-foreground">Every user gets ₹{config.fixed_ta_amount} per working day</p>
                )}
              </div>

              {taDistribution === 'custom' && (
                <OverrideTable field="ta" overrides={taOverrides} defaultAmount={config.fixed_ta_amount} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── DA Policy Card ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Utensils className="h-4 w-4 text-primary" />
            Daily Allowance (DA) Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Distribution */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Distribution</Label>
            <RadioGroup
              value={daDistribution}
              onValueChange={(v) => setDaDistribution(v as 'same_for_all' | 'custom')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="same_for_all" id="da-same" />
                <Label htmlFor="da-same" className="text-xs cursor-pointer">Same for all</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom" id="da-custom" />
                <Label htmlFor="da-custom" className="text-xs cursor-pointer">Custom per user/team</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {daDistribution === 'custom' ? 'Default DA Amount (₹)' : 'DA Amount (₹)'}
              </Label>
              <Input
                type="number"
                min="0"
                value={config.da_amount}
                onChange={(e) =>
                  setConfig(prev => prev ? { ...prev, da_amount: Number(e.target.value) } : null)
                }
              />
              {daDistribution === 'same_for_all' && (
                <p className="text-[11px] text-muted-foreground">Daily allowance on attendance-marked days</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Calculation Basis</Label>
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

          {daDistribution === 'custom' && (
            <OverrideTable field="da" overrides={daOverrides} defaultAmount={config.da_amount} />
          )}
        </CardContent>
      </Card>

      {/* Additional Expenses Policy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
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
            <Shield className="h-4 w-4 text-primary" />
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
