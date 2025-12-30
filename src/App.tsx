import React, { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleBasedAuthPage } from "@/components/auth/RoleBasedAuthPage";
import { useMasterDataCache } from "@/hooks/useMasterDataCache";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PermissionRequestModal } from "@/components/auth/PermissionRequestModal";
import { hasRequestedPermissions } from "@/utils/permissionManager";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import Index from "./pages/Index";

// Lazy load feature pages
const BeatPlanningFeature = lazy(() => import("./pages/features/BeatPlanningFeature").then(module => ({ default: module.BeatPlanningFeature })));
const RetailerManagementFeature = lazy(() => import("./pages/features/RetailerManagementFeature").then(module => ({ default: module.RetailerManagementFeature })));
const VisitSchedulingFeature = lazy(() => import("./pages/features/VisitSchedulingFeature").then(module => ({ default: module.VisitSchedulingFeature })));
const SalesAnalyticsFeature = lazy(() => import("./pages/features/SalesAnalyticsFeature").then(module => ({ default: module.SalesAnalyticsFeature })));
const PerformanceTrackingFeature = lazy(() => import("./pages/features/PerformanceTrackingFeature").then(module => ({ default: module.PerformanceTrackingFeature })));
const GrowthAnalyticsFeature = lazy(() => import("./pages/features/GrowthAnalyticsFeature").then(module => ({ default: module.GrowthAnalyticsFeature })));
import { LandingPage } from "./pages/LandingPage";
import { VisitPlanner } from "./pages/VisitPlanner";
import { BeatPlanning } from "./pages/BeatPlanning";
import { MyVisits } from "./pages/MyVisits";
import { VisitDetail } from "./pages/VisitDetail";
import { OrderEntry } from "./pages/OrderEntry";
import { Cart } from "./pages/Cart";
import { CreateBeat } from "./pages/CreateBeat";
import { BeatAnalytics } from "./pages/BeatAnalytics";
import { TodaySummary } from "./pages/TodaySummary";
import { AddRetailer } from "./pages/AddRetailer";
import { AddDistributor } from "./pages/AddDistributor";
import { AddSuperStockist } from "./pages/AddSuperStockist";
import { AddBeat } from "./pages/AddBeat";
import AddRecords from "./pages/AddRecords";
import Attendance from "./pages/Attendance";

import Leaderboard from "./pages/Leaderboard";
import Performance from "./pages/Performance";
import SalesCoach from "./pages/SalesCoach";
import Analytics from "./pages/Analytics";
import { Schemes } from "./pages/Schemes";
import { AdminDashboard } from "./pages/AdminDashboard";
import AdminControls from "./pages/AdminControls";
import FeatureManagement from "./pages/FeatureManagement";
import ProductManagementPage from "./pages/ProductManagementPage";
import AttendanceManagement from "./pages/AttendanceManagement";
import ActivitiesInfo from "./pages/ActivitiesInfo";
import BadgesInfo from "./pages/BadgesInfo";
import FeedbackManagement from "./pages/FeedbackManagement";
import CompetitionMaster from "./pages/CompetitionMaster";
import CompetitorDetail from "./pages/CompetitorDetail";
import NotFound from "./pages/NotFound";
import { MyRetailers } from "./pages/MyRetailers";
import UserRoles from "./pages/UserRoles";
import BrandingRequests from "./pages/BrandingRequests";
import { MyBeats } from "./pages/MyBeats";
import { BeatDetail } from "./pages/BeatDetail";
import EmployeeOnboarding from "./pages/EmployeeOnboarding";
import Employee360 from "./pages/Employee360";
import Vendors from "./pages/Vendors";
import { RetailerDetail } from "./pages/RetailerDetail";
import TerritoriesAndDistributors from "./pages/TerritoriesAndDistributors";
import Operations from "./pages/Operations";
import DistributorMaster from "./pages/DistributorMaster";
import DistributorMapping from "./pages/DistributorMapping";
import GPSTrack from "./pages/GPSTrack";
import GPSTrackManagement from "./pages/GPSTrackManagement";
import RetailManagement from "./pages/RetailManagement";
import VanSalesManagement from "./pages/VanSalesManagement";

