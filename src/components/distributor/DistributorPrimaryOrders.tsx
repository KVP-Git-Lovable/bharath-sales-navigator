import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package,
  Calendar,
  Truck,
  Clock,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PrimaryOrder {
  id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_terms: string | null;
  notes: string | null;
  dispatch_reference: string | null;
  transporter_name: string | null;
  vehicle_number: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  line_total: number;
}

interface DistributorPrimaryOrdersProps {
  distributorId: string;
}

export const DistributorPrimaryOrders = ({ distributorId }: DistributorPrimaryOrdersProps) => {
  const [orders, setOrders] = useState<PrimaryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PrimaryOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [distributorId]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('primary_orders')
        .select('id, order_number, order_date, expected_delivery_date, actual_delivery_date, status, subtotal, discount_amount, tax_amount, total_amount, payment_terms, notes, dispatch_reference, transporter_name, vehicle_number, created_at')
        .eq('distributor_id', distributorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderItems = async (orderId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('primary_order_items')
        .select('id, product_name, variant_name, sku, quantity, unit, unit_price, discount_percent, tax_percent, line_total')
        .eq('order_id', orderId);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error: any) {
      console.error('Error loading order items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleViewOrder = (order: PrimaryOrder) => {
    setSelectedOrder(order);
    loadOrderItems(order.id);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      confirmed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      dispatched: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      in_transit: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      partially_delivered: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusIcon = (status: string) => {
    if (['draft', 'submitted'].includes(status)) return <Clock className="w-4 h-4" />;
    if (['confirmed', 'processing'].includes(status)) return <Package className="w-4 h-4" />;
    if (['dispatched', 'in_transit'].includes(status)) return <Truck className="w-4 h-4" />;
    if (status === 'delivered') return <CheckCircle className="w-4 h-4" />;
    if (status === 'cancelled') return <XCircle className="w-4 h-4" />;
    return <Package className="w-4 h-4" />;
  };

  // Calculate summary stats
  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingOrders = orders.filter(o => ['submitted', 'confirmed', 'processing'].includes(o.status)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">₹{(totalValue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No primary orders yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card 
              key={order.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{order.order_number}</h4>
                        <Badge className={`${getStatusColor(order.status)} text-xs`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(order.order_date), 'dd MMM')}
                        </span>
                        {order.expected_delivery_date && (
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            ETA: {format(new Date(order.expected_delivery_date), 'dd MMM')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="font-semibold">₹{order.total_amount?.toLocaleString('en-IN')}</p>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Order Date</p>
                  <p className="font-medium">{format(new Date(selectedOrder.order_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status.replace('_', ' ')}
                  </Badge>
                </div>
                {selectedOrder.expected_delivery_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Delivery</p>
                    <p className="font-medium">{format(new Date(selectedOrder.expected_delivery_date), 'dd MMM yyyy')}</p>
                  </div>
                )}
                {selectedOrder.actual_delivery_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Delivered On</p>
                    <p className="font-medium">{format(new Date(selectedOrder.actual_delivery_date), 'dd MMM yyyy')}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-2 text-sm">Items</h4>
                {loadingItems ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Product</TableHead>
                          <TableHead className="text-xs text-right">Qty</TableHead>
                          <TableHead className="text-xs text-right">Price</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">
                              <div>
                                <p>{item.product_name}</p>
                                {item.variant_name && (
                                  <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-right">
                              {item.quantity} {item.unit}
                            </TableCell>
                            <TableCell className="text-sm text-right">
                              ₹{item.unit_price?.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-sm text-right font-medium">
                              ₹{item.line_total?.toLocaleString('en-IN')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-48 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{selectedOrder.subtotal?.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-₹{selectedOrder.discount_amount?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-1 border-t">
                    <span>Total</span>
                    <span>₹{selectedOrder.total_amount?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Dispatch Info */}
              {selectedOrder.dispatch_reference && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium mb-2">Dispatch Details</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Reference</p>
                      <p>{selectedOrder.dispatch_reference}</p>
                    </div>
                    {selectedOrder.transporter_name && (
                      <div>
                        <p className="text-xs text-muted-foreground">Transporter</p>
                        <p>{selectedOrder.transporter_name}</p>
                      </div>
                    )}
                    {selectedOrder.vehicle_number && (
                      <div>
                        <p className="text-xs text-muted-foreground">Vehicle</p>
                        <p>{selectedOrder.vehicle_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
