import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Lock, Unlock, Target, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PeriodTypeSelector, type PeriodType } from './target-config/PeriodTypeSelector';
import { PeriodBreakdownGrid, generateInitialPeriods, type PeriodTarget } from './target-config/PeriodBreakdownGrid';
import { useTargetPeriods } from '@/hooks/useTargetPeriods';

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Create Target for FY {fyYear - 1}-{String(fyYear).slice(-2)}
        </CardTitle>
        <CardDescription>
          Define target metrics, parameters, and company-wide goals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Target Plan Name */}
        <div className="space-y-2">
          <Label htmlFor="plan_name" className="text-base font-semibold">Target Plan Name</Label>
          <Input
            id="plan_name"
            value={config.target_plan_name}
            onChange={(e) => setConfig(prev => ({ ...prev, target_plan_name: e.target.value }))}
            placeholder="e.g., FY 25 Sales Plan"
            className="max-w-md"
          />
        </div>

        <Separator />

        {/* Target Metrics */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Target Metrics</Label>
          <p className="text-sm text-muted-foreground">Select which metrics to track for targets</p>
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'enable_quantity', label: 'Quantity', checked: config.enable_quantity },
              { key: 'enable_revenue', label: 'Revenue (₹)', checked: config.enable_revenue },
              { key: 'enable_visits', label: 'Productive Visits', checked: config.enable_visits },
            ].map(({ key, label, checked }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleBasisChange(key as 'enable_quantity' | 'enable_revenue' | 'enable_visits', !checked)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all cursor-pointer
                  ${checked 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-white dark:bg-background border-border text-muted-foreground hover:border-emerald-300 hover:bg-emerald-50/50'
                  }
                `}
              >
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                  ${checked ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground bg-white dark:bg-background'}
                `}>
                  {checked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Target Parameters */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Target Parameters</Label>
          <p className="text-sm text-muted-foreground">Select which breakdowns are available for targets</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries({
              product: 'Product-wise',
              retailer: 'Retailer-wise',
              beat: 'Beat-wise',
              distributor: 'Distributor-wise',
              territory: 'Territory-wise',
              monthly: 'Month-wise',
            }).map(([key, label]) => {
              const isChecked = config.enabled_parameters[key as keyof typeof config.enabled_parameters];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleParameterChange(key as keyof typeof config.enabled_parameters, !isChecked)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all cursor-pointer
                    ${isChecked 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-400' 
                      : 'bg-white dark:bg-background border-border text-muted-foreground hover:border-emerald-300 hover:bg-emerald-50/50'
                    }
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                    ${isChecked ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground bg-white dark:bg-background'}
                  `}>
                    {isChecked && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium text-sm">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity Unit */}
        {config.enable_quantity && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-base font-semibold">Quantity Unit</Label>
              <Select 
                value={config.quantity_unit} 
                onValueChange={(v) => setConfig(prev => ({ ...prev, quantity_unit: v }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUANTITY_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Separator />

        {/* Period Type Selector */}
        <PeriodTypeSelector
          value={config.target_period_type}
          onChange={handlePeriodTypeChange}
        />

        <Separator />

        {/* FY Totals - show inputs only for annual, otherwise read-only */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">FY Total Targets</Label>
              <p className="text-sm text-muted-foreground">
                {config.target_period_type === 'annual' 
                  ? 'Define company-wide targets for the financial year'
                  : 'Auto-calculated from period targets below'
                }
              </p>
            </div>
            {config.target_period_type !== 'annual' && config.total_quantity_target + config.total_revenue_target + config.total_visits_target > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleEqualDistribution}
              >
                Distribute Equally
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {config.enable_quantity && (
              <div className="space-y-2">
                <Label>Quantity ({config.quantity_unit})</Label>
                {config.target_period_type === 'annual' ? (
                  <Input
                    type="text"
                    value={config.total_quantity_target > 0 ? formatNumber(config.total_quantity_target) : ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, total_quantity_target: parseNumber(e.target.value) }))}
                    placeholder={`e.g., 1,00,000 ${config.quantity_unit}`}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded-md font-medium text-primary">
                    {formatNumber(config.total_quantity_target) || '0'} {config.quantity_unit}
                  </div>
                )}
              </div>
            )}
            {config.enable_revenue && (
              <div className="space-y-2">
                <Label>Revenue (₹)</Label>
                {config.target_period_type === 'annual' ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      type="text"
                      className="pl-7"
                      value={config.total_revenue_target > 0 ? formatNumber(config.total_revenue_target) : ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, total_revenue_target: parseNumber(e.target.value) }))}
                      placeholder="e.g., 55,00,00,000"
                    />
                  </div>
                ) : (
                  <div className="p-2 bg-muted rounded-md font-medium text-primary">
                    ₹{formatNumber(config.total_revenue_target) || '0'}
                  </div>
                )}
              </div>
            )}
            {config.enable_visits && (
              <div className="space-y-2">
                <Label>Productive Visits</Label>
                {config.target_period_type === 'annual' ? (
                  <Input
                    type="text"
                    value={config.total_visits_target > 0 ? formatNumber(config.total_visits_target) : ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, total_visits_target: Math.round(parseNumber(e.target.value)) }))}
                    placeholder="e.g., 12,000"
                  />
                ) : (
                  <div className="p-2 bg-muted rounded-md font-medium text-primary">
                    {formatNumber(config.total_visits_target) || '0'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Period Breakdown Grid (only shown for non-annual) */}
        {config.target_period_type !== 'annual' && (
          <>
            <Separator />
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                {config.target_period_type === 'biannual' && 'Bi-Annual Targets (H1 & H2)'}
                {config.target_period_type === 'quarterly' && 'Quarterly Targets (Q1-Q4)'}
                {config.target_period_type === 'monthly' && 'Monthly Targets (Apr-Mar)'}
              </Label>
              <PeriodBreakdownGrid
                periodType={config.target_period_type}
                periods={periodTargets}
                onPeriodChange={handlePeriodChange}
                enableQuantity={config.enable_quantity}
                enableRevenue={config.enable_revenue}
                enableVisits={config.enable_visits}
                quantityUnit={config.quantity_unit}
              />
            </div>
          </>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Draft
          </Button>
          
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Satisfied with the configuration?
            </p>
            <Button 
              onClick={handleLockAndAssign} 
              disabled={!canLock || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Lock and Assign to Hierarchy
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
