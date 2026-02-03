import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface UserOrderSummary {
  full_name: string;
  total_order_value: number;
}

interface SKUData {
  product_name: string;
  quantity_sold: number;
  revenue: number;
  unit: string;
}

interface UserProductivitySummary {
  full_name: string;
  productivity_percentage: number;
  productive_visits: number;
  total_visits: number;
}

interface ReportSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  dateRange: { from: Date; to: Date };
  allUsersSummary: {
    retailers: number;
    beats: number;
    products: number;
    totalKg: number;
  } | null;
  orderSummaryData: UserOrderSummary[];
  skuData: SKUData[];
  productivityData: UserProductivitySummary[];
}

export const ReportSummaryDialog = ({
  open,
  onClose,
  dateRange,
  allUsersSummary,
  orderSummaryData,
  skuData,
  productivityData
}: ReportSummaryDialogProps) => {
  
  const generateSummary = (): string => {
    const lines: string[] = [];
    
    // Date range
    const fromStr = dateRange.from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const toStr = dateRange.to.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    lines.push(`📊 Supervisor Report Summary (${fromStr} - ${toStr})`);
    lines.push('');
    
    // Summary - All Users
    if (allUsersSummary) {
      lines.push('📈 Overall Summary (All Users):');
      lines.push(`• Total Retailers: ${allUsersSummary.retailers}`);
      lines.push(`• Total Beats: ${allUsersSummary.beats}`);
      lines.push(`• Total Products: ${allUsersSummary.products}`);
      lines.push(`• Total Quantity: ${allUsersSummary.totalKg.toFixed(2)} KG`);
      lines.push('');
    }
    
    // Total Order Summary
    if (orderSummaryData.length > 0) {
      const totalOrderValue = orderSummaryData.reduce((sum, u) => sum + u.total_order_value, 0);
      lines.push('🛒 Order Summary:');
      lines.push(`• Total Users: ${orderSummaryData.length}`);
      lines.push(`• Total Order Value: ₹${totalOrderValue.toLocaleString('en-IN')}`);
      
      // Top performer in orders
      const topOrderUser = orderSummaryData[0];
      if (topOrderUser) {
        lines.push(`• Top Performer: ${topOrderUser.full_name} (₹${topOrderUser.total_order_value.toLocaleString('en-IN')})`);
      }
      lines.push('');
    }
    
    // SKU Revenue Summary
    if (skuData.length > 0) {
      const totalRevenue = skuData.reduce((sum, s) => sum + s.revenue, 0);
      const totalKg = skuData.reduce((sum, s) => {
        const unit = (s.unit || '').toLowerCase();
        if (unit === 'grams' || unit === 'g' || unit === 'gram') {
          return sum + s.quantity_sold / 1000;
        }
        return sum + s.quantity_sold;
      }, 0);
      
      lines.push('📦 SKU Revenue Summary:');
      lines.push(`• Total SKUs: ${skuData.length}`);
      lines.push(`• Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`);
      lines.push(`• Total Quantity: ${totalKg.toFixed(2)} KG`);
      
      // Top selling product
      const topProduct = skuData.reduce((max, s) => s.revenue > max.revenue ? s : max, skuData[0]);
      if (topProduct) {
        lines.push(`• Top Product: ${topProduct.product_name} (₹${topProduct.revenue.toLocaleString('en-IN')})`);
      }
      lines.push('');
    }
    
    // Productivity Summary
    if (productivityData.length > 0) {
      const totalProductive = productivityData.reduce((sum, p) => sum + p.productive_visits, 0);
      const totalVisits = productivityData.reduce((sum, p) => sum + p.total_visits, 0);
      const avgProductivity = totalVisits > 0 ? (totalProductive / totalVisits) * 100 : 0;
      
      lines.push('⚡ Productivity Summary:');
      lines.push(`• Total Productive Visits: ${totalProductive} / ${totalVisits}`);
      lines.push(`• Overall Productivity: ${avgProductivity.toFixed(1)}%`);
      
      // Top productive user
      const topProductiveUser = productivityData.reduce((max, p) => 
        p.productivity_percentage > max.productivity_percentage ? p : max, productivityData[0]
      );
      if (topProductiveUser) {
        lines.push(`• Top Performer: ${topProductiveUser.full_name} (${topProductiveUser.productivity_percentage.toFixed(1)}%)`);
      }
      lines.push('');
    }
    
    // Top Performers Section
    lines.push('🏆 Top Performers:');
    
    if (orderSummaryData.length > 0) {
      lines.push(`• Highest Orders: ${orderSummaryData[0].full_name}`);
    }
    
    if (skuData.length > 0) {
      const topSKU = skuData.reduce((max, s) => s.revenue > max.revenue ? s : max, skuData[0]);
      lines.push(`• Best Selling Product: ${topSKU.product_name}`);
    }
    
    if (productivityData.length > 0) {
      const topProductiveUser = productivityData.reduce((max, p) => 
        p.productivity_percentage > max.productivity_percentage ? p : max, productivityData[0]
      );
      lines.push(`• Most Productive: ${topProductiveUser.full_name}`);
    }
    
    return lines.join('\n');
  };

  const summary = generateSummary();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Report Summary
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed p-4 bg-muted rounded-lg">
            {summary}
          </pre>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
