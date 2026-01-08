import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Palette } from "lucide-react";
import CompanySettings from "@/components/invoice/CompanySettings";
import HeaderBrandingSettings from "@/components/invoice/HeaderBrandingSettings";
import { Layout } from "@/components/Layout";

export default function CompanyProfile() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin-controls")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Company Profile</h1>
            <p className="text-muted-foreground">
              Manage company details and branding settings
            </p>
          </div>
        </div>

        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Header Branding
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <HeaderBrandingSettings />
          </TabsContent>

          <TabsContent value="details">
            <CompanySettings />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
