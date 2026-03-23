import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, BookOpen, Tag, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';

interface PriceEntry {
  id: string;
  product_name: string;
  variant_name?: string;
  list_price: number;
  final_price: number;
  discount_percent: number | null;
  uom: string | null;
  min_quantity: number | null;
}

const PriceBookView = () => {
  const [entries, setEntries] = useState<PriceEntry[]>([]);
  const [priceBookName, setPriceBookName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const distributorId = localStorage.getItem('distributor_id');

  useEffect(() => {
    if (distributorId) loadPriceBook();
  }, [distributorId]);

  const loadPriceBook = async () => {
    try {
      // Get distributor's assigned price book
      const { data: assignment } = await supabase
        .from('distributor_price_books')
        .select('price_book_id')
        .eq('distributor_id', distributorId!)
        .eq('is_active', true)
        .maybeSingle();

      if (!assignment) {
        // Try to find price book by distributor category
        const { data: distributor } = await supabase
          .from('distributors')
          .select('distributor_category')
          .eq('id', distributorId!)
          .single();

        if (distributor?.distributor_category) {
          const { data: categoryPB } = await supabase
            .from('price_books')
            .select('id, name')
            .eq('distributor_category', distributor.distributor_category)
            .eq('is_active', true)
            .eq('price_book_type', 'distributor')
            .maybeSingle();

          if (categoryPB) {
            await loadEntries(categoryPB.id, categoryPB.name);
            return;
          }
        }

        // Fall back to standard price book
        const { data: standardPB } = await supabase
          .from('price_books')
          .select('id, name')
          .eq('is_standard', true)
          .eq('is_active', true)
          .maybeSingle();

        if (standardPB) {
          await loadEntries(standardPB.id, standardPB.name);
        } else {
          setLoading(false);
        }
        return;
      }

      // Load assigned price book
      const { data: pb } = await supabase
        .from('price_books')
        .select('id, name')
        .eq('id', assignment.price_book_id)
        .single();

      if (pb) await loadEntries(pb.id, pb.name);
    } catch (error) {
      console.error('Error loading price book:', error);
      toast.error('Failed to load price book');
      setLoading(false);
    }
  };

  const loadEntries = async (priceBookId: string, name: string) => {
    setPriceBookName(name);
    
    const { data: entriesData } = await supabase
      .from('price_book_entries')
      .select('*')
      .eq('price_book_id', priceBookId)
      .eq('is_active', true)
      .order('created_at');

    if (!entriesData?.length) { setLoading(false); return; }

    // Get product names
    const productIds = [...new Set(entriesData.map(e => e.product_id))];
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);

    const productMap = new Map(products?.map(p => [p.id, p.name]) || []);

    // Get variant names
    const variantIds = entriesData.filter(e => e.variant_id).map(e => e.variant_id!);
    let variantMap = new Map<string, string>();
    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, variant_name')
        .in('id', variantIds);
      variantMap = new Map(variants?.map(v => [v.id, v.variant_name]) || []);
    }

    setEntries(entriesData.map(e => ({
      id: e.id,
      product_name: productMap.get(e.product_id) || 'Unknown',
      variant_name: e.variant_id ? variantMap.get(e.variant_id) : undefined,
      list_price: e.list_price,
      final_price: e.final_price,
      discount_percent: e.discount_percent,
      uom: e.uom,
      min_quantity: e.min_quantity,
    })));
    setLoading(false);
  };

  const filtered = entries.filter(e =>
    e.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.variant_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Price Book
        </h1>
        {priceBookName && (
          <p className="text-sm text-muted-foreground mt-1">
            <Badge variant="outline" className="mr-2">{priceBookName}</Badge>
            {entries.length} products
          </p>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No Price Book Assigned</h3>
            <p className="text-sm text-muted-foreground">Contact your company to get a price book assigned.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">List Price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Your Price</TableHead>
                    <TableHead>MOQ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{entry.product_name}</p>
                          {entry.variant_name && (
                            <p className="text-xs text-muted-foreground">{entry.variant_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground line-through">
                        ₹{entry.list_price.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.discount_percent ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">{entry.discount_percent}% off</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        <span className="flex items-center justify-end gap-1">
                          <IndianRupee className="w-3 h-3" />
                          {entry.final_price.toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.min_quantity ? `${entry.min_quantity} ${entry.uom || 'pcs'}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PriceBookView;
