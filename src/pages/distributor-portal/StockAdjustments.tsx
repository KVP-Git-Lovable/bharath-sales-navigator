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
  Wrench,
  ArrowUp,
  ArrowDown,
  Search,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  available_quantity: number;
  unit: string;
  unit_cost: number;
  batch_number?: string;
}

interface Adjustment {
  id: string;
  product_name: string;
  adjustment_type: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  notes?: string;
  created_at: string;
}

const StockAdjustments = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [adjustment, setAdjustment] = useState({
    inventory_id: '',
    product_id: '',
    product_name: '',
    adjustment_type: 'decrease' as 'increase' | 'decrease',
    quantity: 0,
    reason: 'damage',
    notes: '',
    current_qty: 0,
    unit: 'pcs',
    unit_cost: 0,
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
      // Load inventory
      const { data: invData } = await supabase
        .from('distributor_inventory')
        .select('*')
        .eq('distributor_id', distributorId)
        .gt('quantity', 0)
        .order('product_name');
      setInventory(invData || []);

      // Load recent adjustments from transactions
      const { data: txData } = await supabase
        .from('distributor_inventory_transactions')
        .select('*')
        .eq('distributor_id', distributorId)
        .eq('transaction_type', 'adjustment')
        .order('created_at', { ascending: false })
        .limit(50);

      // Get product names
      const productIds = [...new Set(txData?.map(t => t.product_id) || [])];
      let productMap = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);
        products?.forEach(p => productMap.set(p.id, p.name));
      }

      setAdjustments(txData?.map(t => ({
        id: t.id,
        product_name: productMap.get(t.product_id) || 'Unknown',
        adjustment_type: t.quantity > 0 ? 'increase' : 'decrease',
        quantity: Math.abs(t.quantity),
        reason: t.notes?.split(':')[0] || 'Unknown',
        notes: t.notes?.split(':').slice(1).join(':').trim() || '',
        created_at: t.created_at,
      })) || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInventory = (invId: string) => {
    const inv = inventory.find(i => i.id === invId);
    if (inv) {
      setAdjustment(prev => ({
        ...prev,
        inventory_id: inv.id,
        product_id: inv.product_id,
        product_name: inv.product_name,
        current_qty: inv.quantity,
        unit: inv.unit,
        unit_cost: inv.unit_cost,
      }));
    }
  };

  const handleSaveAdjustment = async () => {
    if (!adjustment.inventory_id || adjustment.quantity <= 0) {
      toast.error('Please select product and enter quantity');
      return;
    }

    if (adjustment.adjustment_type === 'decrease' && adjustment.quantity > adjustment.current_qty) {
      toast.error('Cannot decrease more than current stock');
      return;
    }

    setSaving(true);
    try {
      const inv = inventory.find(i => i.id === adjustment.inventory_id);
      if (!inv) throw new Error('Inventory not found');

      const qtyChange = adjustment.adjustment_type === 'increase' 
        ? adjustment.quantity 
        : -adjustment.quantity;
      
      const newQty = inv.quantity + qtyChange;
      const newAvailable = (inv.available_quantity || inv.quantity) + qtyChange;
      const newValue = newQty * (inv.unit_cost || 0);

      // Update inventory
      await supabase
        .from('distributor_inventory')
        .update({
          quantity: newQty,
          available_quantity: newAvailable,
          total_value: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', adjustment.inventory_id);

      // Log transaction
      await supabase
        .from('distributor_inventory_transactions')
        .insert({
          distributor_id: distributorId,
          product_id: adjustment.product_id,
          transaction_type: 'adjustment',
          quantity: qtyChange,
          running_balance: newQty,
          reference_type: 'adjustment',
          batch_number: inv.batch_number,
          unit: adjustment.unit,
          unit_cost: adjustment.unit_cost,
          notes: `${adjustment.reason}: ${adjustment.notes || 'Stock adjustment'}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      toast.success('Stock adjustment saved');
      setShowDialog(false);
      setAdjustment({
        inventory_id: '',
        product_id: '',
        product_name: '',
        adjustment_type: 'decrease',
        quantity: 0,
        reason: 'damage',
        notes: '',
        current_qty: 0,
        unit: 'pcs',
        unit_cost: 0,
      });
      loadData();
    } catch (error) {
      console.error('Error saving adjustment:', error);
      toast.error('Failed to save adjustment');
    } finally {
      setSaving(false);
    }
  };

  const filteredInventory = inventory.filter(i =>
    i.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <Button variant="ghost" size="icon" onClick={() => navigate('/distributor-portal/inventory')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" />
                  Stock Adjustments
                </h1>
                <p className="text-xs text-muted-foreground">Manual stock corrections</p>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Adjustment
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Use with caution</p>
              <p className="text-sm text-yellow-700">
                Stock adjustments are permanent changes to your inventory. Use only for damage, loss, 
                expiry write-off, or physical count corrections. All adjustments are logged for audit.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Adjustments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            {adjustments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No adjustments recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adjustments.map((adj) => (
                  <div key={adj.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        {adj.adjustment_type === 'increase' ? (
                          <ArrowUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-red-600" />
                        )}
                        <p className="font-medium">{adj.product_name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(adj.created_at), 'dd MMM yyyy HH:mm')} • {adj.reason}
                      </p>
                      {adj.notes && <p className="text-xs text-muted-foreground">{adj.notes}</p>}
                    </div>
                    <div className="text-right">
                      <Badge className={adj.adjustment_type === 'increase' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {adj.adjustment_type === 'increase' ? '+' : '-'}{adj.quantity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Adjustment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Stock Adjustment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product Selection */}
            <div>
              <label className="text-sm font-medium">Select Product *</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={adjustment.inventory_id}
                onValueChange={handleSelectInventory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {filteredInventory.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.product_name} ({inv.quantity} {inv.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {adjustment.inventory_id && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">Current Stock: <strong>{adjustment.current_qty} {adjustment.unit}</strong></p>
              </div>
            )}

            {/* Adjustment Type */}
            <div>
              <label className="text-sm font-medium">Adjustment Type *</label>
              <Select
                value={adjustment.adjustment_type}
                onValueChange={(v) => setAdjustment(prev => ({ ...prev, adjustment_type: v as 'increase' | 'decrease' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decrease">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-4 h-4 text-red-600" />
                      Decrease Stock
                    </div>
                  </SelectItem>
                  <SelectItem value="increase">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-4 h-4 text-green-600" />
                      Increase Stock
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium">Quantity *</label>
              <Input
                type="number"
                min={1}
                max={adjustment.adjustment_type === 'decrease' ? adjustment.current_qty : undefined}
                value={adjustment.quantity || ''}
                onChange={(e) => setAdjustment(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                placeholder="Enter quantity"
              />
              {adjustment.inventory_id && adjustment.quantity > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  New stock will be: {adjustment.adjustment_type === 'increase' 
                    ? adjustment.current_qty + adjustment.quantity 
                    : adjustment.current_qty - adjustment.quantity} {adjustment.unit}
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm font-medium">Reason *</label>
              <Select
                value={adjustment.reason}
                onValueChange={(v) => setAdjustment(prev => ({ ...prev, reason: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="expiry">Expiry Write-off</SelectItem>
                  <SelectItem value="loss">Loss / Theft</SelectItem>
                  <SelectItem value="physical_count">Physical Count Correction</SelectItem>
                  <SelectItem value="sample">Sample / Giveaway</SelectItem>
                  <SelectItem value="found">Found Stock</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Additional details for this adjustment..."
                value={adjustment.notes}
                onChange={(e) => setAdjustment(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveAdjustment} 
              disabled={saving || !adjustment.inventory_id || adjustment.quantity <= 0}
              className={adjustment.adjustment_type === 'decrease' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {saving ? 'Saving...' : adjustment.adjustment_type === 'decrease' ? 'Decrease Stock' : 'Increase Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockAdjustments;
