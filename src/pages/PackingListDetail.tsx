import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Package, 
  ArrowLeft, 
  Calendar, 
  Truck, 
  CheckCircle2, 
  Clock, 
  PackageCheck,
  User,
  Send,
  Printer,
  ShoppingCart,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePackingList, PackingList, PackingListItem, PackingListAssignment } from '@/hooks/usePackingList';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/Layout';

interface Agent {
  id: string;
  full_name: string;
}

interface Distributor {
  id: string;
  name: string;
}

export default function PackingListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    loading, 
    fetchPackingListDetail, 
    updatePackingListStatus,
    updatePickedQuantity,
    createAssignment
  } = usePackingList();

  const [packingList, setPackingList] = useState<PackingList | null>(null);
  const [items, setItems] = useState<PackingListItem[]>([]);
  const [assignments, setAssignments] = useState<PackingListAssignment[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('products');
  const [distributors, setDistributors] = useState<Distributor[]>([]);

  // Assignment dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Load distributors for display
  useEffect(() => {
    const loadDistributors = async () => {
      const { data } = await supabase
        .from('distributors')
        .select('id, name');
      if (data) setDistributors(data);
    };
    loadDistributors();
  }, []);

  // Load packing list details
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      const result = await fetchPackingListDetail(id);
      if (result) {
        setPackingList(result.packingList);
        setItems(result.items);
        setAssignments(result.assignments);
        setOrders(result.orders);
      }
    };

    loadData();
  }, [id, fetchPackingListDetail]);

  // Load agents for assignment
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name');
        
        if (data) {
          const agentList: Agent[] = data
            .filter((p: any) => p.full_name)
            .map((p: any) => ({ id: p.id, full_name: p.full_name || '' }));
          setAgents(agentList);
        }
      } catch (err) {
        console.error('Error loading agents:', err);
      }
    };

    loadAgents();
  }, []);

  const handlePickedQtyChange = async (itemId: string, pickedQty: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const shortQty = Math.max(0, item.ordered_qty - pickedQty);
    const success = await updatePickedQuantity(itemId, pickedQty, shortQty);
    
    if (success) {
      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, picked_qty: pickedQty, short_qty: shortQty } : i
      ));
    }
  };

  const handleMarkAsPacked = async () => {
    if (!packingList) return;

    // Check if all items have been picked
    const allPicked = items.every(item => item.picked_qty > 0 || item.short_qty > 0);
    if (!allPicked) {
      toast({
        title: "Cannot mark as packed",
        description: "Please enter picked quantities for all items",
        variant: "destructive"
      });
      return;
    }

    const success = await updatePackingListStatus(packingList.id, 'packed');
    if (success) {
      setPackingList(prev => prev ? { ...prev, status: 'packed' } : prev);
    }
  };

  const handleDispatch = async () => {
    if (!packingList) return;

    if (assignments.length === 0) {
      toast({
        title: "Cannot dispatch",
        description: "Please assign an agent before dispatching",
        variant: "destructive"
      });
      return;
    }

    const success = await updatePackingListStatus(packingList.id, 'dispatched');
    if (success) {
      setPackingList(prev => prev ? { ...prev, status: 'dispatched' } : prev);
    }
  };

  const handleAssignAgent = async () => {
    if (!packingList || !selectedAgentId) return;

    const totalQty = items.reduce((sum, i) => sum + i.ordered_qty, 0);
    const totalValue = packingList.total_value;

    const result = await createAssignment(
      packingList.id,
      selectedAgentId,
      null, // van_id
      [], // beat_ids
      packingList.total_orders,
      totalQty,
      totalValue
    );

    if (result) {
      setAssignments(prev => [...prev, result]);
      setShowAssignDialog(false);
      setSelectedAgentId('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      packed: 'bg-blue-100 text-blue-800',
      dispatched: 'bg-amber-100 text-amber-800',
      completed: 'bg-green-100 text-green-800'
    };
    return <Badge className={styles[status] || styles.draft}>{status.toUpperCase()}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-5 w-5 text-muted-foreground" />;
      case 'packed': return <PackageCheck className="h-5 w-5 text-blue-600" />;
      case 'dispatched': return <Truck className="h-5 w-5 text-amber-600" />;
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const getDistributorName = (distributorId: string | null) => {
    if (!distributorId) return 'Direct Sales';
    const dist = distributors.find(d => d.id === distributorId);
    return dist?.name || 'Unknown';
  };

  // Calculate progress
  const totalOrdered = items.reduce((sum, i) => sum + i.ordered_qty, 0);
  const totalPicked = items.reduce((sum, i) => sum + i.picked_qty, 0);
  const pickingProgress = totalOrdered > 0 ? (totalPicked / totalOrdered) * 100 : 0;

  if (loading || !packingList) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background print:bg-white pb-24">
        {/* Header */}
        <div className="bg-card border-b sticky top-0 z-10 print:static">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="print:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                {getStatusIcon(packingList.status)}
                <div>
                  <h1 className="text-xl font-semibold">{packingList.packing_list_number}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Delivery: {format(new Date(packingList.delivery_date), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{getDistributorName(packingList.distributor_id)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              {getStatusBadge(packingList.status)}
              <Button variant="outline" size="icon" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{packingList.total_orders}</p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{packingList.total_items}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">₹{packingList.total_value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Value</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{assignments.length}</p>
              <p className="text-xs text-muted-foreground">Agents Assigned</p>
            </CardContent>
          </Card>
        </div>

        {/* Picking Progress */}
        {packingList.status === 'draft' && (
          <div className="px-4 pb-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Picking Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {totalPicked} / {totalOrdered} items
                  </span>
                </div>
                <Progress value={pickingProgress} className="h-2" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 pb-4 print:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="products" className="flex-1">
                <Package className="h-4 w-4 mr-2" />
                Products
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex-1">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="assignments" className="flex-1">
                <User className="h-4 w-4 mr-2" />
                Agents
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="mt-4 space-y-3">
              {items.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">{item.unit || 'units'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Ordered</p>
                        <p className="font-semibold">{item.ordered_qty}</p>
                      </div>
                    </div>
                    
                    {packingList.status === 'draft' && (
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                        <div>
                          <label className="text-xs text-muted-foreground">Picked Qty</label>
                          <Input
                            type="number"
                            min={0}
                            max={item.ordered_qty}
                            value={item.picked_qty}
                            onChange={(e) => handlePickedQtyChange(item.id, parseInt(e.target.value) || 0)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Short Qty</label>
                          <div className="mt-1 h-10 flex items-center px-3 bg-muted rounded-md">
                            <span className={item.short_qty > 0 ? 'text-destructive font-medium' : ''}>
                              {item.short_qty}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {packingList.status !== 'draft' && (
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Picked</p>
                          <p className="font-semibold text-green-600">{item.picked_qty}</p>
                        </div>
                        {item.short_qty > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">Short</p>
                            <p className="font-semibold text-destructive">{item.short_qty}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-4 space-y-3">
              {orders.map((order: any) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{order.retailers?.name || 'Unknown Retailer'}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.retailers?.beats?.beat_name || 'No Beat'}
                        </p>
                      </div>
                      <Badge variant="outline">{order.delivery_status || 'pending'}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        {(order.items as any[])?.length || 0} items
                      </span>
                      <span className="font-semibold">₹{order.total_amount?.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="mt-4 space-y-3">
              {assignments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No agents assigned yet</p>
                    <Button onClick={() => setShowAssignDialog(true)}>
                      Assign Agent
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {assignments.map(assignment => {
                    const agent = agents.find(a => a.id === assignment.agent_id);
                    return (
                      <Card key={assignment.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{agent?.full_name || 'Unknown Agent'}</p>
                              <p className="text-sm text-muted-foreground">
                                {assignment.order_count} orders • {assignment.total_load_qty} items
                              </p>
                            </div>
                            <Badge variant={assignment.status === 'completed' ? 'default' : 'outline'}>
                              {assignment.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowAssignDialog(true)}
                  >
                    Add Another Agent
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Print View - Products Only */}
        <div className="hidden print:block px-4">
          <h2 className="text-lg font-semibold mb-4">Product List</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Ordered</th>
                <th className="text-right py-2">Picked</th>
                <th className="text-right py-2">Short</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.product_name}</td>
                  <td className="text-right py-2">{item.ordered_qty}</td>
                  <td className="text-right py-2">{item.picked_qty}</td>
                  <td className="text-right py-2">{item.short_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t print:hidden">
          {packingList.status === 'draft' && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowAssignDialog(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Assign Agent
              </Button>
              <Button 
                className="flex-1"
                onClick={handleMarkAsPacked}
              >
                <PackageCheck className="h-4 w-4 mr-2" />
                Mark as Packed
              </Button>
            </div>
          )}
          
          {packingList.status === 'packed' && (
            <Button 
              className="w-full"
              onClick={handleDispatch}
            >
              <Send className="h-4 w-4 mr-2" />
              Dispatch for Delivery
            </Button>
          )}

          {packingList.status === 'dispatched' && (
            <div className="text-center py-2">
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <Truck className="h-5 w-5" />
                <span className="font-medium">In Transit</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Waiting for delivery completion
              </p>
            </div>
          )}

          {packingList.status === 'completed' && (
            <div className="text-center py-2">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Delivery Completed</span>
              </div>
            </div>
          )}
        </div>

        {/* Assign Agent Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Delivery Agent</DialogTitle>
              <DialogDescription>
                Select an agent to handle this delivery
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <label className="text-sm font-medium">Select Agent</label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignAgent}
                disabled={!selectedAgentId}
              >
                Assign Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
