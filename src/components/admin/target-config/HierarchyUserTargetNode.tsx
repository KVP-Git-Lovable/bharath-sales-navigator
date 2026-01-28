import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, User, MapPin, Calendar, Store, Package, Truck, Map } from 'lucide-react';
import { UserBeatTargets } from './UserBeatTargets';
import { UserMonthlyTargets } from './UserMonthlyTargets';
import { UserRetailerTargets } from './UserRetailerTargets';
import { cn } from '@/lib/utils';

export interface HierarchyNodeData {
  userId: string;
  fullName: string;
  profilePictureUrl: string | null;
  managerId: string | null;
  level: number;
  allocationPercentage: number;
  quantityTarget: number;
  revenueTarget: number;
  visitsTarget: number;
  children: HierarchyNodeData[];
}

export interface EnabledParameters {
  product: boolean;
  retailer: boolean;
  beat: boolean;
  distributor: boolean;
  territory: boolean;
  monthly: boolean;
}

export interface EnabledBasis {
  quantity: boolean;
  revenue: boolean;
  visits: boolean;
}

interface HierarchyUserTargetNodeProps {
  node: HierarchyNodeData;
  enabledParameters: EnabledParameters;
  enabledBasis: EnabledBasis;
  quantityUnit: string;
  fyYear: number;
  selectedTargetType: 'quantity' | 'revenue' | 'visits';
  onTargetChange: (userId: string, field: string, value: number) => void;
  depth?: number;
}

export function HierarchyUserTargetNode({
  node,
  enabledParameters,
  enabledBasis,
  quantityUnit,
  fyYear,
  selectedTargetType,
  onTargetChange,
  depth = 0,
}: HierarchyUserTargetNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Set initial tab based on enabled parameters
    if (enabledParameters.beat) return 'beat';
    if (enabledParameters.monthly) return 'monthly';
    if (enabledParameters.retailer) return 'retailer';
    if (enabledParameters.product) return 'product';
    if (enabledParameters.distributor) return 'distributor';
    if (enabledParameters.territory) return 'territory';
    return 'beat';
  });

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  };

  const getTargetDisplay = () => {
    const parts: string[] = [];
    if (enabledBasis.quantity) {
      parts.push(`${formatNumber(node.quantityTarget)} ${quantityUnit}`);
    }
    if (enabledBasis.revenue) {
      parts.push(`₹${formatNumber(node.revenueTarget)}`);
    }
    if (enabledBasis.visits) {
      parts.push(`${formatNumber(node.visitsTarget)} Visits`);
    }
    return parts.join(' | ');
  };

  // Get active parameter tabs
  const getEnabledTabs = () => {
    const tabs: { value: string; label: string; icon: React.ReactNode }[] = [];
    if (enabledParameters.beat) tabs.push({ value: 'beat', label: 'Beats', icon: <MapPin className="h-4 w-4" /> });
    if (enabledParameters.monthly) tabs.push({ value: 'monthly', label: 'Monthly', icon: <Calendar className="h-4 w-4" /> });
    if (enabledParameters.retailer) tabs.push({ value: 'retailer', label: 'Retailers', icon: <Store className="h-4 w-4" /> });
    if (enabledParameters.product) tabs.push({ value: 'product', label: 'Products', icon: <Package className="h-4 w-4" /> });
    if (enabledParameters.distributor) tabs.push({ value: 'distributor', label: 'Distributors', icon: <Truck className="h-4 w-4" /> });
    if (enabledParameters.territory) tabs.push({ value: 'territory', label: 'Territory', icon: <Map className="h-4 w-4" /> });
    return tabs;
  };

  const enabledTabs = getEnabledTabs();
  const hasEnabledTabs = enabledTabs.length > 0;

  return (
    <div className={cn("border-l-2 border-muted", depth > 0 && "ml-6")}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* User Row Header */}
        <div className="flex items-center gap-3 p-3 bg-card hover:bg-muted/50 rounded-lg border mb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-1 h-auto" disabled={!hasEnabledTabs}>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <Avatar className="h-8 w-8">
            <AvatarImage src={node.profilePictureUrl || undefined} />
            <AvatarFallback>
              {node.fullName?.charAt(0) || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{node.fullName}</span>
              {node.children.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Manager ({node.children.length})
                </Badge>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm font-semibold text-primary">
              {getTargetDisplay()}
            </span>
          </div>
        </div>

        {/* Expandable Parameter Breakdown */}
        {hasEnabledTabs && (
          <CollapsibleContent>
            <div className="ml-8 mb-4 p-4 bg-muted/30 rounded-lg border">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  {enabledTabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {enabledParameters.beat && (
                  <TabsContent value="beat" className="m-0">
                    <UserBeatTargets
                      userId={node.userId}
                      fyYear={fyYear}
                      totalQuantity={node.quantityTarget}
                      totalRevenue={node.revenueTarget}
                      quantityUnit={quantityUnit}
                      selectedTargetType={selectedTargetType}
                      enabledBasis={enabledBasis}
                    />
                  </TabsContent>
                )}

                {enabledParameters.monthly && (
                  <TabsContent value="monthly" className="m-0">
                    <UserMonthlyTargets
                      userId={node.userId}
                      fyYear={fyYear}
                      totalQuantity={node.quantityTarget}
                      totalRevenue={node.revenueTarget}
                      totalVisits={node.visitsTarget}
                      quantityUnit={quantityUnit}
                      selectedTargetType={selectedTargetType}
                      enabledBasis={enabledBasis}
                    />
                  </TabsContent>
                )}

                {enabledParameters.retailer && (
                  <TabsContent value="retailer" className="m-0">
                    <UserRetailerTargets
                      userId={node.userId}
                      fyYear={fyYear}
                      totalQuantity={node.quantityTarget}
                      totalRevenue={node.revenueTarget}
                      quantityUnit={quantityUnit}
                      selectedTargetType={selectedTargetType}
                      enabledBasis={enabledBasis}
                    />
                  </TabsContent>
                )}

                {enabledParameters.product && (
                  <TabsContent value="product" className="m-0">
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Product breakdown coming soon
                    </div>
                  </TabsContent>
                )}

                {enabledParameters.distributor && (
                  <TabsContent value="distributor" className="m-0">
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Distributor breakdown coming soon
                    </div>
                  </TabsContent>
                )}

                {enabledParameters.territory && (
                  <TabsContent value="territory" className="m-0">
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Territory breakdown coming soon
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>

      {/* Render Children */}
      {node.children.length > 0 && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <HierarchyUserTargetNode
              key={child.userId}
              node={child}
              enabledParameters={enabledParameters}
              enabledBasis={enabledBasis}
              quantityUnit={quantityUnit}
              fyYear={fyYear}
              selectedTargetType={selectedTargetType}
              onTargetChange={onTargetChange}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
