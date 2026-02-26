import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';
import { DistributionSummaryHeader } from './DistributionSummaryHeader';
import { AllocationTable } from './AllocationTable';

interface EnabledParameters {
  product: boolean;
  retailer: boolean;
  beat: boolean;
  distributor: boolean;
  territory: boolean;
  monthly: boolean;
}

interface TargetConfig {
  id?: string;
  target_plan_name?: string;
  enable_quantity: boolean;
  enable_revenue: boolean;
  enable_visits: boolean;
  quantity_unit: string;
  enabled_parameters: EnabledParameters;
  total_quantity_target: number;
  total_revenue_target: number;
  total_visits_target: number;
  is_locked?: boolean;
}

interface HierarchyAllocationTabProps {
  fyYear: number;
}

export function HierarchyAllocationTab({ fyYear }: HierarchyAllocationTabProps) {
  const { user } = useAuth();
  const [selectedNode, setSelectedNode] = useState<{
    userId: string;
    fullName: string;
    level: number;
  } | null>(null);

  // Fetch config for the FY
  const { data: config, isLoading } = useQuery({
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

  // Auto-select current user as root
  useEffect(() => {
    if (user?.id && !selectedNode) {
      // Get user's name
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setSelectedNode({
            userId: user.id,
            fullName: data?.full_name || 'You',
            level: 0,
          });
        });
    }
  }, [user?.id, selectedNode]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Target Configuration</h3>
          <p className="text-muted-foreground">
            Please create and lock a target configuration in the "Targets" tab first.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!config.is_locked) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Configuration Not Locked</h3>
          <p className="text-muted-foreground">
            Please lock the target configuration in the "Targets" tab before allocating to users.
          </p>
        </CardContent>
      </Card>
    );
  }

  const rawParams = config.enabled_parameters as unknown;
  const enabledParams: EnabledParameters = (rawParams && typeof rawParams === 'object') 
    ? {
        product: Boolean((rawParams as Record<string, unknown>).product),
        retailer: Boolean((rawParams as Record<string, unknown>).retailer),
        beat: Boolean((rawParams as Record<string, unknown>).beat),
        distributor: Boolean((rawParams as Record<string, unknown>).distributor),
        territory: Boolean((rawParams as Record<string, unknown>).territory),
        monthly: Boolean((rawParams as Record<string, unknown>).monthly),
      }
    : {
        product: false,
        retailer: false,
        beat: false,
        distributor: false,
        territory: false,
        monthly: false,
      };

  return (
    <div className="space-y-4">
      {/* Distribution Summary Header */}
      <DistributionSummaryHeader
        targetPlanName={config.target_plan_name || 'FY Sales Plan'}
        fyYear={fyYear}
        isLocked={config.is_locked}
        enabledMetrics={{
          quantity: config.enable_quantity,
          revenue: config.enable_revenue,
          visits: config.enable_visits,
        }}
        quantityUnit={config.quantity_unit}
        totalQuantity={config.total_quantity_target}
        totalRevenue={config.total_revenue_target}
        totalVisits={config.total_visits_target}
        allocatedQuantity={0}
        allocatedRevenue={0}
        allocatedVisits={0}
        selectedUserName={selectedNode?.fullName}
      />

      {/* Allocation Table */}
      {selectedNode && (
        <AllocationTable
          parentUserId={selectedNode.userId}
          totalQuantity={config.total_quantity_target}
          totalRevenue={config.total_revenue_target}
          totalVisits={config.total_visits_target}
          quantityUnit={config.quantity_unit}
          enabledMetrics={{
            quantity: config.enable_quantity,
            revenue: config.enable_revenue,
            visits: config.enable_visits,
          }}
          enabledParameters={enabledParams}
          fyYear={fyYear}
          targetStartMonth={config.target_start_month || 1}
          targetEndMonth={config.target_end_month || 12}
        />
      )}
    </div>
  );
}
