import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Save, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TargetConfig {
  id?: string;
  fy_year: number;
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
}

interface TargetConfigTabProps {
  fyYear: number;
}

const QUANTITY_UNITS = ['Kg', 'Units', 'Liters', 'Pcs', 'Boxes', 'Tonnes', 'Cartons'];

const DEFAULT_CONFIG: Omit<TargetConfig, 'fy_year'> = {
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
};

export function TargetConfigTab({ fyYear }: TargetConfigTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [config, setConfig] = React.useState<TargetConfig>({
    fy_year: fyYear,
    ...DEFAULT_CONFIG,
  });

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

  // Update local state when data loads
  React.useEffect(() => {
    if (existingConfig) {
      setConfig({
        id: existingConfig.id,
        fy_year: existingConfig.fy_year,
        enable_quantity: existingConfig.enable_quantity ?? true,
        enable_revenue: existingConfig.enable_revenue ?? true,
        enable_visits: existingConfig.enable_visits ?? false,
        quantity_unit: existingConfig.quantity_unit ?? 'Kg',
        enabled_parameters: (existingConfig.enabled_parameters as TargetConfig['enabled_parameters']) ?? DEFAULT_CONFIG.enabled_parameters,
      });
    } else {
      setConfig({
        fy_year: fyYear,
        ...DEFAULT_CONFIG,
      });
    }
  }, [existingConfig, fyYear]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (configData: TargetConfig) => {
      if (configData.id) {
        const { error } = await supabase
          .from('fy_target_config')
          .update({
            enable_quantity: configData.enable_quantity,
            enable_revenue: configData.enable_revenue,
            enable_visits: configData.enable_visits,
            quantity_unit: configData.quantity_unit,
            enabled_parameters: configData.enabled_parameters,
          })
          .eq('id', configData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fy_target_config')
          .insert({
            fy_year: configData.fy_year,
            enable_quantity: configData.enable_quantity,
            enable_revenue: configData.enable_revenue,
            enable_visits: configData.enable_visits,
            quantity_unit: configData.quantity_unit,
            enabled_parameters: configData.enabled_parameters,
            created_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fy-target-config'] });
      toast.success('Configuration saved successfully');
    },
    onError: (error: any) => {
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

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Target Configuration for FY {fyYear - 1}-{String(fyYear).slice(-2)}
          </CardTitle>
          <CardDescription>
            Define what metrics and parameters to track for targets this financial year
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Basis */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Target Basis</Label>
            <p className="text-sm text-muted-foreground">Select which metrics to track for targets</p>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable_quantity"
                  checked={config.enable_quantity}
                  onCheckedChange={(checked) => handleBasisChange('enable_quantity', !!checked)}
                />
                <Label htmlFor="enable_quantity" className="font-normal cursor-pointer">
                  Quantity
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable_revenue"
                  checked={config.enable_revenue}
                  onCheckedChange={(checked) => handleBasisChange('enable_revenue', !!checked)}
                />
                <Label htmlFor="enable_revenue" className="font-normal cursor-pointer">
                  Revenue (₹)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable_visits"
                  checked={config.enable_visits}
                  onCheckedChange={(checked) => handleBasisChange('enable_visits', !!checked)}
                />
                <Label htmlFor="enable_visits" className="font-normal cursor-pointer">
                  Productive Visits
                </Label>
              </div>
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Target Parameters</Label>
            <p className="text-sm text-muted-foreground">Select which breakdowns are available for targets</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries({
                product: 'Product-wise',
                retailer: 'Retailer-wise',
                beat: 'Beat-wise',
                distributor: 'Distributor-wise',
                territory: 'Territory-wise',
                monthly: 'Month-wise',
              }).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`param_${key}`}
                    checked={config.enabled_parameters[key as keyof typeof config.enabled_parameters]}
                    onCheckedChange={(checked) => handleParameterChange(key as keyof typeof config.enabled_parameters, !!checked)}
                  />
                  <Label htmlFor={`param_${key}`} className="font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Quantity Unit */}
          {config.enable_quantity && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Quantity Unit</Label>
              <p className="text-sm text-muted-foreground">Default unit for quantity targets</p>
              <Select value={config.quantity_unit} onValueChange={(v) => setConfig(prev => ({ ...prev, quantity_unit: v }))}>
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
          )}

          {/* Save Button */}
          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}