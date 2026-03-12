import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, Car, Utensils, Receipt, Shield } from 'lucide-react';
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

const DEFAULT_CATEGORIES = ['food', 'travel', 'accommodation', 'communication', 'other'];

const ExpensePolicyConfig = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<ExpenseConfig | null>(null);
  const [approvalMode, setApprovalMode] = useState<'auto' | 'manager' | 'multi_level'>('manager');
  const [maxLevels, setMaxLevels] = useState(1);
  const [approvalConfigId, setApprovalConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchApprovalConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_master_config')
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        // No config exists — create a default one
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

      // Save approval config
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
