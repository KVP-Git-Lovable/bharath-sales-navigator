import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Building2,
  CheckCircle2,
  Clock,
  Truck,
  CreditCard,
  Send,
  Search,
  Trash2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  unit?: string;
}

interface ReturnItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total: number;
  reason: string;
  source: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

interface CompanyReturn {
  id: string;
  return_number: string;
  return_date: string;
  total_quantity: number;
  total_value: number;
  status: string;
  notes?: string;
  submitted_at?: string;
  approved_at?: string;
  picked_up_at?: string;
  credit_note_number?: string;
  credit_note_amount?: number;
  credit_note_date?: string;
  created_at: string;
  items?: ReturnItem[];
}

interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  batch_number?: string;
  expiry_date?: string;
}

const CompanyReturns = () => {
  const navigate = useNavigate();
  const [returns, setReturns] = useState<CompanyReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<CompanyReturn | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // New return form
  const [newReturn, setNewReturn] = useState({
    notes: '',
    items: [] as ReturnItem[],
  });
  const [currentItem, setCurrentItem] = useState<Partial<ReturnItem>>({
    product_id: '',
    product_name: '',
    quantity: 1,
    unit: 'pcs',
    unit_cost: 0,
    reason: 'damaged',
    source: 'own_stock',
    batch_number: '',
    expiry_date: '',
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
        .from('distributor_company_returns')
        .select('*')
        .eq('distributor_id', distributorId)
        .order('created_at', { ascending: false });

      setReturns(returnsData || []);

      // Load products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, unit')
        .eq('is_active', true)
        .order('name');
      setProducts(productsData || []);

      // Load inventory for selection
      const { data: inventoryData } = await supabase
        .from('distributor_inventory')
        .select('*')
        .eq('distributor_id', distributorId)
        .gt('quantity', 0);
      setInventory(inventoryData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load company returns');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product_id || currentItem.quantity! <= 0) {
      toast.error('Please select a product and quantity');
      return;
    }

    const invItem = inventory.find(i => i.product_id === currentItem.product_id);
    const product = products.find(p => p.id === currentItem.product_id);
    
    const item: ReturnItem = {
      product_id: currentItem.product_id!,
      product_name: invItem?.product_name || product?.name || '',
      quantity: currentItem.quantity || 1,
      unit: invItem?.unit || product?.unit || 'pcs',
      unit_cost: invItem?.unit_cost || currentItem.unit_cost || 0,
      total: (currentItem.quantity || 1) * (invItem?.unit_cost || currentItem.unit_cost || 0),
      reason: currentItem.reason || 'damaged',
      source: currentItem.source || 'own_stock',
      batch_number: invItem?.batch_number || currentItem.batch_number,
      expiry_date: invItem?.expiry_date || currentItem.expiry_date,
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
      unit_cost: 0,
      reason: 'damaged',
      source: 'own_stock',
      batch_number: '',
      expiry_date: '',
    });
  };

  const handleRemoveItem = (index: number) => {
    setNewReturn(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleCreateReturn = async () => {
    if (newReturn.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setSaving(true);
    try {
      const totalQty = newReturn.items.reduce((sum, i) => sum + i.quantity, 0);
      const totalValue = newReturn.items.reduce((sum, i) => sum + i.total, 0);

      // Create return header
      const { data: returnData, error: returnError } = await supabase
        .from('distributor_company_returns')
        .insert({
          distributor_id: distributorId,
          return_number: '', // Auto-generated by trigger
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
        company_return_id: returnData.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.unit_cost,
        total: item.total,
        reason: item.reason,
        source: item.source,
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null,
      }));

      await supabase
        .from('distributor_company_return_items')
        .insert(itemsToInsert);

      toast.success(`Return ${returnData.return_number} created as draft`);
      setShowCreateDialog(false);
      setNewReturn({ notes: '', items: [] });
      loadData();
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('Failed to create return');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReturn = async (returnId: string) => {
    setSaving(true);
    try {
      await supabase
        .from('distributor_company_returns')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', returnId);

      toast.success('Return submitted for approval');
      loadData();
    } catch (error) {
      console.error('Error submitting return:', error);
      toast.error('Failed to submit return');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordCreditNote = async (returnId: string, creditNoteNumber: string, creditAmount: number) => {
    setSaving(true);
    try {
      // Get return items
      const { data: items } = await supabase
        .from('distributor_company_return_items')
        .select('*')
        .eq('company_return_id', returnId);

      // Deduct from inventory
      if (items) {
        for (const item of items) {
          const { data: invItem } = await supabase
            .from('distributor_inventory')
            .select('*')
            .eq('distributor_id', distributorId)
            .eq('product_id', item.product_id)
            .maybeSingle();

          if (invItem) {
            const newQty = Math.max(0, invItem.quantity - item.quantity);
            await supabase
              .from('distributor_inventory')
              .update({
                quantity: newQty,
                available_quantity: Math.max(0, (invItem.available_quantity || 0) - item.quantity),
                total_value: newQty * (invItem.unit_cost || 0),
                updated_at: new Date().toISOString(),
              })
              .eq('id', invItem.id);

            // Log transaction
            await supabase
              .from('distributor_inventory_transactions')
              .insert({
                distributor_id: distributorId,
                product_id: item.product_id,
                transaction_type: 'return_to_company',
                quantity: -item.quantity, // Negative for outgoing
                reference_type: 'company_return',
                reference_id: returnId,
                reference_number: creditNoteNumber,
                batch_number: item.batch_number,
                unit: item.unit,
                unit_cost: item.unit_cost,
                notes: `Company return: ${item.reason}`,
                created_by: (await supabase.auth.getUser()).data.user?.id,
              });
          }
        }
      }

      // Update return status
      await supabase
        .from('distributor_company_returns')
        .update({
          status: 'credited',
          credit_note_number: creditNoteNumber,
          credit_note_amount: creditAmount,
          credit_note_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', returnId);

      toast.success('Credit note recorded and inventory updated');
      setShowDetailDialog(false);
      loadData();
    } catch (error) {
      console.error('Error recording credit note:', error);
      toast.error('Failed to record credit note');
    } finally {
      setSaving(false);
    }
  };

  const filteredReturns = returns.filter(r => {
    const matchesSearch = r.return_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      draft: { color: 'bg-muted text-muted-foreground', icon: FileText, label: 'Draft' },
      submitted: { color: 'bg-blue-100 text-blue-700', icon: Send, label: 'Submitted' },
      approved: { color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle2, label: 'Approved' },
      picked_up: { color: 'bg-purple-100 text-purple-700', icon: Truck, label: 'Picked Up' },
      credited: { color: 'bg-green-100 text-green-700', icon: CreditCard, label: 'Credited' },
      rejected: { color: 'bg-red-100 text-red-700', icon: Clock, label: 'Rejected' },
    };
    const cfg = configs[status] || configs.draft;
    const Icon = cfg.icon;
    return (
      <Badge className={cfg.color}>
        <Icon className="w-3 h-3 mr-1" />
        {cfg.label}
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
                  <Building2 className="w-5 h-5 text-primary" />
                  Company Returns
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
              <p className="text-xs text-muted-foreground">Pending Approval</p>
              <p className="text-xl font-bold text-blue-600">
                {returns.filter(r => r.status === 'submitted').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Credited</p>
              <p className="text-xl font-bold text-green-600">
                {returns.filter(r => r.status === 'credited').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Credit</p>
              <p className="text-xl font-bold">
                ₹{returns.filter(r => r.status === 'credited').reduce((sum, r) => sum + (r.credit_note_amount || 0), 0).toLocaleString('en-IN')}
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="picked_up">Picked Up</SelectItem>
              <SelectItem value="credited">Credited</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Returns List */}
        {filteredReturns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No company returns found</h3>
              <p className="text-sm text-muted-foreground">
                Create a new return request to get started
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
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(ret.return_date), 'dd MMM yyyy')}
                      </p>
                      {ret.credit_note_number && (
                        <p className="text-xs text-green-600">
                          Credit Note: {ret.credit_note_number} • ₹{ret.credit_note_amount?.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{ret.total_value?.toLocaleString('en-IN') || '0'}</p>
                      <p className="text-sm text-muted-foreground">{ret.total_quantity} items</p>
                      <div className="flex gap-2 mt-2">
                        {ret.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleSubmitReturn(ret.id)}
                            disabled={saving}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Submit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReturn(ret);
                            setShowDetailDialog(true);
                          }}
                        >
                          View
                        </Button>
                      </div>
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
            <DialogTitle>Create Company Return</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Return notes for company..."
                value={newReturn.notes}
                onChange={(e) => setNewReturn(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Add Item Form */}
            <Card className="p-4 bg-muted/50">
              <h4 className="font-medium mb-3">Add Item from Inventory</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <Select
                    value={currentItem.product_id}
                    onValueChange={(v) => {
                      const invItem = inventory.find(i => i.product_id === v);
                      setCurrentItem(prev => ({
                        ...prev,
                        product_id: v,
                        product_name: invItem?.product_name || '',
                        unit: invItem?.unit || 'pcs',
                        unit_cost: invItem?.unit_cost || 0,
                        batch_number: invItem?.batch_number || '',
                        expiry_date: invItem?.expiry_date || '',
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select from inventory" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.map(i => (
                        <SelectItem key={i.product_id} value={i.product_id}>
                          {i.product_name} ({i.quantity} {i.unit})
                        </SelectItem>
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
                    <SelectItem value="slow_moving">Slow Moving</SelectItem>
                    <SelectItem value="recall">Product Recall</SelectItem>
                    <SelectItem value="quality_issue">Quality Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={currentItem.source}
                  onValueChange={(v) => setCurrentItem(prev => ({ ...prev, source: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own_stock">Own Stock</SelectItem>
                    <SelectItem value="retailer_return">From Retailer Return</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddItem} className="col-span-2 md:col-span-1">Add Item</Button>
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
                        {item.quantity} {item.unit} × ₹{item.unit_cost} = ₹{item.total.toLocaleString()}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{item.reason}</Badge>
                        <Badge variant="secondary">{item.source.replace('_', ' ')}</Badge>
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
              {saving ? 'Creating...' : 'Create as Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{selectedReturn.return_number}</p>
                  {getStatusBadge(selectedReturn.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedReturn.return_date), 'dd MMM yyyy')}
                </p>
                <p className="text-lg font-bold mt-2">
                  ₹{selectedReturn.total_value?.toLocaleString()} • {selectedReturn.total_quantity} items
                </p>
              </div>

              {selectedReturn.credit_note_number && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-700">Credit Note Received</p>
                  <p className="text-green-800">{selectedReturn.credit_note_number}</p>
                  <p className="text-lg font-bold text-green-700">
                    ₹{selectedReturn.credit_note_amount?.toLocaleString()}
                  </p>
                </div>
              )}

              {selectedReturn.status === 'picked_up' && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Record Credit Note</p>
                  <Input placeholder="Credit Note Number" id="cn-number" />
                  <Input type="number" placeholder="Credit Amount" id="cn-amount" />
                  <Button 
                    className="w-full"
                    onClick={() => {
                      const cnNumber = (document.getElementById('cn-number') as HTMLInputElement).value;
                      const cnAmount = parseFloat((document.getElementById('cn-amount') as HTMLInputElement).value);
                      if (cnNumber && cnAmount) {
                        handleRecordCreditNote(selectedReturn.id, cnNumber, cnAmount);
                      } else {
                        toast.error('Please enter credit note details');
                      }
                    }}
                    disabled={saving}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Record Credit Note
                  </Button>
                </div>
              )}

              {selectedReturn.notes && (
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground">{selectedReturn.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyReturns;
