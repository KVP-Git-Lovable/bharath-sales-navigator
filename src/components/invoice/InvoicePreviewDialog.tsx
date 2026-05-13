import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchAndGenerateInvoice } from "@/utils/invoiceGenerator";

interface InvoicePreviewDialogProps {
  orderId: string;
  invoiceNumber?: string | null;
  triggerLabel?: string;
  iconOnly?: boolean;
  className?: string;
}

/**
 * Opens an inline preview of the order invoice PDF inside a dialog,
 * with an explicit Download button. Does NOT auto-download.
 */
export const InvoicePreviewDialog = ({
  orderId,
  invoiceNumber,
  triggerLabel = "View Invoice",
  iconOnly = false,
  className,
}: InvoicePreviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [resolvedNumber, setResolvedNumber] = useState<string | null>(invoiceNumber || null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    (async () => {
      setLoading(true);
      try {
        const { blob, invoiceNumber: num } = await fetchAndGenerateInvoice(orderId);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        createdUrl = url;
        setPdfBlob(blob);
        setPdfUrl(url);
        if (num) setResolvedNumber(num);
      } catch (err: any) {
        console.error("Invoice preview failed", err);
        toast.error(err?.message || "Failed to load invoice");
        setOpen(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, orderId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPdfUrl(null);
      setPdfBlob(null);
    }
  }, [open]);

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resolvedNumber || "invoice"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          title={triggerLabel}
          className={cn(iconOnly && "h-8 w-8 p-0", className)}
        >
          <FileText className={cn("h-4 w-4", !iconOnly && "mr-2")} />
          {!iconOnly && triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-3 border-b flex flex-row items-center justify-between gap-2 space-y-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Invoice {resolvedNumber ? `· ${resolvedNumber}` : ""}
          </DialogTitle>
          <Button size="sm" onClick={handleDownload} disabled={!pdfBlob || loading}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogHeader>
        <div className="flex-1 bg-muted/30 min-h-[70vh] relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating invoice…
            </div>
          )}
          {pdfUrl && (
            <object
              data={pdfUrl}
              type="application/pdf"
              className="w-full h-full min-h-[70vh]"
            >
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Inline PDF preview is blocked by your browser.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(pdfUrl, "_blank")}>
                    Open in new tab
                  </Button>
                  <Button size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>
              </div>
            </object>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};