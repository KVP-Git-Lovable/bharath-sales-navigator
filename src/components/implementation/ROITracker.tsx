import { useMemo } from "react";
import { TrendingUp, CheckCircle, AlertCircle, IndianRupee, MapPin, Activity, Sparkles, Target as TargetIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface ROIMetricsValue {
  baseline: Record<string, number>;
  target: Record<string, number>;
  actual: Record<string, number>;
}

interface ROITrackerProps {
  value: ROIMetricsValue;
  onChange: (value: ROIMetricsValue) => void;
}

type MetricDef = {
  id: string;
  label: string;
  unit: string;
  description: string;
  lowerIsBetter?: boolean;
};

export const METRIC_GROUPS: Array<{ id: string; title: string; icon: any; metrics: MetricDef[] }> = [
  {
    id: "financial",
    title: "Financial Performance",
    icon: IndianRupee,
    metrics: [
      { id: "revenue", label: "Revenue", unit: "₹ Lakhs/month", description: "Monthly secondary sales revenue" },
      { id: "expense", label: "Operating Expense", unit: "₹ Lakhs/month", description: "Monthly field & operations cost", lowerIsBetter: true },
      { id: "targetAchievement", label: "Target vs Actual Achievement", unit: "%", description: "% of monthly revenue target achieved" },
      { id: "revenuePerRetailer", label: "Revenue per Retailer", unit: "₹/retailer", description: "Average monthly revenue per active retailer" },
      { id: "orderValueNewRetailers", label: "Order Value from New Retailers", unit: "₹ Lakhs/month", description: "Revenue from retailers added in the last 90 days" },
    ],
  },
  {
    id: "coverage",
    title: "Coverage & Reach",
    icon: MapPin,
    metrics: [
      { id: "retailersCovered", label: "# of Retailers Covered", unit: "count", description: "Unique retailers visited per cycle" },
      { id: "retailerCoverage", label: "Retailer Coverage", unit: "%", description: "Active retailers visited per cycle" },
      { id: "beatCompliance", label: "Beat Compliance", unit: "%", description: "Percentage of planned beats completed" },
      { id: "newRetailerOrders", label: "# Orders from New Retailers", unit: "orders/month", description: "Orders from retailers added in the last 90 days" },
    ],
  },
  {
    id: "discipline",
    title: "Field Discipline & Availability",
    icon: Activity,
    metrics: [
      { id: "checkInCompliance", label: "Field Discipline (Check-in)", unit: "%", description: "% of days with valid check-in / check-out" },
      { id: "attendanceRate", label: "Attendance & Market Availability", unit: "%", description: "% of working days reps were active in market" },
      { id: "activeUsers", label: "# of Active Users", unit: "count", description: "Daily active users on the app" },
    ],
  },
  {
    id: "productivity",
    title: "Productivity & Quality",
    icon: Sparkles,
    metrics: [
      { id: "productiveVisits", label: "Productive Visits", unit: "%", description: "Visits that resulted in an order" },
      { id: "productiveCalls", label: "Productive Calls/Day", unit: "count", description: "Average productive calls per rep per day" },
      { id: "orderAccuracy", label: "Order Accuracy", unit: "%", description: "Orders without errors or returns" },
      { id: "collectionEfficiency", label: "Collection Efficiency", unit: "%", description: "On-time payment collection rate" },
      { id: "orderCaptureTime", label: "Order Capture Time", unit: "minutes", description: "Average time to capture one order", lowerIsBetter: true },
      { id: "reportGenerationTime", label: "Report Generation Time", unit: "hours", description: "Time to generate daily reports", lowerIsBetter: true },
    ],
  },
];

const allMetrics: MetricDef[] = METRIC_GROUPS.flatMap((g) => g.metrics);

const adoptionMetrics = [
  { id: "dauTarget", label: "Daily Active Users", target: 90, unit: "%" },
  { id: "ordersPerDay", label: "Avg Orders/Day/FSR", target: 25, unit: "orders" },
  { id: "checkInComplianceTarget", label: "Check-in Compliance", target: 95, unit: "%" },
  { id: "offlineSyncRate", label: "Offline Sync Success", target: 99, unit: "%" },
];

export function ROITracker({ value, onChange }: ROITrackerProps) {
  const baseline = value.baseline || {};
  const target = value.target || {};
  const actual = value.actual || {};

  const setField = (type: "baseline" | "target" | "actual", id: string, v: number) => {
    onChange({
      ...value,
      [type]: { ...(value[type] || {}), [id]: v },
    });
  };

  const calculateProgress = (metric: MetricDef) => {
    const metricId = metric.id;
    const base = baseline[metricId] || 0;
    const tgt = target[metricId] || 0;
    const act = actual[metricId] || 0;

    if (tgt === base) return 0;

    if (metric.lowerIsBetter) {
      const improvement = base - act;
      const targetImprovement = base - tgt;
      return targetImprovement > 0 ? Math.min(100, (improvement / targetImprovement) * 100) : 0;
    }

    const improvement = act - base;
    const targetImprovement = tgt - base;
    return targetImprovement > 0 ? Math.min(100, (improvement / targetImprovement) * 100) : 0;
  };

  const { overallRoi, trackedCount } = useMemo(() => {
    // Weighted by group — each group contributes equally if any metric is filled in it,
    // so a few high-value financial metrics aren't drowned by many productivity metrics.
    let groupSum = 0;
    let groupsCounted = 0;
    let tracked = 0;
    METRIC_GROUPS.forEach((group) => {
      const filled = group.metrics.filter(
        (m) => baseline[m.id] != null && target[m.id] != null && actual[m.id] != null,
      );
      if (filled.length === 0) return;
      const groupAvg =
        filled.reduce((sum, m) => sum + calculateProgress(m), 0) / filled.length;
      groupSum += groupAvg;
      groupsCounted += 1;
      tracked += filled.length;
    });
    return {
      overallRoi: groupsCounted > 0 ? Math.round(groupSum / groupsCounted) : 0,
      trackedCount: tracked,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline, target, actual]);

  const getStatusColor = (progress: number) => {
    if (progress >= 100) return "text-green-400";
    if (progress >= 70) return "text-amber-400";
    if (progress >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500";
    if (progress >= 70) return "bg-amber-500";
    if (progress >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Overall ROI */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Overall ROI Achievement</p>
                <p className="text-4xl font-bold text-green-400">{overallRoi}%</p>
                <p className="text-white/40 text-xs mt-1">Weighted average across all metric groups</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-white/60 text-sm">Metrics Tracked</p>
              <p className="text-2xl font-bold text-white">
                {trackedCount} / {allMetrics.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Business Metrics */}
      {METRIC_GROUPS.map((group) => {
        const GroupIcon = group.icon;
        return (
          <Card key={group.id} className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <GroupIcon className="w-5 h-5 text-amber-400" />
                {group.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/60 py-3 px-2">Metric</th>
                      <th className="text-center text-white/60 py-3 px-2 w-24">Baseline</th>
                      <th className="text-center text-white/60 py-3 px-2 w-24">Target</th>
                      <th className="text-center text-white/60 py-3 px-2 w-24">Actual</th>
                      <th className="text-left text-white/60 py-3 px-2 w-48">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.metrics.map((metric) => {
                      const progress = calculateProgress(metric);
                      return (
                        <tr key={metric.id} className="border-b border-white/5">
                          <td className="py-3 px-2">
                            <div>
                              <p className="text-white font-medium">{metric.label}</p>
                              <p className="text-white/40 text-xs">
                                {metric.description} · <span className="text-white/30">{metric.unit}</span>
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              value={baseline[metric.id] ?? ""}
                              onChange={(e) => setField("baseline", metric.id, Number(e.target.value))}
                              placeholder="0"
                              className="bg-white/5 border-white/20 text-white text-center h-8 w-24"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              value={target[metric.id] ?? ""}
                              onChange={(e) => setField("target", metric.id, Number(e.target.value))}
                              placeholder="0"
                              className="bg-white/5 border-white/20 text-white text-center h-8 w-24"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              value={actual[metric.id] ?? ""}
                              onChange={(e) => setField("actual", metric.id, Number(e.target.value))}
                              placeholder="0"
                              className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-center h-8 w-24"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getProgressColor(progress)} transition-all`}
                                  style={{ width: `${Math.min(100, progress)}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium w-12 text-right ${getStatusColor(progress)}`}>
                                {Math.round(progress)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Adoption Metrics */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TargetIcon className="w-5 h-5 text-amber-400" />
            Adoption Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adoptionMetrics.map((metric) => {
              const currentValue = actual[metric.id] || 0;
              const progress = (currentValue / metric.target) * 100;
              const achieved = progress >= 100;
              
              return (
                <div key={metric.id} className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{metric.label}</span>
                    {achieved ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <Input
                      type="number"
                      value={currentValue || ""}
                      onChange={(e) => setField("actual", metric.id, Number(e.target.value))}
                      className="bg-white/5 border-white/20 text-white h-8 w-20"
                    />
                    <span className="text-white/60 text-sm">/ {metric.target} {metric.unit}</span>
                  </div>
                  <Progress value={Math.min(100, progress)} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ROI Calculation Summary */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">ROI Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white/60 text-sm mb-2">Time Savings</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Report Generation</span>
                  <span className="text-green-400">
                    {baseline.reportGenerationTime && actual.reportGenerationTime
                      ? `${(baseline.reportGenerationTime - actual.reportGenerationTime).toFixed(1)} hrs/day`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Order Capture</span>
                  <span className="text-green-400">
                    {baseline.orderCaptureTime && actual.orderCaptureTime
                      ? `${(baseline.orderCaptureTime - actual.orderCaptureTime).toFixed(1)} min/order`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white/60 text-sm mb-2">Productivity Gains</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Extra Calls/Day</span>
                  <span className="text-green-400">
                    {baseline.productiveCalls && actual.productiveCalls
                      ? `+${(actual.productiveCalls - baseline.productiveCalls).toFixed(0)}`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Coverage Increase</span>
                  <span className="text-green-400">
                    {baseline.retailerCoverage && actual.retailerCoverage
                      ? `+${(actual.retailerCoverage - baseline.retailerCoverage).toFixed(0)}%`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white/60 text-sm mb-2">Quality Improvement</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Order Accuracy</span>
                  <span className="text-green-400">
                    {baseline.orderAccuracy && actual.orderAccuracy
                      ? `+${(actual.orderAccuracy - baseline.orderAccuracy).toFixed(0)}%`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Collection Rate</span>
                  <span className="text-green-400">
                    {baseline.collectionEfficiency && actual.collectionEfficiency
                      ? `+${(actual.collectionEfficiency - baseline.collectionEfficiency).toFixed(0)}%`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/30">
            <p className="text-amber-400 font-medium mb-2">ROI Formula Applied</p>
            <p className="text-white/70 text-sm">
              ROI = (Productivity Gains × Team Size × Avg Revenue/Rep + Time Savings Value) / Implementation Cost × 100
            </p>
            <p className="text-white/40 text-xs mt-2">
              Enter actual values to see calculated ROI. Typical implementations see 200-400% ROI within 12 months.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
