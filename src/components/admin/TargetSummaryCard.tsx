import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Package, IndianRupee, Users } from 'lucide-react';

interface TargetConfig {
  target_plan_name?: string;
  enable_quantity: boolean;
  enable_revenue: boolean;
  enable_visits: boolean;
  quantity_unit: string;
  total_quantity_target: number;
  total_revenue_target: number;
  total_visits_target: number;
  is_locked?: boolean;
}

interface TargetSummaryCardProps {
  config: TargetConfig;
  fyYear: number;
  selectedUserName?: string;
  allocatedQuantity?: number;
  allocatedRevenue?: number;
  allocatedVisits?: number;
}

export function TargetSummaryCard({
  config,
  fyYear,
  selectedUserName,
  allocatedQuantity = 0,
  allocatedRevenue = 0,
  allocatedVisits = 0,
}: TargetSummaryCardProps) {
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

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">
              {config.target_plan_name || 'FY Sales Plan'}
            </h3>
            <p className="text-sm text-muted-foreground">
              FY {fyYear - 1}-{String(fyYear).slice(-2)} Targets
            </p>
          </div>
          {config.is_locked && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          )}
        </div>

        {selectedUserName && (
          <p className="text-sm text-muted-foreground mb-3">
            Allocating for: <span className="font-medium text-foreground">{selectedUserName}</span>
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {config.enable_quantity && (
            <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantity</p>
                <p className="font-semibold">
                  {formatNumber(config.total_quantity_target)} {config.quantity_unit}
                </p>
                {allocatedQuantity > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Allocated: {formatNumber(allocatedQuantity)}
                  </p>
                )}
              </div>
            </div>
          )}

          {config.enable_revenue && (
            <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
              <div className="p-2 bg-secondary/50 rounded-full">
                <IndianRupee className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="font-semibold">
                  {formatCurrency(config.total_revenue_target)}
                </p>
                {allocatedRevenue > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Allocated: {formatCurrency(allocatedRevenue)}
                  </p>
                )}
              </div>
            </div>
          )}

          {config.enable_visits && (
            <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
              <div className="p-2 bg-accent rounded-full">
                <Users className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Productive Visits</p>
                <p className="font-semibold">
                  {formatNumber(config.total_visits_target)}
                </p>
                {allocatedVisits > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Allocated: {formatNumber(allocatedVisits)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
