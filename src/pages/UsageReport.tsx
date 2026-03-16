import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Clock, Users, ChevronRight, Filter, Smartphone, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

const CORE_MODULES = ['Attendance', 'Visit', 'Packing List', 'Delivery', 'My Beat', 'My Retailer', 'Orders'];
const PERFORMANCE_MODULES = ['Feedback', 'AI Features', 'Analytics', 'Schemes', 'Targets', 'Branding', 'GPS Track', 'Credit Management'];
const ALL_MODULES = [...CORE_MODULES, ...PERFORMANCE_MODULES];

const AI_FEATURES = ['Target Advisor', 'AI Chat', 'Sales Coach', 'Smart Basket', 'Visit AI Insights'];

interface UserUsage {
  userId: string;
  fullName: string;
  managerId: string | null;
  managerName: string | null;
  designation: string | null;
  modulesUsed: Set<string>;
  totalTimeSeconds: number;
  moduleDetails: Record<string, { timeSeconds: number; count: number }>;
  usagePercent: number;
}

type DateFilter = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days';

const getDateRange = (filter: DateFilter): { from: Date; to: Date } => {
  const now = new Date();
  switch (filter) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': { const y = subDays(now, 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    case 'this_week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case 'this_month': return { from: startOfMonth(now), to: endOfDay(now) };
    case 'last_7_days': return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'last_30_days': return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
};

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const UsageReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_week');
  const [usageData, setUsageData] = useState<UserUsage[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserUsage | null>(null);

  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);

  const fetchUsageData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get subordinates
      const { data: subordinates } = await supabase
        .rpc('get_all_subordinates', { manager_user_id: user.id });

      const userIds = (subordinates || []).map((s: any) => s.subordinate_user_id);
      if (userIds.length === 0) {
        setUsageData([]);
        setLoading(false);
        return;
      }

      // Get profiles with manager info
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, manager_id, designation')
        .in('id', userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      // Get module usage logs
      const fromStr = format(dateRange.from, "yyyy-MM-dd'T'HH:mm:ss");
      const toStr = format(dateRange.to, "yyyy-MM-dd'T'HH:mm:ss");

      // Fetch in batches if needed
      const allLogs: any[] = [];
      const batchSize = 50;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const { data: logs } = await supabase
          .from('module_usage_logs' as any)
          .select('user_id, module_name, module_category, duration_seconds, started_at')
          .in('user_id', batch)
          .gte('started_at', fromStr)
          .lte('started_at', toStr);
        if (logs) allLogs.push(...logs);
      }

      // Aggregate per user
      const userMap: Record<string, UserUsage> = {};

      userIds.forEach((uid: string) => {
        const profile = profileMap[uid];
        if (!profile) return;
        const managerProfile = profile.manager_id ? profileMap[profile.manager_id] : null;
        userMap[uid] = {
          userId: uid,
          fullName: profile.full_name || 'Unknown',
          managerId: profile.manager_id,
          managerName: managerProfile?.full_name || null,
          designation: profile.designation,
          modulesUsed: new Set(),
          totalTimeSeconds: 0,
          moduleDetails: {},
          usagePercent: 0,
        };
      });

      allLogs.forEach((log: any) => {
        const u = userMap[log.user_id];
        if (!u) return;
        u.modulesUsed.add(log.module_name);
        u.totalTimeSeconds += (log.duration_seconds || 0);
        if (!u.moduleDetails[log.module_name]) {
          u.moduleDetails[log.module_name] = { timeSeconds: 0, count: 0 };
        }
        u.moduleDetails[log.module_name].timeSeconds += (log.duration_seconds || 0);
        u.moduleDetails[log.module_name].count += 1;
      });

      // Calculate usage %
      Object.values(userMap).forEach(u => {
        u.usagePercent = Math.round((u.modulesUsed.size / ALL_MODULES.length) * 100);
      });

      setUsageData(
        Object.values(userMap)
          .filter(u => u.userId !== user.id) // Exclude self from list
          .sort((a, b) => b.usagePercent - a.usagePercent || b.totalTimeSeconds - a.totalTimeSeconds)
      );
    } catch (e) {
      console.error('Error fetching usage data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [user, dateFilter]);

  const overallStats = useMemo(() => {
    const activeUsers = usageData.filter(u => u.modulesUsed.size > 0).length;
    const totalTime = usageData.reduce((sum, u) => sum + u.totalTimeSeconds, 0);
    const avgPercent = usageData.length > 0
      ? Math.round(usageData.reduce((sum, u) => sum + u.usagePercent, 0) / usageData.length)
      : 0;
    return { activeUsers, totalUsers: usageData.length, totalTime, avgPercent };
  }, [usageData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-4 max-w-4xl">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <CardTitle className="text-xl font-bold">Usage Report</CardTitle>
                <p className="text-primary-foreground/80 text-sm">Module usage & screen time</p>
              </div>
            </div>
            <Smartphone size={24} />
          </CardHeader>
        </Card>

        {/* Date Filter */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-muted-foreground" />
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-3 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold text-primary">{overallStats.activeUsers}/{overallStats.totalUsers}</div>
              <div className="text-[10px] text-muted-foreground">Active Users</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <div className="text-xl font-bold text-green-600">{formatDuration(overallStats.totalTime)}</div>
              <div className="text-[10px] text-muted-foreground">Total Time</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <Activity className="h-5 w-5 mx-auto mb-1 text-amber-600" />
              <div className="text-xl font-bold text-amber-600">{overallStats.avgPercent}%</div>
              <div className="text-[10px] text-muted-foreground">Avg Usage</div>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              User-wise Module Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading usage data...</div>
            ) : usageData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No usage data found</div>
            ) : (
              <div className="divide-y">
                {usageData.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{u.fullName}</span>
                        {u.designation && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
                            {u.designation}
                          </Badge>
                        )}
                      </div>
                      {u.managerName && (
                        <p className="text-[10px] text-muted-foreground truncate">Reports to: {u.managerName}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <Progress value={u.usagePercent} className="h-1.5 flex-1" />
                        <span className="text-xs font-semibold text-primary shrink-0">{u.usagePercent}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-medium text-muted-foreground">
                        {u.modulesUsed.size}/{ALL_MODULES.length} modules
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDuration(u.totalTimeSeconds)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              {selectedUser?.fullName}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {selectedUser?.designation || 'Team Member'} • {formatDuration(selectedUser?.totalTimeSeconds || 0)} total screen time
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-4 space-y-5">
            {selectedUser && (
              <>
                {/* Overall Usage Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Overall Usage</span>
                  <Progress value={selectedUser.usagePercent} className="h-2 flex-1" />
                  <span className="text-sm font-bold text-primary">{selectedUser.usagePercent}%</span>
                </div>

                {/* Core Modules */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    Core Modules
                  </h3>
                  <div className="space-y-2">
                    {CORE_MODULES.map((mod) => {
                      const detail = selectedUser.moduleDetails[mod];
                      const isUsed = selectedUser.modulesUsed.has(mod);
                      return (
                        <div
                          key={mod}
                          className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg border",
                            isUsed ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              isUsed ? "bg-green-500" : "bg-muted-foreground/30"
                            )} />
                            <span className={cn("text-sm", isUsed ? "font-medium" : "text-muted-foreground")}>{mod}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {detail && (
                              <>
                                <Badge variant="secondary" className="text-[10px]">
                                  {detail.count} {detail.count === 1 ? 'visit' : 'visits'}
                                </Badge>
                                <span className="text-xs font-medium text-primary min-w-[50px] text-right">
                                  {formatDuration(detail.timeSeconds)}
                                </span>
                              </>
                            )}
                            {!isUsed && <span className="text-[10px] text-muted-foreground">Not used</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Performance Modules */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    Performance Modules
                  </h3>
                  <div className="space-y-2">
                    {PERFORMANCE_MODULES.map((mod) => {
                      const detail = selectedUser.moduleDetails[mod];
                      const isUsed = selectedUser.modulesUsed.has(mod);
                      return (
                        <div
                          key={mod}
                          className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-lg border",
                            isUsed ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/30 border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              isUsed ? "bg-green-500" : "bg-muted-foreground/30"
                            )} />
                            <span className={cn("text-sm", isUsed ? "font-medium" : "text-muted-foreground")}>{mod}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {detail && (
                              <>
                                <Badge variant="secondary" className="text-[10px]">
                                  {detail.count} {detail.count === 1 ? 'visit' : 'visits'}
                                </Badge>
                                <span className="text-xs font-medium text-amber-600 min-w-[50px] text-right">
                                  {formatDuration(detail.timeSeconds)}
                                </span>
                              </>
                            )}
                            {!isUsed && <span className="text-[10px] text-muted-foreground">Not used</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Features Breakdown (if AI Features was used) */}
                {selectedUser.modulesUsed.has('AI Features') && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-500" />
                      AI Features Used
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {AI_FEATURES.map((feat) => (
                        <Badge
                          key={feat}
                          variant="outline"
                          className="text-xs bg-purple-500/10 text-purple-700 border-purple-500/30"
                        >
                          {feat}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      AI feature breakdown based on recorded usage within the selected period.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
