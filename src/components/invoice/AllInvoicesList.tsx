import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Edit, MessageCircle, BookOpen, Archive, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { fetchAndGenerateInvoice } from "@/utils/invoiceGenerator";
import { autoSendInvoiceWhatsApp } from "@/utils/autoSendInvoice";
import EditInvoiceDialog from "./EditInvoiceDialog";
import JSZip from "jszip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface Invoice {
  id: string;
  invoice_number: string;
  created_at: string;
  retailer_id: string;
  total_amount: number;
  retailer_name?: string;
}

export default function AllInvoicesList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<{ orderId: string; invoiceNumber: string } | null>(null);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Fetch all orders from all users
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch retailer names for each order
      const orders: any[] = data || [];
      if (orders && orders.length > 0) {
        const retailerIds = [...new Set(orders.map((o: any) => o.retailer_id).filter(Boolean))];
        const { data: retailers } = await supabase
          .from("retailers")
          .select("id, name")
          .in("id", retailerIds);

        const retailerMap = new Map((retailers as any[])?.map((r: any) => [r.id, r.name]) || []);

        const invoicesWithRetailers = orders.map((order: any) => ({
          ...order,
          retailer_name: retailerMap.get(order.retailer_id) || "Unknown Retailer",
        })) as Invoice[];

        setInvoices(invoicesWithRetailers);
      } else {
        setInvoices([]);
      }
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (orderId: string, invoiceNumber: string) => {
    setDownloadingId(orderId);
    try {
      const { blob } = await fetchAndGenerateInvoice(orderId);
      
      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Invoice downloaded successfully!");
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast.error(error.message || "Failed to download invoice");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendWhatsApp = async (orderId: string, invoiceNumber: string) => {
    setSendingWhatsAppId(orderId);
    try {
      // Generate and upload the PDF first so the correct invoice is available
      const { blob } = await fetchAndGenerateInvoice(orderId);
      const fileName = `${invoiceNumber || orderId}.pdf`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(filePath, blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      const { data: urlData } = supabase.storage
        .from("invoices")
        .getPublicUrl(filePath);

      // Now send via WhatsApp with explicit PDF URL + invoice number template variable
      await autoSendInvoiceWhatsApp({ invoiceNumber, pdfUrl: urlData.publicUrl });
      toast.success("Invoice sent via WhatsApp!");
    } catch (error: any) {
      console.error("Error sending invoice via WhatsApp:", error);
      toast.error("Failed to send invoice via WhatsApp");
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  const handleUploadAndOpenLink = async (orderId: string, invoiceNumber: string) => {
    setUploadingId(orderId);
    try {
      const { blob } = await fetchAndGenerateInvoice(orderId);
      const fileName = `${invoiceNumber || orderId}.pdf`;
      const filePath = `public/${fileName}`;

      // Upload to invoices bucket (upsert to overwrite if exists)
      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(filePath, blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("invoices")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      window.open(publicUrl, "_blank", "noopener,noreferrer");
      toast.success("Invoice PDF link opened!");
    } catch (error: any) {
      console.error("Error uploading invoice:", error);
      toast.error(error.message || "Failed to generate invoice link");
    } finally {
      setUploadingId(null);
    }
  };

  // Filter invoices by selected date range (inclusive). Date-only comparison.
  const filteredInvoices = invoices.filter((inv) => {
    if (!fromDate && !toDate) return true;
    const created = new Date(inv.created_at);
    const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    if (fromDate) {
      const f = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      if (createdDay < f) return false;
    }
    if (toDate) {
      const t = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      if (createdDay > t) return false;
    }
    return true;
  });

  const handleBulkDownloadZip = async () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices in selected period");
      return;
    }
    setBulkDownloading(true);
    setBulkProgress({ done: 0, total: filteredInvoices.length });
    try {
      const zip = new JSZip();
      const BATCH = 4;
      let done = 0;
      const usedNames = new Set<string>();
      for (let i = 0; i < filteredInvoices.length; i += BATCH) {
        const batch = filteredInvoices.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async (inv) => {
            const { blob } = await fetchAndGenerateInvoice(inv.id);
            let name = `${inv.invoice_number || inv.id}.pdf`;
            let n = 1;
            while (usedNames.has(name)) {
              name = `${inv.invoice_number || inv.id}_${n++}.pdf`;
            }
            usedNames.add(name);
            return { name, blob };
          }),
        );
        for (const r of results) {
          if (r.status === "fulfilled") {
            zip.file(r.value.name, r.value.blob);
          } else {
            console.error("Bulk invoice failure:", r.reason);
          }
        }
        done += batch.length;
        setBulkProgress({ done, total: filteredInvoices.length });
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const fromLabel = fromDate ? format(fromDate, "yyyy-MM-dd") : "all";
      const toLabel = toDate ? format(toDate, "yyyy-MM-dd") : "all";
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoices_${fromLabel}_to_${toLabel}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filteredInvoices.length} invoices as ZIP`);
    } catch (err: any) {
      console.error("Bulk ZIP download failed:", err);
      toast.error(err?.message || "Failed to build ZIP");
    } finally {
      setBulkDownloading(false);
      setBulkProgress(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Invoices</CardTitle>
        <p className="text-sm text-muted-foreground">
          View and download all generated invoices from all users
        </p>
      </CardHeader>
      <CardContent>
        {/* Period filter + bulk download (additive) */}
        <div className="flex flex-wrap items-end gap-3 mb-4 p-3 rounded-md border bg-muted/30">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("w-[170px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "dd MMM yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={setFromDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("w-[170px] justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "dd MMM yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={setToDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          {(fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromDate(undefined);
                setToDate(undefined);
              }}
            >
              Clear
            </Button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? "" : "s"} in period
            </span>
            <Button
              size="sm"
              onClick={handleBulkDownloadZip}
              disabled={bulkDownloading || filteredInvoices.length === 0}
            >
              {bulkDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {bulkProgress ? `Generating ${bulkProgress.done}/${bulkProgress.total}` : "Preparing..."}
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Download Invoices
                </>
              )}
            </Button>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {invoices.length === 0 ? "No invoices found" : "No invoices in selected period"}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Retailer Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number || "N/A"}
                    </TableCell>
                    <TableCell>{invoice.retailer_name}</TableCell>
                    <TableCell>
                      {new Date(invoice.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{invoice.total_amount?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingInvoice({ orderId: invoice.id, invoiceNumber: invoice.invoice_number })}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={downloadingId === invoice.id}
                          onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
                        >
                          {downloadingId === invoice.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          disabled={sendingWhatsAppId === invoice.id}
                          onClick={() => handleSendWhatsApp(invoice.id, invoice.invoice_number)}
                          title="Send invoice via WhatsApp"
                        >
                          {sendingWhatsAppId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MessageCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          disabled={uploadingId === invoice.id}
                          onClick={() => handleUploadAndOpenLink(invoice.id, invoice.invoice_number)}
                          title="Open public invoice PDF link"
                        >
                          {uploadingId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <BookOpen className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {editingInvoice && (
        <EditInvoiceDialog
          orderId={editingInvoice.orderId}
          invoiceNumber={editingInvoice.invoiceNumber}
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
          onSaved={fetchInvoices}
        />
      )}
    </Card>
  );
}
