import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ShoppingCart, Search, Filter, Calendar, ChevronDown, ChevronRight, IndianRupee, Store, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  rate: number;
  total: number;
  unit: string;
}

interface Order {
  id: string;
  retailer_id: string;
  retailer_name: string;
  total_amount: number;
  status: string;
  order_date: string | null;
  created_at: string;
  invoice_number: string | null;
  is_credit_order: boolean;
  payment_method: string | null;
  items?: OrderItem[];
}

interface Props {
  distributorId: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  dispatched: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

interface DateGroup {
  date: string;
  formattedDate: string;
  orders: Order[];
  totalValue: number;
  orderCount: number;
}

interface RetailerGroup {
  retailerId: string;
  retailerName: string;
  orders: Order[];
  totalValue: number;
  products: { productName: string; quantity: number; unit: string; total: number }[];
}

interface ProductGroup {
  productName: string;
  unit: string;
  totalQuantity: number;
  totalValue: number;
  retailers: { retailerName: string; quantity: number; total: number }[];
}

export function DistributorSecondaryOrders({ distributorId }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOrders();
  }, [distributorId]);

  useEffect(() => {
    applyFilters();
  }, [orders, searchTerm, statusFilter, dateFilter]);

  const loadOrders = async () => {
    try {
      // First get distributor details for matching
      const { data: distData } = await supabase
        .from('distributors')
        .select('id, name')
        .eq('id', distributorId)
        .single();

      const distributorName = distData?.name || '';
      
      // Get retailer IDs from multiple sources:
      // 1. distributor_retailer_mappings table
      // 2. retailers.distributor_id field
      // 3. retailers.parent_name matching distributor name
      
      const retailerIdSet = new Set<string>();
      
      // From distributor_retailer_mappings
      const { data: mappedRetailers } = await supabase
        .from('distributor_retailer_mappings')
        .select('retailer_id')
        .eq('distributor_id', distributorId);
      
      mappedRetailers?.forEach(r => retailerIdSet.add(r.retailer_id));
      
      // From retailers table (direct link or parent_name match)
      if (distributorName) {
        const { data: linkedRetailers } = await supabase
          .from('retailers')
          .select('id')
          .or(`distributor_id.eq.${distributorId},parent_name.ilike.${distributorName}`);
        
        linkedRetailers?.forEach(r => retailerIdSet.add(r.id));
      }
      
      const retailerIds = Array.from(retailerIdSet);

      let allOrders: Order[] = [];

      // Orders directly linked to this distributor
      const { data: directOrders, error: directError } = await supabase
        .from('orders')
        .select('id, retailer_id, retailer_name, total_amount, status, order_date, created_at, invoice_number, is_credit_order, payment_method')
        .eq('distributor_id', distributorId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (directError) throw directError;
      if (directOrders) allOrders = [...directOrders];

      // Also get orders from linked retailers (regardless of distributor_id on order)
      if (retailerIds.length > 0) {
        const { data: retailerOrders, error: retailerError } = await supabase
          .from('orders')
          .select('id, retailer_id, retailer_name, total_amount, status, order_date, created_at, invoice_number, is_credit_order, payment_method')
          .in('retailer_id', retailerIds)
          .order('created_at', { ascending: false })
          .limit(500);

        if (retailerError) throw retailerError;
        if (retailerOrders) {
          const existingIds = new Set(allOrders.map(o => o.id));
          retailerOrders.forEach(o => {
            if (!existingIds.has(o.id)) {
              allOrders.push(o);
            }
          });
        }
      }

      // Fetch order items for all orders
      if (allOrders.length > 0) {
        const orderIds = allOrders.map(o => o.id);
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('id, order_id, product_name, quantity, rate, total, unit')
          .in('order_id', orderIds);

        if (orderItems) {
          const itemsByOrder = orderItems.reduce((acc, item) => {
            if (!acc[item.order_id]) acc[item.order_id] = [];
            acc[item.order_id].push(item);
            return acc;
          }, {} as Record<string, OrderItem[]>);

          allOrders = allOrders.map(order => ({
            ...order,
            items: itemsByOrder[order.id] || []
          }));
        }
      }

      allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setOrders(allOrders);
    } catch (error: any) {
      toast.error("Failed to load orders: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.retailer_name?.toLowerCase().includes(search) ||
        order.invoice_number?.toLowerCase().includes(search) ||
        order.items?.some(item => item.product_name.toLowerCase().includes(search))
      );
    }

    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(order => {
        const orderDate = order.order_date || order.created_at.split('T')[0];
        return orderDate === dateFilter;
      });
    }

    setFilteredOrders(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("");
  };

  // Group orders by date
  const groupedByDate: DateGroup[] = (() => {
    const dateMap = new Map<string, Order[]>();
    
    filteredOrders.forEach(order => {
      const date = order.order_date || order.created_at.split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, []);
      }
      dateMap.get(date)!.push(order);
    });

    return Array.from(dateMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, orders]) => ({
        date,
        formattedDate: format(new Date(date), 'EEEE, MMM d, yyyy'),
        orders,
        totalValue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        orderCount: orders.length
      }));
  })();

  // Group orders by retailer for a date
  const getRetailerGroups = (orders: Order[]): RetailerGroup[] => {
    const retailerMap = new Map<string, RetailerGroup>();

    orders.forEach(order => {
      const key = order.retailer_id;
      if (!retailerMap.has(key)) {
        retailerMap.set(key, {
          retailerId: order.retailer_id,
          retailerName: order.retailer_name,
          orders: [],
          totalValue: 0,
          products: []
        });
      }
      const group = retailerMap.get(key)!;
      group.orders.push(order);
      group.totalValue += order.total_amount || 0;

      // Aggregate products
      order.items?.forEach(item => {
        const existingProduct = group.products.find(p => p.productName === item.product_name);
        if (existingProduct) {
          existingProduct.quantity += item.quantity;
          existingProduct.total += item.total;
        } else {
          group.products.push({
            productName: item.product_name,
            quantity: item.quantity,
            unit: item.unit,
            total: item.total
          });
        }
      });
    });

    return Array.from(retailerMap.values()).sort((a, b) => b.totalValue - a.totalValue);
  };

  // Group orders by product for a date (packing list view)
  const getProductGroups = (orders: Order[]): ProductGroup[] => {
    const productMap = new Map<string, ProductGroup>();

    orders.forEach(order => {
      order.items?.forEach(item => {
        const key = item.product_name;
        if (!productMap.has(key)) {
          productMap.set(key, {
            productName: item.product_name,
            unit: item.unit,
            totalQuantity: 0,
            totalValue: 0,
            retailers: []
          });
        }
        const group = productMap.get(key)!;
        group.totalQuantity += item.quantity;
        group.totalValue += item.total;

        const existingRetailer = group.retailers.find(r => r.retailerName === order.retailer_name);
        if (existingRetailer) {
          existingRetailer.quantity += item.quantity;
          existingRetailer.total += item.total;
        } else {
          group.retailers.push({
            retailerName: order.retailer_name,
            quantity: item.quantity,
            total: item.total
          });
        }
      });
    });

    return Array.from(productMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  };

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  // Summary stats
  const totalAmount = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingCount = filteredOrders.filter(o => o.status === 'pending').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{filteredOrders.length}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">₹{(totalAmount/1000).toFixed(1)}K</p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Secondary Orders ({filteredOrders.length})
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3 w-3" />
              Filters
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by retailer, invoice or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-40"
              />
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {groupedByDate.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No secondary orders found
            </p>
          ) : (
            <div className="space-y-3">
              {groupedByDate.map(dateGroup => (
                <Collapsible 
                  key={dateGroup.date}
                  open={expandedDates.has(dateGroup.date)}
                  onOpenChange={() => toggleDate(dateGroup.date)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        {expandedDates.has(dateGroup.date) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{dateGroup.formattedDate}</p>
                          <p className="text-xs text-muted-foreground">
                            {dateGroup.orderCount} order{dateGroup.orderCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          {dateGroup.totalValue.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-2">
                    <div className="border rounded-lg p-3">
                      <Tabs defaultValue="retailer" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-3">
                          <TabsTrigger value="retailer" className="gap-1 text-xs">
                            <Store className="h-3 w-3" />
                            By Retailer
                          </TabsTrigger>
                          <TabsTrigger value="product" className="gap-1 text-xs">
                            <Package className="h-3 w-3" />
                            By Product
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="retailer" className="space-y-3 mt-0">
                          {getRetailerGroups(dateGroup.orders).map(retailer => (
                            <div key={retailer.retailerId} className="border rounded-lg p-3 bg-background">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-sm">{retailer.retailerName}</span>
                                </div>
                                <span className="font-semibold text-sm">
                                  ₹{retailer.totalValue.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="space-y-1 pl-6">
                                {retailer.products.map((product, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{product.productName}</span>
                                    <span>
                                      {product.quantity} {product.unit} • ₹{product.total.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </TabsContent>

                        <TabsContent value="product" className="space-y-3 mt-0">
                          {getProductGroups(dateGroup.orders).map((product, idx) => (
                            <div key={idx} className="border rounded-lg p-3 bg-background">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-sm">{product.productName}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-sm">
                                    {product.totalQuantity} {product.unit}
                                  </span>
                                  <p className="text-xs text-muted-foreground">
                                    ₹{product.totalValue.toLocaleString('en-IN')}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-1 pl-6">
                                {product.retailers.map((retailer, ridx) => (
                                  <div key={ridx} className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{retailer.retailerName}</span>
                                    <span>
                                      {retailer.quantity} {product.unit} • ₹{retailer.total.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
