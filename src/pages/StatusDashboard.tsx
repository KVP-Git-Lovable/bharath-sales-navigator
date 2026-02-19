import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogOut, RefreshCw, Database, Clock, HardDrive, Activity, ArrowUpDown, CheckCircle, XCircle, Table2, Zap, FileText, Server } from 'lucide-react';
import quickappLogo from "@/assets/quickapp-logo-full-yellow-black.png";

interface MetricCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const StatusDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [dbName, setDbName] = useState('');

  const fetchMetrics = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.rpc('get_database_metrics');
      if (error) throw error;

      const m = data as any;
      setDbName(m.db_name || '');

      setMetrics([
        { label: 'Database Size', value: formatBytes(m.db_size_bytes), icon: <HardDrive className="h-6 w-6" />, description: 'Total database storage used' },
        { label: 'Uptime', value: formatUptime(m.uptime_seconds), icon: <Clock className="h-6 w-6" />, description: `Since ${new Date(m.postmaster_start_time).toLocaleDateString()}` },
        { label: 'Status', value: 'Online', icon: <Activity className="h-6 w-6" />, description: `${m.active_connections} active / ${m.total_connections} total connections`, color: 'text-green-600' },
        { label: 'Cache Hit Ratio', value: `${m.cache_hit_ratio}%`, icon: <Zap className="h-6 w-6" />, description: 'Buffer cache effectiveness', color: m.cache_hit_ratio >= 99 ? 'text-green-600' : m.cache_hit_ratio >= 95 ? 'text-amber-600' : 'text-red-600' },
        { label: 'Rows Read', value: formatNumber(m.rows_read), icon: <ArrowUpDown className="h-6 w-6" />, description: 'Total tuples returned' },
        { label: 'Rows Inserted', value: formatNumber(m.rows_inserted), icon: <ArrowUpDown className="h-6 w-6" />, description: 'Total tuples inserted' },
        { label: 'Rows Updated', value: formatNumber(m.rows_updated), icon: <ArrowUpDown className="h-6 w-6" />, description: 'Total tuples updated' },
        { label: 'Rows Deleted', value: formatNumber(m.rows_deleted), icon: <ArrowUpDown className="h-6 w-6" />, description: 'Total tuples deleted' },
        { label: 'Commits', value: formatNumber(m.commits), icon: <CheckCircle className="h-6 w-6" />, description: 'Successful transactions' },
        { label: 'Rollbacks', value: formatNumber(m.rollbacks), icon: <XCircle className="h-6 w-6" />, description: 'Failed transactions' },
        { label: 'Disk Reads', value: formatNumber(m.blks_read), icon: <Database className="h-6 w-6" />, description: 'Blocks read from disk' },
        { label: 'Cache Hits', value: formatNumber(m.blks_hit), icon: <Server className="h-6 w-6" />, description: 'Blocks found in buffer cache' },
        { label: 'Deadlocks', value: formatNumber(m.deadlocks), icon: <XCircle className="h-6 w-6" />, description: 'Total deadlocks detected', color: m.deadlocks > 0 ? 'text-red-600' : undefined },
        { label: 'Temp Files', value: formatNumber(m.temp_files), icon: <FileText className="h-6 w-6" />, description: 'Temp files created for sorts/joins' },
        { label: 'Tables', value: m.total_table_count, icon: <Table2 className="h-6 w-6" />, description: 'Public schema tables' },
      ]);
      setLastRefreshed(new Date());
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
      toast({ title: 'Error', description: error.message || 'Failed to fetch metrics', variant: 'destructive' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError || !authData.user) {
        toast({ title: 'Authentication Failed', description: authError?.message || 'Invalid credentials', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('profile_id, security_profiles(name)')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError || !profileData || (profileData as any).security_profiles?.name !== 'System Administrator') {
        toast({ title: 'Access Denied', description: 'Only System Administrators can access this dashboard.', variant: 'destructive' });
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      toast({ title: 'Welcome', description: 'Successfully authenticated as Administrator' });
      await fetchMetrics();
    } catch (error) {
      console.error('Login error:', error);
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setMetrics([]);
    setEmail('');
    setPassword('');
    setLastRefreshed(null);
    setDbName('');
  };

  // --- Login View ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: '#1976d2', minHeight: '100vh' }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 1px, transparent 1px)`, backgroundSize: '50px 50px, 25px 25px' }} />
        <Card className="w-full max-w-md relative z-10 shadow-2xl border-white/20 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <img src={quickappLogo} alt="QuickApp.AI" className="h-16 w-16 rounded-xl shadow-lg" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">QuickApp<span className="text-amber-500">.ai</span></h1>
                <p className="text-xs text-muted-foreground tracking-widest">STATUS DASHBOARD</p>
              </div>
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-primary">Status Metrics Dashboard</CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground mt-1">Administrator Access Only</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email Address</Label>
                <Input id="admin-email" type="email" placeholder="admin@quickapp.ai" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Input id="admin-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Signing in...' : 'Sign In'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Dashboard View ---
  return (
    <div className="min-h-screen relative" style={{ background: '#1976d2' }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 1px, transparent 1px)`, backgroundSize: '50px 50px, 25px 25px' }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={quickappLogo} alt="QuickApp.AI" className="h-10 w-10 rounded-lg shadow" />
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white">QuickApp<span className="text-amber-400">.ai</span> Status Dashboard</h1>
              <p className="text-xs text-white/60">
                {dbName && `Database: ${dbName} · `}
                {lastRefreshed && `Refreshed: ${lastRefreshed.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={isRefreshing} className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>

        <div className="px-4 md:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {metrics.map((metric, idx) => (
              <Card key={idx} className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">{metric.icon}</div>
                  <p className={`text-2xl md:text-3xl font-bold ${metric.color || 'text-foreground'}`}>{metric.value}</p>
                  <p className="text-sm font-medium text-foreground">{metric.label}</p>
                  {metric.description && <p className="text-xs text-muted-foreground">{metric.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusDashboard;
