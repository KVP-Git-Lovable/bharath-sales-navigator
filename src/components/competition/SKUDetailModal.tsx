import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, BarChart3, AlertCircle } from "lucide-react";

interface SKUDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sku: any;
  competitionData: any[];
}

export function SKUDetailModal({ isOpen, onClose, sku, competitionData }: SKUDetailModalProps) {
  if (!sku) return null;

  const skuData = competitionData.filter(d => d.sku_id === sku.id);
  const totalStock = skuData.reduce((sum, d) => sum + (d.stock_quantity || 0), 0);
  const avgStock = skuData.length > 0 ? (totalStock / skuData.length).toFixed(1) : 0;
  const observations = skuData.length;

  const highImpactCount = skuData.filter(d => d.impact_level === 'high').length;
  const needsAttentionCount = skuData.filter(d => d.needs_attention).length;

  const recentObservations = skuData
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {sku.sku_name} - Performance Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Observations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{observations}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgStock} {sku.unit}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Demand Level</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={
                  sku.demand === 'High' ? 'destructive' :
                  sku.demand === 'Medium' ? 'default' : 'secondary'
                }>
                  {sku.demand || 'Not Analyzed'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">High Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{highImpactCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {needsAttentionCount > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Needs Attention: {needsAttentionCount} locations
                </CardTitle>
              </CardHeader>
            </Card>
          )}

          {/* Recent Observations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Recent Observations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentObservations.map((obs) => (
                  <div key={obs.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                    <div className="flex-1">
                      <div className="font-medium">{obs.retailers?.name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(obs.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{obs.stock_quantity} {obs.unit}</div>
                      {obs.impact_level && (
                        <Badge variant={
                          obs.impact_level === 'high' ? 'destructive' :
                          obs.impact_level === 'medium' ? 'default' : 'secondary'
                        } className="text-xs">
                          {obs.impact_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {recentObservations.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No recent observations
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Market Presence:</strong> Found in {observations} location{observations !== 1 ? 's' : ''}
                </p>
                <p>
                  <strong>Stock Levels:</strong> Average stock of {avgStock} {sku.unit} per location
                </p>
                {sku.demand === 'High' && (
                  <p className="text-destructive font-medium">
                    ⚠️ High demand product - significant market presence detected
                  </p>
                )}
                {needsAttentionCount > 0 && (
                  <p className="text-destructive">
                    ⚠️ Requires attention at {needsAttentionCount} location{needsAttentionCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
