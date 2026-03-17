import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelectedItem } from "./RetailerInvoiceList";

interface CreditNoteReviewProps {
  items: SelectedItem[];
  reason: string;
  reasonNotes: string;
}

export default function CreditNoteReview({ items, reason, reasonNotes }: CreditNoteReviewProps) {
  const subTotal = items.reduce((sum, i) => sum + i.returnQuantity * i.rate, 0);
  const sgst = subTotal * 0.025;
  const cgst = subTotal * 0.025;
  const total = subTotal + sgst + cgst;

  const groupedByInvoice = items.reduce((acc, item) => {
    if (!acc[item.invoiceNumber]) acc[item.invoiceNumber] = [];
    acc[item.invoiceNumber].push(item);
    return acc;
  }, {} as Record<string, SelectedItem[]>);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Items to Credit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(groupedByInvoice).map(([inv, invItems]) => (
            <div key={inv}>
              <p className="text-xs font-semibold text-muted-foreground mb-1">From Invoice: {inv}</p>
              {invItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm py-1 border-b last:border-0">
                  <div>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      {item.returnQuantity} × ₹{item.rate.toFixed(2)}
                    </span>
                  </div>
                  <span className="font-medium">₹{(item.returnQuantity * item.rate).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sub Total</span>
            <span>₹{subTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>SGST (2.5%)</span>
            <span>₹{sgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>CGST (2.5%)</span>
            <span>₹{cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t pt-2">
            <span>Total Credit</span>
            <span className="text-destructive">₹{Math.round(total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Reason:</span>
            <Badge variant="outline">{reason.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Badge>
          </div>
          {reasonNotes && <p className="text-sm text-muted-foreground">{reasonNotes}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
