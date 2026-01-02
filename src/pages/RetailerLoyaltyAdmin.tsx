import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, Gift } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoyaltyParameterConfig } from "@/components/loyalty/LoyaltyParameterConfig";
import { GiftMasterManagement } from "@/components/loyalty/GiftMasterManagement";
import { LoyaltyPointsDashboard } from "@/components/loyalty/LoyaltyPointsDashboard";
import { GiftSubscriptionsManagement } from "@/components/loyalty/GiftSubscriptionsManagement";
import { GiftRedemptionsManagement } from "@/components/loyalty/GiftRedemptionsManagement";
import { LoyaltyAnalytics } from "@/components/loyalty/LoyaltyAnalytics";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RetailerLoyaltyAdmin() {
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
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-100 rounded-lg">
                <Gift className="h-8 w-8 text-pink-600" />
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl">
                  Retailer Loyalty Program
                </CardTitle>
                <CardDescription className="mt-1">
                  Manage loyalty plans, earning parameters, gifts, and redemptions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Management Tabs */}
        <Tabs defaultValue="parameters" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="gifts">Gifts</TabsTrigger>
            <TabsTrigger value="points">Points</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="space-y-4">
            <LoyaltyParameterConfig />
          </TabsContent>

          <TabsContent value="gifts" className="space-y-4">
            <GiftMasterManagement />
          </TabsContent>

          <TabsContent value="points" className="space-y-4">
            <LoyaltyPointsDashboard />
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <GiftSubscriptionsManagement />
          </TabsContent>

          <TabsContent value="redemptions" className="space-y-4">
            <GiftRedemptionsManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <LoyaltyAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
