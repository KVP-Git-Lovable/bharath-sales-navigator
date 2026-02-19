import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogOut, RefreshCw, Users, ShoppingCart, Store, MapPin, Package, Calendar, Shield, Activity, Database, Clock } from 'lucide-react';
import quickappLogo from "@/assets/quickapp-logo-full-yellow-black.png";

interface MetricCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
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

  const fetchMetrics = async () => {
    setIsRefreshing(true);
    try {
      const [
        profilesRes,
        activeUsersRes,
        ordersRes,
        retailersRes,
        productsRes,
        visitsRes,
        pendingLeavesRes,
        territoriesRes,
        beatsRes,
        attendanceRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_status', 'active'),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('retailers').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('visits').select('id', { count: 'exact', head: true }),
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('territories').select('id', { count: 'exact', head: true }),
        supabase.from('beats').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('id', { count: 'exact', head: true }),
      ]);

      setMetrics([
        { label: 'Total Users', value: profilesRes.count ?? 0, icon: <Users className="h-6 w-6" />, description: 'All registered users' },
        { label: 'Active Users', value: activeUsersRes.count ?? 0, icon: <Activity className="h-6 w-6" />, description: 'Currently active users' },
        { label: 'Total Orders', value: ordersRes.count ?? 0, icon: <ShoppingCart className="h-6 w-6" />, description: 'All orders placed' },
        { label: 'Total Retailers', value: retailersRes.count ?? 0, icon: <Store className="h-6 w-6" />, description: 'Registered retailers' },
        { label: 'Total Products', value: productsRes.count ?? 0, icon: <Package className="h-6 w-6" />, description: 'Products in catalog' },
        { label: 'Total Visits', value: visitsRes.count ?? 0, icon: <MapPin className="h-6 w-6" />, description: 'All recorded visits' },
        { label: 'Pending Leaves', value: pendingLeavesRes.count ?? 0, icon: <Calendar className="h-6 w-6" />, description: 'Awaiting approval' },
        { label: 'Territories', value: territoriesRes.count ?? 0, icon: <Shield className="h-6 w-6" />, description: 'Active territories' },
        { label: 'Total Beats', value: beatsRes.count ?? 0, icon: <Database className="h-6 w-6" />, description: 'Configured beats' },
        { label: 'Attendance Records', value: attendanceRes.count ?? 0, icon: <Clock className="h-6 w-6" />, description: 'Total attendance entries' },
      ]);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({ title: 'Error', description: 'Failed to fetch metrics', variant: 'destructive' });
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

      // Verify System Administrator role
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
  };

  // --- Login View ---
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{ background: '#1976d2', minHeight: '100vh' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px, 25px 25px',
          }}
        />
        <Card className="w-full max-w-md relative z-10 shadow-2xl border-white/20 bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <img src={quickappLogo} alt="QuickApp.AI" className="h-16 w-16 rounded-xl shadow-lg" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  QuickApp<span className="text-amber-500">.ai</span>
                </h1>
                <p className="text-xs text-muted-foreground tracking-widest">STATUS DASHBOARD</p>
              </div>
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-primary">Status Metrics Dashboard</CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground mt-1">
                Administrator Access Only
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email Address</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@quickapp.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Dashboard View ---
  return (
    <div className="min-h-screen relative" style={{ background: '#1976d2' }}>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px, 25px 25px',
        }}
      />
      <div className="relative z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={quickappLogo} alt="QuickApp.AI" className="h-10 w-10 rounded-lg shadow" />
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white">
                QuickApp<span className="text-amber-400">.ai</span> Status Dashboard
              </h1>
              {lastRefreshed && (
                <p className="text-xs text-white/60">
                  Last refreshed: {lastRefreshed.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMetrics}
              disabled={isRefreshing}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="px-4 md:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {metrics.map((metric, idx) => (
              <Card key={idx} className="bg-white/95 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    {metric.icon}
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{metric.value.toLocaleString()}</p>
                  <p className="text-sm font-medium text-foreground">{metric.label}</p>
                  {metric.description && (
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  )}
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
