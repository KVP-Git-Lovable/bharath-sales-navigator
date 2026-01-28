import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Save, AlertCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HierarchyUserTargetNode } from './target-config/HierarchyUserTargetNode';

interface EnabledParameters {
  product: boolean;
  retailer: boolean;
  beat: boolean;
  distributor: boolean;
  territory: boolean;
  monthly: boolean;
}

interface SubordinateAllocation {
  userId: string;
  fullName: string;
  profilePictureUrl: string | null;
  quantityTarget: number;
  revenueTarget: number;
  visitsTarget: number;
  existingPlanId?: string;
}

interface AllocationTableProps {
  parentUserId: string;
  totalQuantity: number;
  totalRevenue: number;
  totalVisits: number;
  quantityUnit: string;
  enabledMetrics: {
    quantity: boolean;
    revenue: boolean;
    visits: boolean;
  };
  enabledParameters: EnabledParameters;
  fyYear: number;
}

export function AllocationTable({
  parentUserId,
  totalQuantity,
  totalRevenue,
  totalVisits,
  quantityUnit,
  enabledMetrics,
  enabledParameters,
  fyYear,
}: AllocationTableProps) {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<Map<string, SubordinateAllocation>>(new Map());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Fetch direct subordinates
  const { data: subordinates, isLoading } = useQuery({
    queryKey: ['direct-subordinates', parentUserId, fyYear],
    queryFn: async () => {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('user_id')
        .eq('manager_id', parentUserId);

      if (error) throw error;

      if (!employees?.length) return [];

      const userIds = employees.map(e => e.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url')
        .in('id', userIds);

      // Get existing business plans - use 'year' column not 'fy_year'
      const { data: plans } = await supabase
        .from('user_business_plans')
        .select('*')
        .in('user_id', userIds)
        .eq('year', fyYear);

      const planMap = new Map(plans?.map(p => [p.user_id, p]) || []);

      return profiles?.map(profile => {
        const existingPlan = planMap.get(profile.id);
        return {
          userId: profile.id,
          fullName: profile.full_name || 'Unknown',
          profilePictureUrl: profile.profile_picture_url,
          quantityTarget: existingPlan?.quantity_target || 0,
          revenueTarget: existingPlan?.revenue_target || 0,
          visitsTarget: 0, // visits_target doesn't exist in schema, so default to 0
          existingPlanId: existingPlan?.id,
        };
      }) || [];
    },
    enabled: !!parentUserId,
  });

  // Initialize allocations when subordinates load
  useEffect(() => {
    if (subordinates) {
      const newAllocations = new Map<string, SubordinateAllocation>();
      subordinates.forEach(sub => {
        newAllocations.set(sub.userId, sub);
      });
      setAllocations(newAllocations);
    }
  }, [subordinates]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = Array.from(allocations.values()).map(alloc => ({
        id: alloc.existingPlanId || undefined,
        user_id: alloc.userId,
        year: fyYear,
        quantity_target: alloc.quantityTarget,
        revenue_target: alloc.revenueTarget,
        quantity_unit: quantityUnit,
      }));

      const { error } = await supabase
        .from('user_business_plans')
        .upsert(upserts, { onConflict: 'user_id,year' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-subordinates', parentUserId] });
      toast.success('Allocations saved successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const handleAllocationChange = (userId: string, field: string, value: number) => {
    setAllocations(prev => {
      const next = new Map(prev);
      const current = next.get(userId);
      if (current) {
        next.set(userId, { ...current, [field]: value });
      }
      return next;
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const parseNumber = (value: string) => {
    const cleaned = value.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Calculate totals
  const allocatedQuantity = Array.from(allocations.values()).reduce((sum, a) => sum + a.quantityTarget, 0);
  const allocatedRevenue = Array.from(allocations.values()).reduce((sum, a) => sum + a.revenueTarget, 0);
  const allocatedVisits = Array.from(allocations.values()).reduce((sum, a) => sum + a.visitsTarget, 0);

  const remainingQuantity = totalQuantity - allocatedQuantity;
  const remainingRevenue = totalRevenue - allocatedRevenue;
  const remainingVisits = totalVisits - allocatedVisits;

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!subordinates?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No direct reports found for this user.</p>
          <p className="text-sm mt-1">Select a different user from the hierarchy.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Allocate to Team ({subordinates.length} members)</span>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Allocation
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Remaining indicators */}
        <div className="flex flex-wrap gap-3 mb-4">
          {enabledMetrics.quantity && (
            <Badge variant={remainingQuantity < 0 ? 'destructive' : remainingQuantity === 0 ? 'default' : 'secondary'}>
              Remaining: {formatNumber(remainingQuantity)} {quantityUnit}
            </Badge>
          )}
          {enabledMetrics.revenue && (
            <Badge variant={remainingRevenue < 0 ? 'destructive' : remainingRevenue === 0 ? 'default' : 'secondary'}>
              Remaining: ₹{formatNumber(remainingRevenue)}
            </Badge>
          )}
          {enabledMetrics.visits && (
            <Badge variant={remainingVisits < 0 ? 'destructive' : remainingVisits === 0 ? 'default' : 'secondary'}>
              Remaining: {formatNumber(remainingVisits)} visits
            </Badge>
          )}
        </div>

        {/* Allocation rows */}
        <div className="space-y-3">
          {Array.from(allocations.values()).map(alloc => {
            const quantityPercent = totalQuantity > 0 ? (alloc.quantityTarget / totalQuantity) * 100 : 0;
            const revenuePercent = totalRevenue > 0 ? (alloc.revenueTarget / totalRevenue) * 100 : 0;
            const isExpanded = expandedUsers.has(alloc.userId);

            return (
              <Collapsible key={alloc.userId} open={isExpanded}>
                <div className="border rounded-lg p-3 space-y-3">
                  {/* User header row */}
                  <div className="flex items-center gap-3">
                    <CollapsibleTrigger
                      className="p-1 hover:bg-muted rounded"
                      onClick={() => toggleUserExpand(alloc.userId)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>

                    <Avatar className="h-8 w-8">
                      <AvatarImage src={alloc.profilePictureUrl || undefined} />
                      <AvatarFallback>
                        {alloc.fullName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{alloc.fullName}</p>
                    </div>

                    {/* Metric inputs */}
                    <div className="flex items-center gap-4">
                      {enabledMetrics.quantity && (
                        <div className="w-32">
                          <Input
                            type="text"
                            value={alloc.quantityTarget > 0 ? formatNumber(alloc.quantityTarget) : ''}
                            onChange={(e) => handleAllocationChange(alloc.userId, 'quantityTarget', parseNumber(e.target.value))}
                            placeholder={quantityUnit}
                            className="h-8 text-sm"
                          />
                          <Progress value={quantityPercent} className="h-1 mt-1" />
                        </div>
                      )}

                      {enabledMetrics.revenue && (
                        <div className="w-32">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                            <Input
                              type="text"
                              value={alloc.revenueTarget > 0 ? formatNumber(alloc.revenueTarget) : ''}
                              onChange={(e) => handleAllocationChange(alloc.userId, 'revenueTarget', parseNumber(e.target.value))}
                              placeholder="Revenue"
                              className="h-8 text-sm pl-6"
                            />
                          </div>
                          <Progress value={revenuePercent} className="h-1 mt-1" />
                        </div>
                      )}

                      {enabledMetrics.visits && (
                        <div className="w-24">
                          <Input
                            type="text"
                            value={alloc.visitsTarget > 0 ? formatNumber(alloc.visitsTarget) : ''}
                            onChange={(e) => handleAllocationChange(alloc.userId, 'visitsTarget', Math.round(parseNumber(e.target.value)))}
                            placeholder="Visits"
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded parameter breakdown */}
                  <CollapsibleContent>
                    <div className="pt-3 border-t">
                      <HierarchyUserTargetNode
                        node={{
                          userId: alloc.userId,
                          fullName: alloc.fullName,
                          profilePictureUrl: alloc.profilePictureUrl,
                          level: 1,
                          quantityTarget: alloc.quantityTarget,
                          revenueTarget: alloc.revenueTarget,
                          visitsTarget: alloc.visitsTarget,
                          children: [],
                        }}
                        enabledParameters={enabledParameters}
                        enabledBasis={{
                          quantity: enabledMetrics.quantity,
                          revenue: enabledMetrics.revenue,
                          visits: enabledMetrics.visits,
                        }}
                        quantityUnit={quantityUnit}
                        fyYear={fyYear}
                        selectedTargetType="quantity"
                        onTargetChange={() => {}}
                        isExpanded={true}
                        hideHeader={true}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Warning for over-allocation */}
        {(remainingQuantity < 0 || remainingRevenue < 0 || remainingVisits < 0) && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Total allocations exceed the target. Please adjust.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
