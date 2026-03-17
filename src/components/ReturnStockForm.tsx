import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, Check, Plus, ChevronsUpDown, FileText, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { generateCreditNotePDF, getNextCreditNoteNumber, CreditNoteItem, CreditNoteData } from '@/utils/creditNoteGenerator';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  unit: string;
  rate: number;
  sku?: string;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  variant_name: string;
  sku: string;
  price: number;
}

interface ReturnItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  unit: string;
  returnQuantity: number;
  returnReason: string;
  price: number;
}

interface ReturnStockFormProps {
  visitId: string;
  retailerId: string;
  retailerName: string;
  onComplete: () => void;
}

const returnReasons = [
  'Damaged',
  'Expired',
  'Wrong Product',
  'Quality Issue',
  'Excess Stock',
  'Customer Return',
  'Other'
];

export function ReturnStockForm({ visitId, retailerId, retailerName, onComplete }: ReturnStockFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingCN, setGeneratingCN] = useState(false);
  
  // Form state for adding new return
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [returnQuantity, setReturnQuantity] = useState<number>(0);
  const [returnReason, setReturnReason] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('Kg');
  const [otherReason, setOtherReason] = useState<string>('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);


  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          unit,
          rate,
          sku,
          product_variants (
            id,
            variant_name,
            sku,
            price
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const productsWithVariants: Product[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        rate: p.rate,
        sku: p.sku || undefined,
        variants: (p.product_variants || []) as ProductVariant[]
      }));

      setProducts(productsWithVariants);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReturn = () => {
    // Collect all validation errors
    const errors: string[] = [];
    
    if (!selectedProduct) {
      errors.push('select a product');
    }
    if (returnQuantity <= 0) {
      errors.push('enter a valid quantity');
    }
    if (!returnReason) {
      errors.push('select a return reason');
    }
    if (returnReason === 'Other' && !otherReason.trim()) {
      errors.push('enter the reason for returning');
    }
    
    // Show single error message if any validation fails
    if (errors.length > 0) {
      toast.error(`Please ${errors.join(', ')}`);
      return;
    }

    const [productId, variantId] = selectedProduct.split('_variant_');
    const product = products.find(p => p.id === productId);
    
    if (!product) return;

    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined;
    const itemPrice = variant ? variant.price : product.rate;

    const newItem: ReturnItem = {
      productId,
      variantId: variantId || undefined,
      productName: product.name,
      variantName: variant?.variant_name,
      unit: selectedUnit || product.unit,
      returnQuantity,
      returnReason: returnReason === 'Other' ? `Other: ${otherReason.trim()}` : returnReason,
      price: itemPrice
    };

    setReturnItems(prev => [...prev, newItem]);
    
    // Reset form
    setSelectedProduct('');
    setReturnQuantity(0);
    setReturnReason('');
    setSelectedUnit('');
    
    toast.success(`Added ${newItem.productName}${newItem.variantName ? ` - ${newItem.variantName}` : ''}`);
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveReturns = async () => {
    if (returnItems.length === 0) {
      toast.error('No items added for return');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dateStr = new Date().toISOString().split('T')[0];
      const grnNumber = `RET-${Date.now()}`;

      // Create Return GRN - handle empty visit_id
      const validVisitId = visitId && visitId.trim() !== '' ? visitId : null;
      
      const { data: returnGRN, error: grnError } = await supabase
        .from('van_return_grn')
        .insert({
          user_id: user.id,
          retailer_id: retailerId,
          visit_id: validVisitId,
          return_date: dateStr,
          return_grn_number: grnNumber,
          notes: `Returns from ${retailerName}`
        })
        .select()
        .single();

      if (grnError) throw grnError;

      // Create Return GRN Items
      const returnGRNItems = returnItems.map(item => ({
        return_grn_id: returnGRN.id,
        product_id: item.productId,
        variant_id: item.variantId && item.variantId.trim() !== '' ? item.variantId : null,
        return_quantity: item.returnQuantity,
        return_reason: item.returnReason
      }));

      const { error: itemsError } = await supabase
        .from('van_return_grn_items')
        .insert(returnGRNItems);

      if (itemsError) throw itemsError;

      
      // Reset form
      setReturnItems([]);
      setSelectedProduct('');
      setReturnQuantity(0);
      setReturnReason('');
      
      onComplete();
    } catch (error: any) {
      console.error('Error saving returns:', error);
      toast.error('Failed to save returns: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateCreditNote = async () => {
    if (returnItems.length === 0) {
      toast.error('No items added for return');
      return;
    }

    setGeneratingCN(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Fetch company info
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      // 2. Fetch retailer info
      const { data: retailer } = await supabase
        .from('retailers')
        .select('*')
        .eq('id', retailerId)
        .single();

      // 3. Lookup past invoices for this retailer to find reference invoice numbers per product
      const { data: pastOrders } = await supabase
        .from('orders')
        .select('id, invoice_number, order_items(product_id, variant_id)')
        .eq('retailer_id', retailerId)
        .not('invoice_number', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      // Build product->invoice map
      const productInvoiceMap: Record<string, string> = {};
      if (pastOrders) {
        for (const order of pastOrders) {
          const items = (order as any).order_items || [];
          for (const oi of items) {
            const key = oi.variant_id ? `${oi.product_id}_${oi.variant_id}` : oi.product_id;
            if (!productInvoiceMap[key] && order.invoice_number) {
              productInvoiceMap[key] = order.invoice_number;
            }
          }
        }
      }

      // 4. Build credit note items
      const cnItems: CreditNoteItem[] = returnItems.map(item => {
        const key = item.variantId ? `${item.productId}_${item.variantId}` : item.productId;
        const refInvoice = productInvoiceMap[key] || 'N/A';
        const total = item.price * item.returnQuantity;
        const taxableAmount = total; // base price is pre-tax
        const sgst = taxableAmount * 0.025;
        const cgst = taxableAmount * 0.025;

        return {
          product_name: item.variantName ? `${item.productName} - ${item.variantName}` : item.productName,
          hsn_code: '',
          unit: item.unit,
          quantity: item.returnQuantity,
          rate: item.price,
          total,
          taxable_amount: taxableAmount,
          sgst_amount: sgst,
          cgst_amount: cgst,
          original_invoice_number: refInvoice,
        };
      });

      const subTotal = cnItems.reduce((s, i) => s + i.total, 0);
      const sgstTotal = cnItems.reduce((s, i) => s + i.sgst_amount, 0);
      const cgstTotal = cnItems.reduce((s, i) => s + i.cgst_amount, 0);
      const totalAmount = subTotal + sgstTotal + cgstTotal;

      const referenceInvoices = [...new Set(cnItems.map(i => i.original_invoice_number).filter(v => v !== 'N/A'))];
      if (referenceInvoices.length === 0) referenceInvoices.push('N/A');

      // 5. Get next CN number
      const creditNoteNumber = await getNextCreditNoteNumber();
      const creditNoteDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

      // Map return reason to credit note reason
      const primaryReason = returnItems[0]?.returnReason || 'Other';
      const reasonMap: Record<string, string> = {
        'Damaged': 'damaged',
        'Expired': 'expired',
        'Wrong Product': 'quality_issue',
        'Quality Issue': 'quality_issue',
        'Excess Stock': 'unsold_stock',
        'Customer Return': 'unsold_stock',
        'Other': 'other',
      };

      // 6. Save credit note to DB
      const { data: cnRecord, error: cnError } = await supabase
        .from('credit_notes')
        .insert({
          credit_note_number: creditNoteNumber,
          credit_note_date: new Date().toISOString().split('T')[0],
          retailer_id: retailerId,
          retailer_name: retailerName,
          reason: reasonMap[primaryReason] || 'other',
          reason_notes: returnItems.map(i => `${i.productName}: ${i.returnReason} (Qty: ${i.returnQuantity})`).join('; '),
          sub_total: subTotal,
          sgst_total: sgstTotal,
          cgst_total: cgstTotal,
          total_amount: totalAmount,
          status: 'issued',
          created_by: user.id,
        })
        .select()
        .single();

      if (cnError) throw cnError;

      // 7. Save credit note items
      const cnItemRecords = cnItems.map(item => ({
        credit_note_id: cnRecord.id,
        product_name: item.product_name,
        hsn_code: item.hsn_code,
        unit: item.unit,
        quantity: item.quantity,
        rate: item.rate,
        total: item.total,
        taxable_amount: item.taxable_amount,
        sgst_amount: item.sgst_amount,
        cgst_amount: item.cgst_amount,
        original_invoice_number: item.original_invoice_number,
      }));

      await supabase.from('credit_note_items').insert(cnItemRecords);

      // 8. Also save the return GRN (so user doesn't need to click Save Return separately)
      const dateStr = new Date().toISOString().split('T')[0];
      const grnNumber = `RET-${Date.now()}`;
      const validVisitId = visitId && visitId.trim() !== '' ? visitId : null;

      const { data: returnGRN, error: grnError } = await supabase
        .from('van_return_grn')
        .insert({
          user_id: user.id,
          retailer_id: retailerId,
          visit_id: validVisitId,
          return_date: dateStr,
          return_grn_number: grnNumber,
          notes: `Returns from ${retailerName} — CN: ${creditNoteNumber}`
        })
        .select()
        .single();

      if (!grnError && returnGRN) {
        const returnGRNItems = returnItems.map(item => ({
          return_grn_id: returnGRN.id,
          product_id: item.productId,
          variant_id: item.variantId && item.variantId.trim() !== '' ? item.variantId : null,
          return_quantity: item.returnQuantity,
          return_reason: item.returnReason
        }));
        await supabase.from('van_return_grn_items').insert(returnGRNItems);
      }

      // 9. Generate & download PDF
      const cnData: CreditNoteData = {
        creditNoteNumber,
        creditNoteDate,
        referenceInvoices,
        company: company || { name: 'Company' },
        retailer: retailer || { name: retailerName },
        items: cnItems,
        reason: reasonMap[primaryReason] || 'other',
        reasonNotes: returnItems.map(i => `${i.productName}: ${i.returnReason} (Qty: ${i.returnQuantity})`).join('; '),
        subTotal,
        sgstTotal,
        cgstTotal,
        totalAmount,
      };

      const pdfBlob = await generateCreditNotePDF(cnData);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${creditNoteNumber.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Credit Note ${creditNoteNumber} generated & downloaded`);

      // Reset form
      setReturnItems([]);
      setSelectedProduct('');
      setReturnQuantity(0);
      setReturnReason('');
      onComplete();
    } catch (error: any) {
      console.error('Error generating credit note:', error);
      toast.error('Failed to generate credit note: ' + error.message);
    } finally {
      setGeneratingCN(false);
    }
  };

  const getProductOptions = () => {
    const options: Array<{ value: string; label: string; sku?: string; price: number }> = [];
    
    products.forEach(product => {
      // Always add the base product
      options.push({
        value: product.id,
        label: product.name,
        sku: product.sku,
        price: product.rate
      });
      
      // Also add variants if they exist
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          options.push({
            value: `${product.id}_variant_${variant.id}`,
            label: variant.variant_name,
            sku: variant.sku,
            price: variant.price
          });
        });
      }
    });
    
    return options;
  };

  const getSelectedProductLabel = () => {
    if (!selectedProduct) return 'Select...';
    const option = getProductOptions().find(opt => opt.value === selectedProduct);
    return option ? option.label : 'Select...';
  };

  const getTotalReturns = () => {
    return returnItems.reduce((sum, item) => sum + item.returnQuantity, 0);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading products...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Product Button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Return items for <span className="text-foreground font-semibold">{retailerName}</span></p>
            </div>
            <Button onClick={handleAddReturn} className="h-10">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Return Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Product Selection */}
          <div>
            <Label>Product</Label>
            <Popover open={productDropdownOpen} onOpenChange={setProductDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productDropdownOpen}
                  className="w-full justify-between"
                >
                  {getSelectedProductLabel()}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search products..." />
                  <CommandList>
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      {getProductOptions().map(option => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={(currentValue) => {
                            setSelectedProduct(currentValue === selectedProduct ? '' : currentValue);
                            setProductDropdownOpen(false);
                          }}
                          className="flex flex-col items-start py-3"
                        >
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {option.sku && `SKU: ${option.sku} | `}₹{option.price}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Product Details Row - Only show when product is selected */}
          {selectedProduct && (() => {
            const option = getProductOptions().find(opt => opt.value === selectedProduct);
            const [productId] = selectedProduct.split('_variant_');
            const product = products.find(p => p.id === productId);
            const priceWithGST = option ? option.price * 1.05 : 0;
            const totalPrice = priceWithGST * returnQuantity;
            
            return (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Price (incl. GST)</Label>
                  <p className="font-medium">₹{priceWithGST.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <Select value={selectedUnit || product?.unit || 'Kg'} onValueChange={setSelectedUnit}>
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Piece', 'Box', 'Case', 'Kg', 'grams', 'Litre', 'ml', 'Dozen', 'Pack', 'Carton'].map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={returnQuantity || ''}
                    onChange={(e) => setReturnQuantity(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reason</Label>
                  <Select value={returnReason} onValueChange={setReturnReason}>
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {returnReasons.map(reason => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total Price</Label>
                  <p className="font-semibold text-primary">₹{Math.round(totalPrice)}</p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Added Items List */}
      {returnItems.length > 0 && (
        <>
          <Card className="bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Items: {returnItems.length}</p>
                  <p className="text-sm text-muted-foreground">Total Quantity: {getTotalReturns()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%]">Product</TableHead>
                    <TableHead className="w-[18%]">Qty</TableHead>
                    <TableHead className="w-[22%]">Reason</TableHead>
                    <TableHead className="w-[18%]">Price</TableHead>
                    <TableHead className="w-[7%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((item, index) => {
                    const itemTotal = Math.round(item.price * 1.05 * item.returnQuantity);
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.productName}</p>
                            {item.variantName && (
                              <p className="text-xs text-muted-foreground">{item.variantName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.returnQuantity} {item.unit}</TableCell>
                        <TableCell className="text-sm">{item.returnReason}</TableCell>
                        <TableCell className="text-sm font-medium">₹{itemTotal}</TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Bottom Action Buttons - Fixed at bottom with proper styling */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 flex gap-2 z-40">
        <Button 
          onClick={handleSaveReturns} 
          disabled={saving || returnItems.length === 0} 
          className="flex-1"
        >
          <Check className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Return'}
        </Button>
        <Button 
          variant="outline" 
          className="flex-1"
          disabled={returnItems.length === 0 || generatingCN}
          onClick={handleGenerateCreditNote}
        >
          {generatingCN ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          {generatingCN ? 'Generating...' : 'Generate Credits'}
        </Button>
      </div>
      
      {/* Bottom spacer for fixed buttons */}
      <div className="h-16" />
    </div>
  );
}