import AdminExpenseManagement from "./pages/AdminExpenseManagement";
import MyExpenses from "./pages/MyExpenses";
import UserProfile from "./pages/UserProfile";
import CompleteProfile from "./pages/CompleteProfile";
import GamificationAdmin from "./pages/GamificationAdmin";
import InvoiceManagement from "./pages/InvoiceManagement";
import GamePolicy from "./pages/GamePolicy";
import CreditManagement from "./pages/CreditManagement";
import RetailerLoyaltyAdmin from "./pages/RetailerLoyaltyAdmin";
import RetailerLoyalty from "./pages/RetailerLoyalty";
import SecurityManagement from "./pages/SecurityManagement";
import PushContentSetup from "./pages/admin/PushContentSetup";
import PerformanceModuleAdmin from "./pages/admin/PerformanceModuleAdmin";
import MyTargets from "./pages/MyTargets";
import TeamTargets from "./pages/TeamTargets";
import PendingPaymentsAll from "./pages/PendingPaymentsAll";
import { TargetSetupMaster } from "./components/admin/TargetSetupMaster";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// Master data cache initializer with permission request
const MasterDataCacheInitializer = () => {
  const { cacheAllMasterData, isOnline } = useMasterDataCache();
  const [showPermissions, setShowPermissions] = React.useState(false);
  
  useEffect(() => {
    // Check if permissions have been requested
    if (!hasRequestedPermissions()) {
      // Wait a bit for the app to settle, then show permission modal
      const timer = setTimeout(() => {
        setShowPermissions(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  useEffect(() => {
    if (isOnline) {
      cacheAllMasterData();
    }
  }, [isOnline, cacheAllMasterData]);
  
  return (
    <PermissionRequestModal 
      open={showPermissions} 
      onComplete={() => setShowPermissions(false)} 
    />
  );
};

const App = () => {
  // Error boundary for the entire app
  const [hasError, setHasError] = React.useState(false);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AppContent hasError={hasError} />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Separate component to use routing hooks
const AppContent = ({ hasError }: { hasError: boolean }) => {
  // Enable Android back button handling
  useAndroidBackButton();

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">Please refresh the page to try again</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MasterDataCacheInitializer />
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<RoleBasedAuthPage />} />
              <Route path="/auth/complete-profile" element={<CompleteProfile />} />
              <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="/admin-controls" element={<ProtectedRoute><AdminControls /></ProtectedRoute>} />
              <Route path="/feature-management" element={<ProtectedRoute><FeatureManagement /></ProtectedRoute>} />
              <Route path="/push-content-setup" element={<ProtectedRoute><PushContentSetup /></ProtectedRoute>} />
              <Route path="/user_roles" element={<ProtectedRoute><UserRoles /></ProtectedRoute>} />
              <Route path="/security-management" element={<ProtectedRoute><SecurityManagement /></ProtectedRoute>} />
              <Route path="/product-management" element={<ProtectedRoute><ProductManagementPage /></ProtectedRoute>} />
              <Route path="/attendance-management" element={<ProtectedRoute><AttendanceManagement /></ProtectedRoute>} />
              <Route path="/feedback-management" element={<ProtectedRoute><FeedbackManagement /></ProtectedRoute>} />
              <Route path="/competition-master" element={<ProtectedRoute><CompetitionMaster /></ProtectedRoute>} />
              <Route path="/competition-master/:competitorId" element={<ProtectedRoute><CompetitorDetail /></ProtectedRoute>} />
              <Route path="/retailer/:id" element={<RetailerDetail />} />
              <Route path="/territories-and-distributors" element={<ProtectedRoute><TerritoriesAndDistributors /></ProtectedRoute>} />
              <Route path="/admin-expense-management" element={<ProtectedRoute><AdminExpenseManagement /></ProtectedRoute>} />
              <Route path="/operations" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
              <Route path="/distributor-master" element={<ProtectedRoute><DistributorMaster /></ProtectedRoute>} />
              <Route path="/distributor-mapping" element={<ProtectedRoute><DistributorMapping /></ProtectedRoute>} />
              <Route path="/visit-planner" element={<ProtectedRoute><VisitPlanner /></ProtectedRoute>} />
              <Route path="/visits" element={<ProtectedRoute><BeatPlanning /></ProtectedRoute>} />
              <Route path="/beat-planning" element={<ProtectedRoute><BeatPlanning /></ProtectedRoute>} />
              <Route path="/visits/retailers" element={<ProtectedRoute><MyVisits /></ProtectedRoute>} />
              <Route path="/order-entry" element={<ProtectedRoute><OrderEntry /></ProtectedRoute>} />
              <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
              <Route path="/create-beat" element={<ProtectedRoute><CreateBeat /></ProtectedRoute>} />
              <Route path="/my-beats" element={<ProtectedRoute><MyBeats /></ProtectedRoute>} />
              <Route path="/beat/:id" element={<ProtectedRoute><BeatDetail /></ProtectedRoute>} />
              <Route path="/visit/:id" element={<ProtectedRoute><VisitDetail /></ProtectedRoute>} />
              <Route path="/beat-analytics" element={<ProtectedRoute><BeatAnalytics /></ProtectedRoute>} />
              <Route path="/today-summary" element={<ProtectedRoute><TodaySummary /></ProtectedRoute>} />
              <Route path="/add-retailer" element={<ProtectedRoute><AddRetailer /></ProtectedRoute>} />
              <Route path="/add-distributor" element={<ProtectedRoute><AddDistributor /></ProtectedRoute>} />
              <Route path="/add-super-stockist" element={<ProtectedRoute><AddSuperStockist /></ProtectedRoute>} />
              <Route path="/add-records" element={<ProtectedRoute><AddRecords /></ProtectedRoute>} />
              <Route path="/add-beat" element={<ProtectedRoute><AddBeat /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><MyExpenses /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="/game-policy" element={<ProtectedRoute><GamePolicy /></ProtectedRoute>} />
              <Route path="/activities-info" element={<ProtectedRoute><ActivitiesInfo /></ProtectedRoute>} />
              <Route path="/badges-info" element={<ProtectedRoute><BadgesInfo /></ProtectedRoute>} />
              <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
              <Route path="/sales-coach" element={<ProtectedRoute><SalesCoach /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/schemes" element={<ProtectedRoute><Schemes /></ProtectedRoute>} />
              <Route path="/my-retailers" element={<ProtectedRoute><MyRetailers /></ProtectedRoute>} />
              <Route path="/branding-requests" element={<ProtectedRoute><BrandingRequests /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
              <Route path="/gps-track" element={<ProtectedRoute><GPSTrack /></ProtectedRoute>} />
              <Route path="/gps-track-management" element={<ProtectedRoute><GPSTrackManagement /></ProtectedRoute>} />
              <Route path="/retail-management" element={<ProtectedRoute><RetailManagement /></ProtectedRoute>} />
              <Route path="/van-sales-management" element={<ProtectedRoute><VanSalesManagement /></ProtectedRoute>} />
              <Route path="/gamification-admin" element={<ProtectedRoute><GamificationAdmin /></ProtectedRoute>} />
              <Route path="/credit-management" element={<ProtectedRoute><CreditManagement /></ProtectedRoute>} />
              <Route path="/retailer-loyalty-admin" element={<ProtectedRoute><RetailerLoyaltyAdmin /></ProtectedRoute>} />
              <Route path="/retailer-loyalty" element={<ProtectedRoute><RetailerLoyalty /></ProtectedRoute>} />
              <Route path="/invoice-management" element={<ProtectedRoute><InvoiceManagement /></ProtectedRoute>} />
              <Route path="/pending-payments-all" element={<ProtectedRoute><PendingPaymentsAll /></ProtectedRoute>} />
              <Route path="/admin/performance-module" element={<ProtectedRoute><PerformanceModuleAdmin /></ProtectedRoute>} />
              <Route path="/my-targets" element={<ProtectedRoute><MyTargets /></ProtectedRoute>} />
              <Route path="/team-targets" element={<ProtectedRoute><TeamTargets /></ProtectedRoute>} />
              <Route path="/target-setup-master" element={<ProtectedRoute><TargetSetupMaster /></ProtectedRoute>} />
              <Route path="/features/beat-planning" element={<Suspense fallback={<LoadingScreen />}><BeatPlanningFeature /></Suspense>} />
              <Route path="/features/retailer-management" element={<Suspense fallback={<LoadingScreen />}><RetailerManagementFeature /></Suspense>} />
              <Route path="/features/visit-scheduling" element={<Suspense fallback={<LoadingScreen />}><VisitSchedulingFeature /></Suspense>} />
              <Route path="/features/sales-analytics" element={<Suspense fallback={<LoadingScreen />}><SalesAnalyticsFeature /></Suspense>} />
              <Route path="/features/performance-tracking" element={<Suspense fallback={<LoadingScreen />}><PerformanceTrackingFeature /></Suspense>} />
              <Route path="/features/growth-analytics" element={<Suspense fallback={<LoadingScreen />}><GrowthAnalyticsFeature /></Suspense>} />
              <Route path="/onboarding" element={<ProtectedRoute><EmployeeOnboarding /></ProtectedRoute>} />
              <Route path="/employee-profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="/employee/:userId" element={<ProtectedRoute><Employee360 /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
    </>
  );
};

export default App;
