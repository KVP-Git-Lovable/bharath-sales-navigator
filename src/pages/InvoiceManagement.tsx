import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, ListOrdered, Settings2, Loader2, PackageCheck } from "lucide-react";
import InvoiceTemplateSelector from "@/components/invoice/InvoiceTemplateSelector";
import AllInvoicesList from "@/components/invoice/AllInvoicesList";
import InvoiceDisplaySettings from "@/components/invoice/InvoiceDisplaySettings";
import BulkInvoiceDownload from "@/components/invoice/BulkInvoiceDownload";
import { Layout } from "@/components/Layout";
import { useAdminAccess } from "@/hooks/useAdminAccess";

export default function InvoiceManagement() {
  const { hasAdminAccess, loading } = useAdminAccess();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

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
              Template
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4" />
              <span className="hidden sm:inline">All Invoices</span>
              <span className="sm:hidden">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="bulk-download" className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Bulk Download</span>
              <span className="sm:hidden">Bulk</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="display-settings">
            <InvoiceDisplaySettings />
          </TabsContent>

          <TabsContent value="template">
            <InvoiceTemplateSelector />
          </TabsContent>

          <TabsContent value="invoices">
            <AllInvoicesList />
          </TabsContent>

          <TabsContent value="bulk-download">
            <BulkInvoiceDownload />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
