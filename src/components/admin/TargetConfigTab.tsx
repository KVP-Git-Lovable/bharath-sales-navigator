import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

import { WizardProgress } from './target-config/WizardProgress';
import { ConfigurationStep } from './target-config/ConfigurationStep';
import { SetTargetsStep } from './target-config/SetTargetsStep';
import { ApplyToUsersStep } from './target-config/ApplyToUsersStep';

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
  total_quantity_target: number;
  total_revenue_target: number;
  total_visits_target: number;
  setup_completed: boolean;
}

interface TargetConfigTabProps {
  fyYear: number;
}

const WIZARD_STEPS = [
  { id: 1, title: 'Configure', description: 'Set parameters' },
  { id: 2, title: 'Set Targets', description: 'Define FY targets' },
  { id: 3, title: 'Apply to Users', description: 'Allocate targets' },
];

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
  total_quantity_target: 0,
  total_revenue_target: 0,
  total_visits_target: 0,
  setup_completed: false,
};

export function TargetConfigTab({ fyYear }: TargetConfigTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<TargetConfig>({
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
  useEffect(() => {
    if (existingConfig) {
      const enabledParams = (existingConfig.enabled_parameters as TargetConfig['enabled_parameters']) ?? DEFAULT_CONFIG.enabled_parameters;
      setConfig({
        id: existingConfig.id,
        fy_year: existingConfig.fy_year,
        enable_quantity: existingConfig.enable_quantity ?? true,
        enable_revenue: existingConfig.enable_revenue ?? true,
        enable_visits: existingConfig.enable_visits ?? false,
        quantity_unit: existingConfig.quantity_unit ?? 'Kg',
        enabled_parameters: enabledParams,
        total_quantity_target: existingConfig.total_quantity_target ?? 0,
        total_revenue_target: existingConfig.total_revenue_target ?? 0,
        total_visits_target: existingConfig.total_visits_target ?? 0,
        setup_completed: existingConfig.setup_completed ?? false,
      });
      
      // If setup is already completed, start at step 3, otherwise check what's done
      if (existingConfig.setup_completed) {
        setCurrentStep(3);
      } else if (existingConfig.total_quantity_target > 0 || existingConfig.total_revenue_target > 0) {
        setCurrentStep(3);
      } else if (existingConfig.id) {
        setCurrentStep(2);
      }
    } else {
      setConfig({
        fy_year: fyYear,
        ...DEFAULT_CONFIG,
      });
      setCurrentStep(1);
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
            total_quantity_target: configData.total_quantity_target,
            total_revenue_target: configData.total_revenue_target,
            total_visits_target: configData.total_visits_target,
            setup_completed: configData.setup_completed,
          })
          .eq('id', configData.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('fy_target_config')
          .insert({
            fy_year: configData.fy_year,
            enable_quantity: configData.enable_quantity,
            enable_revenue: configData.enable_revenue,
            enable_visits: configData.enable_visits,
            quantity_unit: configData.quantity_unit,
            enabled_parameters: configData.enabled_parameters,
            total_quantity_target: configData.total_quantity_target,
            total_revenue_target: configData.total_revenue_target,
            total_visits_target: configData.total_visits_target,
            setup_completed: configData.setup_completed,
            created_by: user?.id,
          })
          .select()
          .single();
        if (error) throw error;
        // Update local config with the new ID
        if (data) {
          setConfig(prev => ({ ...prev, id: data.id }));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fy-target-config'] });
    },
    onError: (error: any) => {
      toast.error('Failed to save configuration: ' + error.message);
    },
  });

  const handleConfigChange = (newConfig: Omit<TargetConfig, 'fy_year' | 'total_quantity_target' | 'total_revenue_target' | 'total_visits_target' | 'setup_completed'>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const handleTargetsChange = (targets: { total_quantity_target: number; total_revenue_target: number; total_visits_target: number }) => {
    setConfig(prev => ({ ...prev, ...targets }));
  };

  const handleStep1Next = async () => {
    await saveMutation.mutateAsync(config);
    toast.success('Configuration saved');
    setCurrentStep(2);
  };

  const handleStep2Next = async () => {
    await saveMutation.mutateAsync(config);
    toast.success('Targets saved');
    setCurrentStep(3);
  };

  const handleStep3Complete = async () => {
    const completedConfig = { ...config, setup_completed: true };
    await saveMutation.mutateAsync(completedConfig);
    toast.success('Target setup completed!');
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
      {/* Wizard Progress */}
      <WizardProgress currentStep={currentStep} steps={WIZARD_STEPS} />

      {/* Step Content */}
      {currentStep === 1 && (
        <ConfigurationStep
          config={{
            enable_quantity: config.enable_quantity,
            enable_revenue: config.enable_revenue,
            enable_visits: config.enable_visits,
            quantity_unit: config.quantity_unit,
            enabled_parameters: config.enabled_parameters,
          }}
          fyYear={fyYear}
          onConfigChange={handleConfigChange}
          onNext={handleStep1Next}
          isSaving={saveMutation.isPending}
        />
      )}

      {currentStep === 2 && (
        <SetTargetsStep
          config={{
            enable_quantity: config.enable_quantity,
            enable_revenue: config.enable_revenue,
            enable_visits: config.enable_visits,
            quantity_unit: config.quantity_unit,
            enabled_parameters: config.enabled_parameters,
          }}
          targets={{
            total_quantity_target: config.total_quantity_target,
            total_revenue_target: config.total_revenue_target,
            total_visits_target: config.total_visits_target,
          }}
          fyYear={fyYear}
          onTargetsChange={handleTargetsChange}
          onBack={() => setCurrentStep(1)}
          onNext={handleStep2Next}
          isSaving={saveMutation.isPending}
        />
      )}

      {currentStep === 3 && (
        <ApplyToUsersStep
          config={{
            enable_quantity: config.enable_quantity,
            enable_revenue: config.enable_revenue,
            enable_visits: config.enable_visits,
            quantity_unit: config.quantity_unit,
            enabled_parameters: config.enabled_parameters,
          }}
          targets={{
            total_quantity_target: config.total_quantity_target,
            total_revenue_target: config.total_revenue_target,
            total_visits_target: config.total_visits_target,
          }}
          fyYear={fyYear}
          onBack={() => setCurrentStep(2)}
          onComplete={handleStep3Complete}
        />
      )}
    </div>
  );
}
