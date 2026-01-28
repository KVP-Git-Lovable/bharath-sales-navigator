import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, CheckCircle2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserFYPlanTarget } from '@/components/profile/UserFYPlanTarget';
import { Skeleton } from '@/components/ui/skeleton';

interface TargetConfig {
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

interface FYTargets {
  total_quantity_target: number;
  total_revenue_target: number;
  total_visits_target: number;
}

interface ApplyToUsersStepProps {
  config: TargetConfig;
  targets: FYTargets;
  fyYear: number;
  onBack: () => void;
  onComplete: () => void;
}

type AllocationMode = 'individual' | 'hierarchy';

export function ApplyToUsersStep({ 
  config, 
  targets, 
  fyYear, 
  onBack,
  onComplete
}: ApplyToUsersStepProps) {
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('individual');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Fetch all users/profiles for selection
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['all-profiles-for-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const enabledParams = useMemo(() => {
    return Object.entries(config.enabled_parameters)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);
  }, [config.enabled_parameters]);

  const selectedUser = useMemo(() => {
    return users?.find(u => u.id === selectedUserId);
  }, [users, selectedUserId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Step 3: Apply Targets to Users
          </CardTitle>
          <CardDescription>
            Allocate FY {fyYear - 1}-{String(fyYear).slice(-2)} targets to team members with parameter breakdowns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* FY Targets Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-3">FY Targets to Allocate:</p>
            <div className="grid grid-cols-3 gap-4">
              {config.enable_quantity && (
                <div className="text-center p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-primary">{formatNumber(targets.total_quantity_target)}</p>
                  <p className="text-xs text-muted-foreground">{config.quantity_unit}</p>
                </div>
              )}
              {config.enable_revenue && (
                <div className="text-center p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-primary">₹{formatNumber(targets.total_revenue_target)}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              )}
              {config.enable_visits && (
                <div className="text-center p-3 bg-background rounded-lg">
                  <p className="text-2xl font-bold text-primary">{formatNumber(targets.total_visits_target)}</p>
                  <p className="text-xs text-muted-foreground">Visits</p>
                </div>
              )}
            </div>
          </div>

          {/* Allocation Mode */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Allocation Method</Label>
            <RadioGroup 
              value={allocationMode} 
              onValueChange={(v) => setAllocationMode(v as AllocationMode)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="font-normal cursor-pointer">
                  Individual User
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hierarchy" id="hierarchy" />
                <Label htmlFor="hierarchy" className="font-normal cursor-pointer">
                  Hierarchy Cascade
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* User Selection */}
          {allocationMode === 'individual' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select User</Label>
              {usersLoading ? (
                <Skeleton className="h-10 w-64" />
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.username || 'Unknown User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Enabled Parameters Info */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Enabled breakdowns:</span>
            {enabledParams.map((param) => (
              <Badge key={param} variant="outline" className="capitalize">
                {param}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Target Setting - Only show when user is selected */}
      {allocationMode === 'individual' && selectedUserId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Setting Targets for: {selectedUser?.full_name || 'Selected User'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserFYPlanTarget 
              targetUserId={selectedUserId}
              enabledParameters={config.enabled_parameters}
              fyConfig={{
                quantityTarget: targets.total_quantity_target,
                revenueTarget: targets.total_revenue_target,
                quantityUnit: config.quantity_unit,
              }}
              preselectedYear={fyYear}
            />
          </CardContent>
        </Card>
      )}

      {/* Hierarchy Mode Placeholder */}
      {allocationMode === 'hierarchy' && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Hierarchy cascade mode is available in the "Assign Targets" tab.</p>
            <p className="text-sm mt-2">Switch to that tab to use the hierarchy allocation feature.</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onComplete} variant="default">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Complete Setup
        </Button>
      </div>
    </div>
  );
}
