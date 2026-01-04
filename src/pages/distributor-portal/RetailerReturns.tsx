import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Plus, 
  Package, 
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Trash2,
  PackageCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Retailer {
  id: string;
  name: string;
  address?: string;
}

interface Product {
  id: string;
  name: string;
  unit?: string;
  variants?: { id: string; name: string }[];
}

interface ReturnItem {
  id?: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  reason: string;
  condition: string;
  batch_number?: string;
  notes?: string;
}

interface Return {
  id: string;
  return_number: string;
  return_date: string;
  retailer_id: string;
  retailer_name?: string;
  order_number?: string;
  total_quantity: number;
  total_value: number;
  status: string;
  notes?: string;
  created_at: string;
  items?: ReturnItem[];
}

const RetailerReturns = () => {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // New return form
  const [newReturn, setNewReturn] = useState({
    retailer_id: '',
    order_number: '',
    notes: '',
    items: [] as ReturnItem[],
  });
  const [currentItem, setCurrentItem] = useState<Partial<ReturnItem>>({
    product_id: '',
    product_name: '',
    quantity: 1,
    unit: 'pcs',
    unit_price: 0,
    reason: 'damaged',
    condition: 'good',
    batch_number: '',
    notes: '',
  });

  const distributorId = localStorage.getItem('distributor_id');

  useEffect(() => {
    if (!distributorId) {
      navigate('/distributor-portal/login');
      return;
    }
    loadData();
  }, [distributorId]);

  const loadData = async () => {
    try {
      // Load returns
      const { data: returnsData } = await supabase
        .from('distributor_returns')
        .select('*')
        .eq('distributor_id', distributorId)
        .order('created_at', { ascending: false });

      // Get retailer names
      const retailerIds = [...new Set(returnsData?.map(r => r.retailer_id) || [])];
      let retailerMap = new Map<string, string>();
      if (retailerIds.length > 0) {
        const { data: retailersData } = await supabase
          .from('retailers')
          .select('id, name')
          .in('id', retailerIds);
        retailersData?.forEach(r => retailerMap.set(r.id, r.name));
      }

      setReturns(returnsData?.map(r => ({
        ...r,
        retailer_name: retailerMap.get(r.retailer_id) || 'Unknown',
      })) || []);

      // Load retailers for dropdown
      const { data: allRetailers } = await supabase
        .from('retailers')
        .select('id, name, address')
        .order('name');
      setRetailers(allRetailers || []);

      // Load products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, unit')
        .eq('is_active', true)
        .order('name');
      setProducts(productsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product_id || currentItem.quantity! <= 0) {
      toast.error('Please select a product and quantity');
      return;
    }

    const product = products.find(p => p.id === currentItem.product_id);
    const item: ReturnItem = {
      product_id: currentItem.product_id!,
      product_name: product?.name || currentItem.product_name || '',
      quantity: currentItem.quantity || 1,
      unit: currentItem.unit || product?.unit || 'pcs',
      unit_price: currentItem.unit_price || 0,
      total: (currentItem.quantity || 1) * (currentItem.unit_price || 0),
      reason: currentItem.reason || 'damaged',
      condition: currentItem.condition || 'good',
      batch_number: currentItem.batch_number,
      notes: currentItem.notes,
    };

    setNewReturn(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));

    setCurrentItem({
      product_id: '',
      product_name: '',
      quantity: 1,
      unit: 'pcs',
      unit_price: 0,
      reason: 'damaged',
      condition: 'good',
      batch_number: '',
      notes: '',
    });
  };

  const handleRemoveItem = (index: number) => {
    setNewReturn(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleCreateReturn = async () => {
    if (!newReturn.retailer_id || newReturn.items.length === 0) {
      toast.error('Please select a retailer and add at least one item');
      return;
    }

    setSaving(true);
    try {
      const totalQty = newReturn.items.reduce((sum, i) => sum + i.quantity, 0);
      const totalValue = newReturn.items.reduce((sum, i) => sum + i.total, 0);
      const retailer = retailers.find(r => r.id === newReturn.retailer_id);

      // Create return header
      const { data: returnData, error: returnError } = await supabase
        .from('distributor_returns')
        .insert({
          distributor_id: distributorId,
          retailer_id: newReturn.retailer_id,
          return_number: '', // Auto-generated by trigger
          order_number: newReturn.order_number || null,
          total_quantity: totalQty,
          total_value: totalValue,
          notes: newReturn.notes || null,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const itemsToInsert = newReturn.items.map(item => ({
        return_id: returnData.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total: item.total,
        reason: item.reason,
        condition: item.condition,
        batch_number: item.batch_number || null,
        notes: item.notes || null,
      }));

      await supabase
        .from('distributor_return_items')
        .insert(itemsToInsert);

      // Log transaction
      for (const item of newReturn.items) {
        await supabase
          .from('distributor_inventory_transactions')
          .insert({
            distributor_id: distributorId,
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            transaction_type: 'return_from_retailer',
            quantity: item.quantity, // Positive for returns coming in
            reference_type: 'retailer_return',
            reference_id: returnData.id,
            reference_number: returnData.return_number,
            batch_number: item.batch_number || null,
            unit: item.unit,
            unit_cost: item.unit_price,
            notes: `Return from ${retailer?.name || 'retailer'}: ${item.reason}`,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          });
      }

      toast.success(`Return ${returnData.return_number} created`);
      setShowCreateDialog(false);
      setNewReturn({ retailer_id: '', order_number: '', notes: '', items: [] });
      loadData();
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('Failed to create return');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyReturn = async (addToStock: boolean) => {
    if (!selectedReturn) return;

    setSaving(true);
    try {
      // Get return items
      const { data: items } = await supabase
        .from('distributor_return_items')
        .select('*')
        .eq('return_id', selectedReturn.id);

      if (addToStock && items) {
        // Add good condition items back to inventory
        for (const item of items) {
          if (item.condition === 'good') {
            // Check existing inventory
            const { data: existingInv } = await supabase
              .from('distributor_inventory')
              .select('*')
              .eq('distributor_id', distributorId)
              .eq('product_id', item.product_id)
              .maybeSingle();

            if (existingInv) {
              await supabase
                .from('distributor_inventory')
                .update({
                  quantity: existingInv.quantity + item.quantity,
                  available_quantity: (existingInv.available_quantity || 0) + item.quantity,
                  total_value: (existingInv.quantity + item.quantity) * (existingInv.unit_cost || 0),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingInv.id);
            } else {
              await supabase
                .from('distributor_inventory')
                .insert({
                  distributor_id: distributorId,
                  product_id: item.product_id,
                  product_name: item.product_name,
                  quantity: item.quantity,
                  available_quantity: item.quantity,
                  reserved_quantity: 0,
                  reorder_level: 10,
                  max_stock_level: 1000,
                  unit: item.unit,
                  unit_cost: item.unit_price,
                  total_value: item.quantity * item.unit_price,
                  batch_number: item.batch_number,
                });
            }

            // Mark item as added to stock
            await supabase
              .from('distributor_return_items')
              .update({ added_to_stock: true })
              .eq('id', item.id);
          }
        }
      }

      // Update return status
      await supabase
        .from('distributor_returns')
        .update({
          status: addToStock ? 'added_to_stock' : 'verified',
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', selectedReturn.id);

      toast.success(addToStock ? 'Return verified and stock updated' : 'Return verified');
      setShowVerifyDialog(false);
      setSelectedReturn(null);
      loadData();
    } catch (error) {
      console.error('Error verifying return:', error);
      toast.error('Failed to verify return');
    } finally {
      setSaving(false);
    }
  };

  const filteredReturns = returns.filter(r => {
    const matchesSearch = 
      r.return_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.retailer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      verified: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
      added_to_stock: { color: 'bg-green-100 text-green-700', icon: PackageCheck },
      rejected: { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    };
    const cfg = configs[status] || configs.pending;
    const Icon = cfg.icon;
    return (
      <Badge className={cfg.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background standalone-page">
      <header className="sticky-header-safe z-50 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/distributor-portal/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-foreground flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-primary" />
                  Retailer Returns
                </h1>
                <p className="text-xs text-muted-foreground">{returns.length} returns</p>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Return
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Returns</p>
              <p className="text-xl font-bold">{returns.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-yellow-600">
                {returns.filter(r => r.status === 'pending').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Added to Stock</p>
              <p className="text-xl font-bold text-green-600">
                {returns.filter(r => r.status === 'added_to_stock').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-xl font-bold">
                ₹{returns.reduce((sum, r) => sum + (r.total_value || 0), 0).toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search returns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="added_to_stock">Added to Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Returns List */}
        {filteredReturns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RotateCcw className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No returns found</h3>
              <p className="text-sm text-muted-foreground">
                Create a new return to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredReturns.map((ret) => (
              <Card key={ret.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{ret.return_number}</h3>
                        {getStatusBadge(ret.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{ret.retailer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ret.return_date), 'dd MMM yyyy')}
                        {ret.order_number && ` • Order: ${ret.order_number}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{ret.total_value?.toLocaleString('en-IN') || '0'}</p>
                      <p className="text-sm text-muted-foreground">{ret.total_quantity} items</p>
                      {ret.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            setSelectedReturn(ret);
                            setShowVerifyDialog(true);
                          }}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Return Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Retailer Return</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Retailer *</label>
                <Select
                  value={newReturn.retailer_id}
                  onValueChange={(v) => setNewReturn(prev => ({ ...prev, retailer_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select retailer" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailers.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Original Order #</label>
                <Input
                  placeholder="Optional"
                  value={newReturn.order_number}
                  onChange={(e) => setNewReturn(prev => ({ ...prev, order_number: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Return notes..."
                value={newReturn.notes}
                onChange={(e) => setNewReturn(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Add Item Form */}
            <Card className="p-4 bg-muted/50">
              <h4 className="font-medium mb-3">Add Item</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <Select
                    value={currentItem.product_id}
                    onValueChange={(v) => {
                      const product = products.find(p => p.id === v);
                      setCurrentItem(prev => ({
                        ...prev,
                        product_id: v,
                        product_name: product?.name || '',
                        unit: product?.unit || 'pcs',
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  placeholder="Qty"
                  value={currentItem.quantity || ''}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  placeholder="Price"
                  value={currentItem.unit_price || ''}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                />
                <Select
                  value={currentItem.reason}
                  onValueChange={(v) => setCurrentItem(prev => ({ ...prev, reason: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="wrong_product">Wrong Product</SelectItem>
                    <SelectItem value="quality_issue">Quality Issue</SelectItem>
                    <SelectItem value="excess_stock">Excess Stock</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={currentItem.condition}
                  onValueChange={(v) => setCurrentItem(prev => ({ ...prev, condition: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good (Resellable)</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Batch #"
                  value={currentItem.batch_number || ''}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, batch_number: e.target.value }))}
                />
                <Button onClick={handleAddItem}>Add</Button>
              </div>
            </Card>

            {/* Items List */}
            {newReturn.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Items ({newReturn.items.length})</h4>
                {newReturn.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.unit} × ₹{item.unit_price} = ₹{item.total.toLocaleString()}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{item.reason}</Badge>
                        <Badge variant={item.condition === 'good' ? 'default' : 'destructive'}>
                          {item.condition}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <div className="text-right font-bold">
                  Total: ₹{newReturn.items.reduce((sum, i) => sum + i.total, 0).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateReturn} disabled={saving || newReturn.items.length === 0}>
              {saving ? 'Creating...' : 'Create Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Return Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Return</DialogTitle>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedReturn.return_number}</p>
                <p className="text-sm text-muted-foreground">{selectedReturn.retailer_name}</p>
                <p className="text-sm">
                  {selectedReturn.total_quantity} items • ₹{selectedReturn.total_value?.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Good condition items</strong> will be added back to your inventory.
                  <br />
                  <strong>Damaged/Expired items</strong> can be sent for company return.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => handleVerifyReturn(false)} disabled={saving}>
              Verify Only
            </Button>
            <Button onClick={() => handleVerifyReturn(true)} disabled={saving}>
              <PackageCheck className="w-4 h-4 mr-2" />
              {saving ? 'Processing...' : 'Verify & Add to Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetailerReturns;
