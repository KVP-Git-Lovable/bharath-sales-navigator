import { Layout } from "@/components/Layout";
import { GamificationManagement } from "@/components/GamificationManagement";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function GamificationAdmin() {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (userRole !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <AdminPageHeader 
          title="Gamification Admin"
          subtitle="Configure badges, rewards, and engagement features"
        />
        <GamificationManagement />
      </div>
    </Layout>
  );
}
