import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchAndGenerateInvoice } from "@/utils/invoiceGenerator";
import * as pdfjsLib from "pdfjs-dist";
// Vite worker import
// @ts-ignore
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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
  const [resolvedNumber, setResolvedNumber] = useState<string | null>(invoiceNumber || null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { blob, invoiceNumber: num } = await fetchAndGenerateInvoice(orderId);
        if (cancelled) return;
        setPdfBlob(blob);
        if (num) setResolvedNumber(num);

        // Render via pdf.js into canvases (works inside sandboxed iframes)
        const buf = await blob.arrayBuffer();
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";
        const containerWidth = container.clientWidth - 32; // padding
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const scale = Math.min(2, Math.max(1, containerWidth / viewport.width));
          const scaled = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = scaled.width;
          canvas.height = scaled.height;
          canvas.className = "shadow-md rounded bg-white mx-auto block mb-4 max-w-full h-auto";
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
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
    };
  }, [open, orderId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPdfBlob(null);
      if (containerRef.current) containerRef.current.innerHTML = "";
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
        <div className="flex-1 bg-muted/30 min-h-[70vh] relative overflow-y-auto">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground gap-2 z-10 bg-muted/30">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating invoice…
            </div>
          )}
          <div ref={containerRef} className="p-4" />
        </div>
      </DialogContent>
    </Dialog>
  );
};