import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, AlertCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { HierarchyUserTargetNode } from './target-config/HierarchyUserTargetNode';
import { cn } from '@/lib/utils';

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

// Progress bar color based on percentage
const getProgressColor = (percent: number) => {
  if (percent <= 60) return 'bg-emerald-500';
  if (percent <= 85) return 'bg-amber-500';
  return 'bg-red-500';
};

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

      // Get existing business plans
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
          visitsTarget: 0,
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

  const formatCurrency = (num: number) => {
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    } else if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
    return `₹${formatNumber(num)}`;
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

  const hasOverAllocation = remainingQuantity < 0 || remainingRevenue < 0 || remainingVisits < 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="border-b-2 border-primary/30 pb-0.5">Allocation Method</span>
          <Badge variant="secondary" className="ml-auto">
            {subordinates.length} members
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Allocation Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10"></TableHead>
                <TableHead>Target</TableHead>
                {enabledMetrics.quantity && (
                  <TableHead className="text-right">Quantity</TableHead>
                )}
                {enabledMetrics.quantity && (
                  <TableHead className="w-32">Progress</TableHead>
                )}
                {enabledMetrics.revenue && (
                  <TableHead className="text-right">₹ Total</TableHead>
                )}
                {enabledMetrics.visits && (
                  <TableHead className="text-right">Visits</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(allocations.values()).map(alloc => {
                const quantityPercent = totalQuantity > 0 ? (alloc.quantityTarget / totalQuantity) * 100 : 0;
                const isExpanded = expandedUsers.has(alloc.userId);

                return (
                  <Collapsible key={alloc.userId} open={isExpanded} asChild>
                    <>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell className="p-2">
                          <CollapsibleTrigger asChild>
                            <button
                              className="p-1 hover:bg-muted rounded"
                              onClick={() => toggleUserExpand(alloc.userId)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-medium">
                          {alloc.fullName}
                        </TableCell>
                        {enabledMetrics.quantity && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="text"
                                value={alloc.quantityTarget > 0 ? formatNumber(alloc.quantityTarget) : ''}
                                onChange={(e) => handleAllocationChange(alloc.userId, 'quantityTarget', parseNumber(e.target.value))}
                                placeholder="0"
                                className="h-8 w-24 text-right text-sm"
                              />
                              <span className="text-xs text-muted-foreground w-12">{quantityUnit}</span>
                            </div>
                          </TableCell>
                        )}
                        {enabledMetrics.quantity && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all",
                                    getProgressColor(quantityPercent)
                                  )}
                                  style={{ width: `${Math.min(quantityPercent, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {quantityPercent.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        )}
                        {enabledMetrics.revenue && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <span className="text-muted-foreground text-sm mr-1">₹</span>
                              <Input
                                type="text"
                                value={alloc.revenueTarget > 0 ? formatNumber(alloc.revenueTarget) : ''}
                                onChange={(e) => handleAllocationChange(alloc.userId, 'revenueTarget', parseNumber(e.target.value))}
                                placeholder="0"
                                className="h-8 w-28 text-right text-sm"
                              />
                            </div>
                          </TableCell>
                        )}
                        {enabledMetrics.visits && (
                          <TableCell className="text-right">
                            <Input
                              type="text"
                              value={alloc.visitsTarget > 0 ? formatNumber(alloc.visitsTarget) : ''}
                              onChange={(e) => handleAllocationChange(alloc.userId, 'visitsTarget', Math.round(parseNumber(e.target.value)))}
                              placeholder="0"
                              className="h-8 w-20 text-right text-sm"
                            />
                          </TableCell>
                        )}
                      </TableRow>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={6} className="p-0">
                            <div className="bg-muted/20 px-4 py-3 border-t">
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
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/30">
                <TableCell colSpan={2} className="font-medium">
                  Remaining
                </TableCell>
                {enabledMetrics.quantity && (
                  <TableCell className="text-right">
                    <Badge 
                      variant={remainingQuantity < 0 ? 'destructive' : remainingQuantity === 0 ? 'default' : 'secondary'}
                      className="font-mono"
                    >
                      {formatNumber(remainingQuantity)} {quantityUnit}
                    </Badge>
                  </TableCell>
                )}
                {enabledMetrics.quantity && <TableCell />}
                {enabledMetrics.revenue && (
                  <TableCell className="text-right">
                    <Badge 
                      variant={remainingRevenue < 0 ? 'destructive' : remainingRevenue === 0 ? 'default' : 'secondary'}
                      className="font-mono"
                    >
                      {formatCurrency(remainingRevenue)}
                    </Badge>
                  </TableCell>
                )}
                {enabledMetrics.visits && (
                  <TableCell className="text-right">
                    <Badge 
                      variant={remainingVisits < 0 ? 'destructive' : remainingVisits === 0 ? 'default' : 'secondary'}
                      className="font-mono"
                    >
                      {formatNumber(remainingVisits)}
                    </Badge>
                  </TableCell>
                )}
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Warning for over-allocation */}
        {hasOverAllocation && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Total allocations exceed the target. Please adjust.</span>
          </div>
        )}

        {/* Centered Save Button */}
        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="min-w-[200px]"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Allocation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
