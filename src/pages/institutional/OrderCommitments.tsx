import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Search, Package, Calendar, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Quote {
  id: string;
  quote_number: string;
  account_id: string;
  total_amount: number;
  inst_accounts?: { account_name: string } | null;
}

interface OrderCommitment {
  id: string;
  commitment_number: string;
  quote_id: string | null;
  account_id: string;
  commitment_date: string;
  delivery_start_date: string | null;
  delivery_end_date: string | null;
  status: string | null;
  notes: string | null;
  total_planned_value: number | null;
  total_actual_value: number | null;
  created_at: string;
  account?: { account_name: string } | null;
}

const statuses = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_production', label: 'In Production', color: 'bg-purple-100 text-purple-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const OrderCommitments = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteIdFromUrl = searchParams.get('quote');
  
  const [commitments, setCommitments] = useState<OrderCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [newCommitment, setNewCommitment] = useState({
    delivery_start_date: '',
    delivery_end_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchCommitments();
    fetchAcceptedQuotes();
  }, [statusFilter]);

  useEffect(() => {
    if (quoteIdFromUrl) {
      fetchQuoteAndOpenDialog(quoteIdFromUrl);
    }
  }, [quoteIdFromUrl]);

  const fetchQuoteAndOpenDialog = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from('inst_quotes')
        .select('id, quote_number, account_id, total_amount, inst_accounts(account_name)')
        .eq('id', quoteId)
        .single();
      
      if (error) throw error;
      if (data) {
        setSelectedQuote(data as unknown as Quote);
        setIsCreateOpen(true);
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast.error('Failed to load quote details');
    }
  };

  const fetchAcceptedQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('inst_quotes')
        .select('id, quote_number, account_id, total_amount, inst_accounts(account_name)')
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setQuotes((data as unknown as Quote[]) || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  };

  const fetchCommitments = async () => {
    try {
      let query = supabase
        .from('inst_order_commitments')
        .select(`
          *,
          account:inst_accounts(account_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommitments(data || []);
    } catch (error) {
      console.error('Error fetching commitments:', error);
      toast.error('Failed to load order commitments');
    } finally {
      setLoading(false);
    }
  };

  const filteredCommitments = commitments.filter(commitment =>
    commitment.commitment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    commitment.account?.account_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusInfo = (status: string) => {
    return statuses.find(s => s.value === status) || statuses[0];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const generateCommitmentNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `OC-${year}${month}-${random}`;
  };

  const handleCreateCommitment = async () => {
    if (!selectedQuote) {
      toast.error('Please select a quote');
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('inst_order_commitments')
        .insert({
          commitment_number: generateCommitmentNumber(),
          quote_id: selectedQuote.id,
          account_id: selectedQuote.account_id,
          commitment_date: new Date().toISOString().split('T')[0],
          delivery_start_date: newCommitment.delivery_start_date || null,
          delivery_end_date: newCommitment.delivery_end_date || null,
          notes: newCommitment.notes || null,
          total_planned_value: selectedQuote.total_amount,
          status: 'pending',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update quote status to converted
      await supabase
        .from('inst_quotes')
        .update({ status: 'converted' })
        .eq('id', selectedQuote.id);

      toast.success('Order commitment created successfully');
      setIsCreateOpen(false);
      setSelectedQuote(null);
      setNewCommitment({ delivery_start_date: '', delivery_end_date: '', notes: '' });
      fetchCommitments();
      fetchAcceptedQuotes();
      
      // Clear URL param
      navigate('/institutional-sales/order-commitments', { replace: true });
    } catch (error: any) {
      console.error('Error creating commitment:', error);
      toast.error(error.message || 'Failed to create order commitment');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedQuote(null);
    setNewCommitment({ delivery_start_date: '', delivery_end_date: '', notes: '' });
    setIsCreateOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Order Commitments</h1>
              <p className="text-muted-foreground text-sm">{filteredCommitments.length} commitments</p>
            </div>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Commitment
          </Button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commitments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            {statuses.map(status => (
              <Button
                key={status.value}
                variant={statusFilter === status.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status.value)}
              >
                {status.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredCommitments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No order commitments found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCommitments.map(commitment => {
              const statusInfo = getStatusInfo(commitment.status || 'pending');
              return (
                <Card key={commitment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{commitment.commitment_number}</span>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </div>
                        {commitment.account && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {commitment.account.account_name}
                          </div>
                        )}
                        {commitment.delivery_start_date && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Delivery: {format(new Date(commitment.delivery_start_date), 'dd MMM yyyy')}
                            {commitment.delivery_end_date && ` - ${format(new Date(commitment.delivery_end_date), 'dd MMM')}`}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(commitment.total_planned_value || 0)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(commitment.commitment_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Commitment Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            navigate('/institutional-sales/order-commitments', { replace: true });
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Order Commitment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Quote Selection */}
              <div className="space-y-2">
                <Label>Select Quote *</Label>
                {selectedQuote ? (
                  <Card className="bg-primary/5 border-primary">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{selectedQuote.quote_number}</p>
                          <p className="text-sm text-muted-foreground">{selectedQuote.inst_accounts?.account_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(selectedQuote.total_amount)}</p>
                          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setSelectedQuote(null)}>
                            Change
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {quotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No accepted quotes available</p>
                    ) : (
                      quotes.map(quote => (
                        <div
                          key={quote.id}
                          onClick={() => setSelectedQuote(quote)}
                          className="p-2 rounded-md cursor-pointer hover:bg-muted transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm">{quote.quote_number}</p>
                              <p className="text-xs text-muted-foreground">{quote.inst_accounts?.account_name}</p>
                            </div>
                            <p className="font-semibold text-sm">{formatCurrency(quote.total_amount)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Delivery Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Delivery Start</Label>
                  <Input
                    type="date"
                    value={newCommitment.delivery_start_date}
                    onChange={(e) => setNewCommitment(prev => ({ ...prev, delivery_start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery End</Label>
                  <Input
                    type="date"
                    value={newCommitment.delivery_end_date}
                    onChange={(e) => setNewCommitment(prev => ({ ...prev, delivery_end_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add any notes..."
                  value={newCommitment.notes}
                  onChange={(e) => setNewCommitment(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleCreateCommitment}
                disabled={!selectedQuote || creating}
              >
                {creating ? 'Creating...' : 'Create Order Commitment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default OrderCommitments;
