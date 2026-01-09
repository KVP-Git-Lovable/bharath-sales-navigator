import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface BeatDetail {
  beat_name: string;
  visits_count: number;
  orders_count: number;
  revenue: number;
}

interface RetailerDetail {
  id: string;
  name: string;
  beat_name: string;
  orders_count: number;
  revenue: number;
  pending_amount: number;
}

interface OrderDetail {
  id: string;
  order_date: string;
  retailer_name: string;
  total_amount: number;
  status: string;
}

interface ProductDetail {
  product_name: string;
  unit: string;
  quantity: number;
  revenue: number;
}

interface PendingPaymentDetail {
  retailer_name: string;
  order_date: string;
  order_id: string;
  pending_amount: number;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUsers: string[];
  dateRange: { from: Date; to: Date };
}

// Beat Details Dialog
export const BeatDetailsDialog = ({
  open,
  onOpenChange,
  selectedUsers,
  dateRange,
  data,
  isLoading
}: DialogProps & { data: BeatDetail[]; isLoading: boolean }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Beat-wise Performance</DialogTitle>
          <DialogDescription>
            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')} • {selectedUsers.length} user(s)
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beat Name</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No beat data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((beat, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{beat.beat_name}</TableCell>
                    <TableCell className="text-right">{beat.visits_count}</TableCell>
                    <TableCell className="text-right">{beat.orders_count}</TableCell>
                    <TableCell className="text-right font-semibold">₹{beat.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Retailer Details Dialog
export const RetailerDetailsDialog = ({
  open,
  onOpenChange,
  selectedUsers,
  dateRange,
  data,
  isLoading
}: DialogProps & { data: RetailerDetail[]; isLoading: boolean }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Retailer-wise Performance</DialogTitle>
          <DialogDescription>
            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')} • {selectedUsers.length} user(s)
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Retailer Name</TableHead>
                <TableHead>Beat</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No retailer data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((retailer) => (
                  <TableRow key={retailer.id}>
                    <TableCell className="font-medium">{retailer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{retailer.beat_name || '-'}</TableCell>
                    <TableCell className="text-right">{retailer.orders_count}</TableCell>
                    <TableCell className="text-right font-semibold">₹{retailer.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {retailer.pending_amount > 0 ? (
                        <span className="text-red-600">₹{retailer.pending_amount.toLocaleString()}</span>
                      ) : (
                        <span className="text-green-600">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Order Details Dialog
export const OrderDetailsDialog = ({
  open,
  onOpenChange,
  selectedUsers,
  dateRange,
  data,
  isLoading
}: DialogProps & { data: OrderDetail[]; isLoading: boolean }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')} • {selectedUsers.length} user(s)
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Retailer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No order data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{format(new Date(order.order_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-medium">{order.retailer_name}</TableCell>
                    <TableCell className="text-right font-semibold">₹{order.total_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={order.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Product Breakdown Dialog
export const ProductBreakdownDialog = ({
  open,
  onOpenChange,
  selectedUsers,
  dateRange,
  data,
  isLoading
}: DialogProps & { data: ProductDetail[]; isLoading: boolean }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Product-wise Breakdown (Quantity)</DialogTitle>
          <DialogDescription>
            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')} • {selectedUsers.length} user(s)
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No product data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((product, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.unit || 'pcs'}</TableCell>
                    <TableCell className="text-right">{product.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">₹{product.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Pending Payments Dialog
export const PendingPaymentsDialog = ({
  open,
  onOpenChange,
  selectedUsers,
  dateRange,
  data,
  isLoading
}: DialogProps & { data: PendingPaymentDetail[]; isLoading: boolean }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Pending Payments</DialogTitle>
          <DialogDescription>
            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')} • {selectedUsers.length} user(s)
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Retailer</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead className="text-right">Pending Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No pending payments
                  </TableCell>
                </TableRow>
              ) : (
                data.map((payment, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{payment.retailer_name}</TableCell>
                    <TableCell>{format(new Date(payment.order_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      ₹{payment.pending_amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
