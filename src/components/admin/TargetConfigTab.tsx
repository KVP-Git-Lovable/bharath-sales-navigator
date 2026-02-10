import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Lock, Unlock, Target, Settings, Package, IndianRupee, Footprints } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { type PeriodType } from './target-config/PeriodTypeSelector';
import { generateInitialPeriods, type PeriodTarget } from './target-config/PeriodBreakdownGrid';
import { useTargetPeriods } from '@/hooks/useTargetPeriods';
import { generateInitialMonthlyTargets } from './target-config/AnnualMonthlyBreakdown';

interface TargetConfig {
  id?: string;
  fy_year: number;
  target_plan_name: string;
  enable_quantity: boolean;
  enable_revenue: boolean;
  enable_visits: boolean;
  quantity_unit: string;
  enabled_parameters: {
    product: boolean;
    retailer: boolean;
    beat: boolean;
    distributor: boolean;
    territory: boolean;
    monthly: boolean;
  };
  total_quantity_target: number;
  total_revenue_target: number;
  total_visits_target: number;
  is_locked: boolean;
  setup_completed: boolean;
  target_period_type: PeriodType;
}

interface TargetConfigTabProps {
  fyYear: number;
  onLockedAndAssign?: () => void;
}

const QUANTITY_UNITS = ['Kg', 'Units', 'Liters', 'Pcs', 'Boxes', 'Tonnes', 'Cartons'];
const CURRENCY_OPTIONS = ['₹ (INR)', '$ (USD)', '€ (EUR)', '£ (GBP)'];

const DEFAULT_CONFIG: Omit<TargetConfig, 'fy_year'> = {
  target_plan_name: 'FY Sales Plan',
  enable_quantity: true,
  enable_revenue: true,
  enable_visits: false,
  quantity_unit: 'Kg',
  enabled_parameters: {
    product: true,
    retailer: true,
    beat: true,
    distributor: true,
    territory: true,
    monthly: true,
  },
  total_quantity_target: 0,
  total_revenue_target: 0,
  total_visits_target: 0,
  is_locked: false,
  setup_completed: false,
  target_period_type: 'annual',
};

