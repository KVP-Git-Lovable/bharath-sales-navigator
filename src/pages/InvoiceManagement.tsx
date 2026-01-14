import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, ListOrdered, Settings2, Building2 } from "lucide-react";
import InvoiceTemplateSelector from "@/components/invoice/InvoiceTemplateSelector";
import AllInvoicesList from "@/components/invoice/AllInvoicesList";
import InvoiceDisplaySettings from "@/components/invoice/InvoiceDisplaySettings";
import CompanySettings from "@/components/invoice/CompanySettings";
import { Layout } from "@/components/Layout";

export default function InvoiceManagement() {
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
            <h1 className="text-2xl font-bold">Invoice Management</h1>
            <p className="text-muted-foreground">
              Create and manage GST invoices with templates
            </p>
          </div>
        </div>

        <Tabs defaultValue="display-settings" className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="display-settings" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Display Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Template</span>
              <span className="sm:hidden">Template</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Company Info</span>
              <span className="sm:hidden">Company</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4" />
              <span className="hidden sm:inline">All Invoices</span>
              <span className="sm:hidden">Invoices</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="display-settings">
            <InvoiceDisplaySettings />
          </TabsContent>

          <TabsContent value="template">
            <InvoiceTemplateSelector />
          </TabsContent>

          <TabsContent value="company">
            <CompanySettings />
          </TabsContent>

          <TabsContent value="invoices">
            <AllInvoicesList />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
