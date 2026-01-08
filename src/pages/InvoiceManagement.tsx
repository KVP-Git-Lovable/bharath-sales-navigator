import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvoiceTemplateSelector from "@/components/invoice/InvoiceTemplateSelector";
import CompanySettings from "@/components/invoice/CompanySettings";
import AllInvoicesList from "@/components/invoice/AllInvoicesList";
import HeaderBrandingSettings from "@/components/invoice/HeaderBrandingSettings";

export default function InvoiceManagement() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin-controls")}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice & Company Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage invoice templates and company information
          </p>
        </div>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding">Header Branding</TabsTrigger>
          <TabsTrigger value="template">Invoice Template</TabsTrigger>
          <TabsTrigger value="company">Company Details</TabsTrigger>
          <TabsTrigger value="invoices">All Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="branding" className="mt-6">
          <HeaderBrandingSettings />
        </TabsContent>
        <TabsContent value="template" className="mt-6">
          <InvoiceTemplateSelector />
        </TabsContent>
        <TabsContent value="company" className="mt-6">
          <CompanySettings />
        </TabsContent>
        <TabsContent value="invoices" className="mt-6">
          <AllInvoicesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