export function TargetConfigTab({ fyYear, onLockedAndAssign }: TargetConfigTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<TargetConfig>({
    fy_year: fyYear,
    ...DEFAULT_CONFIG,
  });
  const [periodTargets, setPeriodTargets] = useState<PeriodTarget[]>([]);
   const [annualMonthlyTargets, setAnnualMonthlyTargets] = useState(generateInitialMonthlyTargets());
   const [showAnnualMonthlyBreakdown, setShowAnnualMonthlyBreakdown] = useState(false);

  // Fetch existing config
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['fy-target-config', fyYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fy_target_config')
        .select('*')
        .eq('fy_year', fyYear)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Use the target periods hook
  const { periods: savedPeriods, savePeriods, isSaving, calculateRollups, applyEqualDistribution } = useTargetPeriods({
    fyConfigId: config.id,
  });

  // Update local state when data loads
  useEffect(() => {
    if (existingConfig) {
      const enabledParams = (existingConfig.enabled_parameters as TargetConfig['enabled_parameters']) ?? DEFAULT_CONFIG.enabled_parameters;
      const periodType = (existingConfig.target_period_type as PeriodType) ?? 'annual';
      setConfig({
        id: existingConfig.id,
        fy_year: existingConfig.fy_year,
        target_plan_name: existingConfig.target_plan_name ?? 'FY Sales Plan',
        enable_quantity: existingConfig.enable_quantity ?? true,
        enable_revenue: existingConfig.enable_revenue ?? true,
        enable_visits: existingConfig.enable_visits ?? false,
        quantity_unit: existingConfig.quantity_unit ?? 'Kg',
        enabled_parameters: enabledParams,
        total_quantity_target: existingConfig.total_quantity_target ?? 0,
        total_revenue_target: existingConfig.total_revenue_target ?? 0,
        total_visits_target: existingConfig.total_visits_target ?? 0,
        is_locked: existingConfig.is_locked ?? false,
        setup_completed: existingConfig.setup_completed ?? false,
        target_period_type: periodType,
      });
    } else {
      setConfig({
        fy_year: fyYear,
        ...DEFAULT_CONFIG,
      });
    }
  }, [existingConfig, fyYear]);

  // Load saved periods when they're fetched
  useEffect(() => {
    if (savedPeriods.length > 0) {
      setPeriodTargets(savedPeriods);
    } else if (config.target_period_type !== 'annual') {
      setPeriodTargets(generateInitialPeriods(config.target_period_type));
    }
  }, [savedPeriods, config.target_period_type]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (configData: TargetConfig) => {
      if (configData.id) {
        const { error } = await supabase
          .from('fy_target_config')
          .update({
            target_plan_name: configData.target_plan_name,
            enable_quantity: configData.enable_quantity,
            enable_revenue: configData.enable_revenue,
            enable_visits: configData.enable_visits,
            quantity_unit: configData.quantity_unit,
            enabled_parameters: configData.enabled_parameters,
            total_quantity_target: configData.total_quantity_target,
            total_revenue_target: configData.total_revenue_target,
            total_visits_target: configData.total_visits_target,
            is_locked: configData.is_locked,
            setup_completed: configData.setup_completed,
            target_period_type: configData.target_period_type,
          })
          .eq('id', configData.id);
        if (error) throw error;
        
        // Save period targets if not annual
        if (configData.target_period_type !== 'annual' && periodTargets.length > 0) {
          await savePeriods({
            configId: configData.id,
            periodType: configData.target_period_type,
            periods: periodTargets,
          });
        }
      } else {
        const { data, error } = await supabase
          .from('fy_target_config')
          .insert({
            fy_year: configData.fy_year,
            target_plan_name: configData.target_plan_name,
            enable_quantity: configData.enable_quantity,
            enable_revenue: configData.enable_revenue,
            enable_visits: configData.enable_visits,
            quantity_unit: configData.quantity_unit,
            enabled_parameters: configData.enabled_parameters,
            total_quantity_target: configData.total_quantity_target,
            total_revenue_target: configData.total_revenue_target,
            total_visits_target: configData.total_visits_target,
            is_locked: configData.is_locked,
            setup_completed: configData.setup_completed,
            target_period_type: configData.target_period_type,
            created_by: user?.id,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setConfig(prev => ({ ...prev, id: data.id }));
          
          // Save period targets if not annual
          if (configData.target_period_type !== 'annual' && periodTargets.length > 0) {
            await savePeriods({
              configId: data.id,
              periodType: configData.target_period_type,
              periods: periodTargets,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fy-target-config'] });
      queryClient.invalidateQueries({ queryKey: ['fy-period-targets'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to save configuration: ' + error.message);
    },
  });

  const handleBasisChange = (field: 'enable_quantity' | 'enable_revenue' | 'enable_visits', checked: boolean) => {
    setConfig(prev => ({ ...prev, [field]: checked }));
  };

  const handleParameterChange = (param: keyof TargetConfig['enabled_parameters'], checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      enabled_parameters: {
        ...prev.enabled_parameters,
        [param]: checked,
      },
    }));
  };

  const handlePeriodTypeChange = (periodType: PeriodType) => {
    setConfig(prev => ({ ...prev, target_period_type: periodType }));
    
    // Generate initial periods for the new type
    if (periodType !== 'annual') {
      const newPeriods = generateInitialPeriods(periodType);
      setPeriodTargets(newPeriods);
    } else {
      setPeriodTargets([]);
    }
  };

  const handlePeriodChange = (periodNumber: number, field: 'quantityTarget' | 'revenueTarget' | 'visitsTarget', value: number) => {
    setPeriodTargets(prev => 
      prev.map(p => 
        p.periodNumber === periodNumber 
          ? { ...p, [field]: value }
          : p
      )
    );
    
    // Update FY totals based on period totals when not in annual mode
    if (config.target_period_type !== 'annual') {
      const updatedPeriods = periodTargets.map(p =>
        p.periodNumber === periodNumber ? { ...p, [field]: value } : p
      );
      const totals = calculateRollups(updatedPeriods, config.target_period_type);
      setConfig(prev => ({
        ...prev,
        total_quantity_target: totals.quantity,
        total_revenue_target: totals.revenue,
        total_visits_target: totals.visits,
      }));
    }
  };

  const handleEqualDistribution = () => {
    const distributed = applyEqualDistribution(
      config.target_period_type,
      config.total_quantity_target,
      config.total_revenue_target,
      config.total_visits_target
    );
    setPeriodTargets(distributed);
    toast.success('Targets distributed equally across periods');
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const parseNumber = (value: string) => {
    const cleaned = value.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync(config);
    toast.success('Configuration saved');
  };

  const handleLockAndAssign = async () => {
    const lockedConfig = { ...config, is_locked: true, setup_completed: true };
    await saveMutation.mutateAsync(lockedConfig);
    toast.success('Configuration locked! Proceed to assign targets.');
    onLockedAndAssign?.();
  };

  const handleUnlock = async () => {
    const unlockedConfig = { ...config, is_locked: false };
    await saveMutation.mutateAsync(unlockedConfig);
    toast.success('Configuration unlocked for editing');
  };

  const hasAtLeastOneBasis = config.enable_quantity || config.enable_revenue || config.enable_visits;
  const hasAtLeastOneParameter = Object.values(config.enabled_parameters).some(v => v);
  const hasValidTargets = 
    (!config.enable_quantity || config.total_quantity_target > 0) &&
    (!config.enable_revenue || config.total_revenue_target > 0) &&
    (!config.enable_visits || config.total_visits_target > 0);
  const canLock = hasAtLeastOneBasis && hasAtLeastOneParameter && hasValidTargets;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Locked view - show read-only summary
  if (config.is_locked) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {config.target_plan_name}
              </CardTitle>
              <CardDescription>
                FY {fyYear - 1}-{String(fyYear).slice(-2)} Target Configuration
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
              <Button variant="outline" size="sm" onClick={handleUnlock} disabled={saveMutation.isPending}>
                <Unlock className="h-4 w-4 mr-1" />
                Unlock to Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {config.enable_quantity && (
              <div className="p-4 bg-primary/5 rounded-lg border">
                <p className="text-sm text-muted-foreground">Quantity Target</p>
                <p className="text-2xl font-bold">{formatNumber(config.total_quantity_target)} {config.quantity_unit}</p>
              </div>
            )}
            {config.enable_revenue && (
              <div className="p-4 bg-primary/5 rounded-lg border">
                <p className="text-sm text-muted-foreground">Revenue Target</p>
                <p className="text-2xl font-bold">₹{formatNumber(config.total_revenue_target)}</p>
              </div>
            )}
            {config.enable_visits && (
              <div className="p-4 bg-primary/5 rounded-lg border">
                <p className="text-sm text-muted-foreground">Visits Target</p>
                <p className="text-2xl font-bold">{formatNumber(config.total_visits_target)}</p>
              </div>
            )}
          </div>

          {/* Enabled Parameters */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Enabled Parameters</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries({
                product: 'Product-wise',
                retailer: 'Retailer-wise',
                beat: 'Beat-wise',
                distributor: 'Distributor-wise',
                territory: 'Territory-wise',
                monthly: 'Month-wise',
              }).filter(([key]) => config.enabled_parameters[key as keyof typeof config.enabled_parameters]).map(([key, label]) => (
                <Badge key={key} variant="secondary">{label}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edit view
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Settings className="h-5 w-5 text-primary" />
          Create Target for FY {fyYear - 1}-{String(fyYear).slice(-2)}
        </CardTitle>
        <CardDescription>
          Define target metrics, parameters, and company-wide goals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Step 1: Target Plan Name */}
        <div className="space-y-2">
          <Label htmlFor="plan_name" className="text-sm font-semibold text-foreground">Plan Name</Label>
          <Input
            id="plan_name"
            value={config.target_plan_name}
            onChange={(e) => setConfig(prev => ({ ...prev, target_plan_name: e.target.value }))}
            placeholder="e.g., FY 25-26 Sales Plan"
            className="max-w-md"
          />
        </div>

        <Separator />

        {/* Step 2: Target Metrics */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-foreground">Target Metrics</Label>
            <p className="text-xs text-muted-foreground mt-1">Select which metrics to track</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Quantity */}
            <div
              onClick={() => handleBasisChange('enable_quantity', !config.enable_quantity)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                config.enable_quantity
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  config.enable_quantity ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Quantity</p>
                  <p className="text-xs text-muted-foreground">Track volume targets</p>
                </div>
              </div>
              {config.enable_quantity && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* Revenue */}
            <div
              onClick={() => handleBasisChange('enable_revenue', !config.enable_revenue)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                config.enable_revenue
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  config.enable_revenue ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Revenue</p>
                  <p className="text-xs text-muted-foreground">Track revenue targets</p>
                </div>
              </div>
              {config.enable_revenue && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* Visits */}
            <div
              onClick={() => handleBasisChange('enable_visits', !config.enable_visits)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                config.enable_visits
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  config.enable_visits ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  <Footprints className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Productive Visits</p>
                  <p className="text-xs text-muted-foreground">Track visit targets</p>
                </div>
              </div>
              {config.enable_visits && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Inline unit selectors below metrics */}
          {(config.enable_quantity || config.enable_revenue) && (
            <div className="flex flex-wrap gap-4 pt-2">
              {config.enable_quantity && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quantity Unit</Label>
                  <Select 
                    value={config.quantity_unit} 
                    onValueChange={(v) => setConfig(prev => ({ ...prev, quantity_unit: v }))}
                  >
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITY_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {config.enable_revenue && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Currency</Label>
                  <Select value="₹ (INR)" onValueChange={() => {}}>
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Step 3: Target Parameters */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-foreground">Target Parameters</Label>
            <p className="text-xs text-muted-foreground mt-1">Select the breakdowns for target allocation</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries({
              product: { label: 'Product-wise', icon: '📦' },
              retailer: { label: 'Retailer-wise', icon: '🏪' },
              beat: { label: 'Beat-wise', icon: '📍' },
              distributor: { label: 'Distributor-wise', icon: '🚛' },
              territory: { label: 'Territory-wise', icon: '🗺️' },
              monthly: { label: 'Month-wise', icon: '📅' },
            }).map(([key, { label, icon }]) => {
              const isChecked = config.enabled_parameters[key as keyof typeof config.enabled_parameters];
              return (
                <div
                  key={key}
                  onClick={() => handleParameterChange(key as keyof typeof config.enabled_parameters, !isChecked)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    isChecked
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  <span className="font-medium text-sm text-foreground">{label}</span>
                  {isChecked && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Step 4: FY Total Targets - only show enabled metrics */}
        {hasAtLeastOneBasis && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-foreground">FY Total Targets</Label>
              <p className="text-xs text-muted-foreground mt-1">Define company-wide targets for the financial year</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {config.enable_quantity && (
                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <Label className="text-xs text-muted-foreground">Quantity ({config.quantity_unit})</Label>
                  <Input
                    type="text"
                    value={config.total_quantity_target > 0 ? formatNumber(config.total_quantity_target) : ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, total_quantity_target: parseNumber(e.target.value) }))}
                    placeholder={`e.g., 10,000 ${config.quantity_unit}`}
                    className="text-lg font-semibold"
                  />
                </div>
              )}
              {config.enable_revenue && (
                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <Label className="text-xs text-muted-foreground">Revenue (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                    <Input
                      type="text"
                      className="pl-7 text-lg font-semibold"
                      value={config.total_revenue_target > 0 ? formatNumber(config.total_revenue_target) : ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, total_revenue_target: parseNumber(e.target.value) }))}
                      placeholder="e.g., 55,00,000"
                    />
                  </div>
                </div>
              )}
              {config.enable_visits && (
                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <Label className="text-xs text-muted-foreground">Productive Visits</Label>
                  <Input
                    type="text"
                    value={config.total_visits_target > 0 ? formatNumber(config.total_visits_target) : ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, total_visits_target: Math.round(parseNumber(e.target.value)) }))}
                    placeholder="e.g., 12,000"
                    className="text-lg font-semibold"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Draft
          </Button>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleLockAndAssign} 
              disabled={!canLock || saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Lock & Assign to Hierarchy
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
