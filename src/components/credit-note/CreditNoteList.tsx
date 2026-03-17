import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { generateCreditNotePDF, CreditNoteItem } from "@/utils/creditNoteGenerator";

export default function CreditNoteList() {
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("credit_notes")
        .select("*, credit_note_items(*)")
        .order("created_at", { ascending: false });
      if (!error && data) setCreditNotes(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleDownload = async (cn: any) => {
    setDownloadingId(cn.id);
    try {
      // Fetch company
      const { data: companies } = await supabase.from("companies").select("*").limit(1);
      const company = companies?.[0] || {};

      // Fetch retailer
      let retailer: any = {};
      if (cn.retailer_id) {
        const { data } = await supabase.from("retailers").select("name, address, phone, gst_number").eq("id", cn.retailer_id).single();
        retailer = data || {};
      }

      const items: CreditNoteItem[] = (cn.credit_note_items || []).map((item: any) => ({
        product_name: item.product_name,
        hsn_code: item.hsn_code || "",
        unit: item.unit || "Piece",
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        total: Number(item.total) || 0,
        taxable_amount: Number(item.taxable_amount) || 0,
        sgst_amount: Number(item.sgst_amount) || 0,
        cgst_amount: Number(item.cgst_amount) || 0,
        original_invoice_number: item.original_invoice_number || "",
        barcode: item.barcode,
      }));

      const referenceInvoices = [...new Set(items.map((i) => i.original_invoice_number).filter(Boolean))];

      const blob = await generateCreditNotePDF({
        creditNoteNumber: cn.credit_note_number,
        creditNoteDate: new Date(cn.credit_note_date).toLocaleDateString("en-GB"),
        referenceInvoices,
        company,
        retailer,
        items,
        reason: cn.reason || "other",
        reasonNotes: cn.reason_notes,
        subTotal: Number(cn.sub_total) || 0,
        sgstTotal: Number(cn.sgst_total) || 0,
        cgstTotal: Number(cn.cgst_total) || 0,
        totalAmount: Number(cn.total_amount) || 0,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${cn.credit_note_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Credit note downloaded");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to download credit note");
    } finally {
      setDownloadingId(null);
    }
  };

  const statusColor = (s: string) => {
    if (s === "issued") return "default";
    if (s === "cancelled") return "destructive";
    return "secondary";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (creditNotes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2" />
        <p>No credit notes yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {creditNotes.map((cn) => (
        <Card key={cn.id}>
          <CardContent className="flex items-center justify-between py-3 px-4">
            <div>
              <p className="font-medium text-sm">{cn.credit_note_number}</p>
              <p className="text-xs text-muted-foreground">
                {cn.retailer_name} • {new Date(cn.credit_note_date).toLocaleDateString("en-GB")}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusColor(cn.status)}>{cn.status}</Badge>
                <span className="text-sm font-semibold">₹{Math.round(Number(cn.total_amount))}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(cn)}
              disabled={downloadingId === cn.id}
            >
              {downloadingId === cn.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              PDF
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
