import { Menu, X, LogOut, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useCallback, memo, useRef } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { NetworkBadge } from "@/components/NetworkBadge";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { useConnectivity } from "@/hooks/useConnectivity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from 'react-i18next';
import { useActivePerformanceModule } from "@/hooks/useActivePerformanceModule";
import { useCompanyData } from "@/hooks/useCompanyData";
import { Building2 as DefaultLogoIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  UserCheck, 
  Car, 
  Route, 
  Users,
  Gift,
  CreditCard,
  Trophy,
  Target,
  TrendingUp,
  Shield,
  Store,
  Package,
  Paintbrush,
  Factory,
  MapPin,
  Navigation2,
  Building2,
  Trash2,
  ShoppingCart,
  BarChart3,
} from "lucide-react";

// Memoized Navbar component for better performance
export const Navbar = memo(() => {
  const { signOut, userProfile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const connectivityStatus = useConnectivity();
  const { t } = useTranslation('common');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isGamificationActive } = useActivePerformanceModule();
  const { headerName, headerLogo } = useCompanyData();
  
  // Company name and logo - no hardcoded fallbacks, uses cache
  const companyName = headerName || '';
  const companyLogo = headerLogo;
  
  // Hide back button on home/dashboard
  const showBackButton = location.pathname !== '/dashboard' && location.pathname !== '/';

  // Build navigation items dynamically based on active module
  const navigationItems = useMemo(() => {
    const baseItems = [
      { icon: UserCheck, label: t('nav.attendance'), href: "/attendance", color: "from-blue-500 to-blue-600" },
      { icon: Car, label: t('nav.myVisit'), href: "/visits/retailers", color: "from-green-500 to-green-600" },
      { icon: Store, label: t('nav.allRetailers'), href: "/my-retailers", color: "from-emerald-500 to-emerald-600" },
      { icon: Target, label: "My Target", href: "/my-target", color: "from-cyan-500 to-cyan-600" },
      { icon: TrendingUp, label: "Performance", href: "/performance-dashboard", color: "from-emerald-500 to-emerald-600" },
      { icon: BarChart3, label: t('nav.analytics'), href: "/analytics", color: "from-violet-500 to-violet-600" },
      { icon: Building2, label: "Institutional Sales", href: "/institutional-sales", color: "from-indigo-500 to-indigo-600" },
      { icon: Factory, label: "Distributor Master", href: "/distributor-master", color: "from-cyan-500 to-cyan-600" },
      { icon: ShoppingCart, label: "Primary Orders", href: "/primary-orders", color: "from-rose-500 to-rose-600" },
      { icon: MapPin, label: t('nav.territories'), href: "/territories-and-distributors", color: "from-amber-500 to-amber-600" },
      { icon: Navigation2, label: t('nav.gpsTrack'), href: "/gps-track", color: "from-purple-500 to-purple-600" },
      { icon: Users, label: t('nav.myBeats'), href: "/my-beats", color: "from-orange-500 to-orange-600" },
      { icon: Trophy, label: "Competition Master", href: "/competition-master", color: "from-slate-500 to-slate-600" },
      { icon: Gift, label: t('nav.schemes'), href: "/schemes", color: "from-pink-500 to-pink-600" },
      { icon: CreditCard, label: t('nav.expenses'), href: "/expenses", color: "from-indigo-500 to-indigo-600" },
    ];

    // Add Leaderboard only if gamification is active
    if (isGamificationActive) {
      baseItems.push({ icon: Trophy, label: "Leader board", href: "/leaderboard", color: "from-yellow-500 to-yellow-600" });
    }

    // Add remaining items
    baseItems.push(
      { icon: Target, label: "My Competency", href: "/competency-dashboard", color: "from-indigo-500 to-indigo-600" },
      { icon: Trash2, label: "Recycle Bin", href: "/recycle-bin", color: "from-rose-500 to-rose-600" },
    );

    return baseItems;
  }, [t, isGamificationActive]);

  // Admin-only navigation items
  const adminNavigationItems = [
    { icon: Shield, label: t('nav.adminPanel'), href: "/admin-controls", color: "from-emerald-500 to-emerald-600" },
  ];

  // Get user display name and initials
  const displayName = userProfile?.full_name || userProfile?.username || 'User';
  const userInitials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const handleMenuItemClick = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Handle back navigation with debounce to prevent double-click issues
  const isNavigatingRef = useRef(false);
  const handleBackClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double navigation
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to dashboard if no history
      navigate('/dashboard');
    }
    
    // Reset after navigation completes
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 300);
  }, [navigate]);

  return (
    <>
      {/* Navbar - positioned below safe area top */}
      <nav className="navbar-safe-area bg-gradient-primary text-white shadow-lg z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            {showBackButton && (
                <button
                  onClick={handleBackClick}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white"
                  title="Go back"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              
              <NavLink to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-white">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden bg-white p-0.5">
                  {companyLogo ? (
                    <img 
                      src={companyLogo} 
                      alt={companyName || 'Company'} 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <DefaultLogoIcon className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h1 className="text-base font-semibold text-white">{companyName}</h1>
                    <SyncStatusIndicator />
                  </div>
                  <div className="flex items-center gap-0.5 text-white">
                    {connectivityStatus === 'online' ? (
                      <Wifi className="h-2.5 w-2.5 opacity-80" />
                    ) : connectivityStatus === 'offline' ? (
                      <>
                        <WifiOff className="h-2.5 w-2.5 opacity-80" />
                        <p className="text-[10px] opacity-80">No Connection</p>
                      </>
                    ) : null}
                  </div>
                </div>
              </NavLink>
            </div>
            
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Spacer for navbar height */}
      <div className="navbar-spacer" />

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {/* User Profile Section */}
          <SheetHeader className="pb-3 border-b bg-gradient-primary text-primary-foreground rounded-lg -mx-6 -mt-6 px-6 pt-4 mb-6 pr-12">
            <div className="flex items-start justify-between gap-3">
              <button 
                onClick={() => {
                  navigate('/profile');
                  handleMenuItemClick();
                }}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-12 w-12 border-2 border-primary-foreground/30">
                  <AvatarImage src={userProfile?.profile_picture_url || ""} />
                  <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <SheetTitle className="text-lg font-bold text-primary-foreground truncate w-full text-left">
                    {displayName}
                  </SheetTitle>
                  {userRole === 'admin' && (
                    <div className="flex items-center gap-1.5 text-xs opacity-90 text-primary-foreground mt-1">
                      <Shield className="h-3.5 w-3.5" />
                      <span className="font-medium">Admin</span>
                    </div>
                  )}
                </div>
              </button>
              <div className="flex items-center flex-shrink-0">
                <button
                  onClick={() => {
                    signOut();
                    handleMenuItemClick();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-primary-foreground" />
                  <span className="text-sm text-primary-foreground font-medium">Logout</span>
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* Admin Controls Section */}
          {userRole === 'admin' && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Admin Controls</h3>
              <div className="grid grid-cols-3 gap-3">
                {adminNavigationItems.map((item) => (
                  <NavLink 
                    key={item.href}
                    to={item.href}
                    onClick={handleMenuItemClick}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} shadow-md`}>
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Section */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Navigation</h3>
            <div className="grid grid-cols-3 gap-3">
              {navigationItems.map((item) => (
                <NavLink 
                  key={item.href}
                  to={item.href}
                  onClick={handleMenuItemClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} shadow-md`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});

Navbar.displayName = 'Navbar';