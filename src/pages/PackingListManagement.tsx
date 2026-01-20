import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { 
  Package, 
  Plus, 
  Filter, 
  Calendar, 
  Truck, 
  CheckCircle2, 
  Clock, 
  PackageCheck,
  ArrowLeft,
  Search,
  MoreVertical,
  Trash2,
  Eye,
  Send,
  Building2,
  ClipboardList,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePackingList, PackingList } from '@/hooks/usePackingList';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import CreatePackingListTab from '@/components/packing/CreatePackingListTab';
import DeliveryRunTab from '@/components/packing/DeliveryRunTab';
import MyDeliveriesTab from '@/components/packing/MyDeliveriesTab';

interface Distributor {
  id: string;
  name: string;
}

export default function PackingListManagement() {
  const navigate = useNavigate();
  const { 
    loading, 
    fetchPackingLists, 
    updatePackingListStatus,
    deletePackingList 
  } = usePackingList();

  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [distributorFilter, setDistributorFilter] = useState<string>('all');
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('create');

  // Role-based visibility - treat empty/null roles as admin (default view)
  const isAdminOrManager = !userRole || ['admin', 'manager', 'asm', 'rsm', 'user'].includes(userRole);
  const isDeliveryAgent = ['delivery_agent', 'driver', 'salesman'].includes(userRole);

  // Load user role and distributors
  useEffect(() => {
    const loadInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleData) {
        setUserRole(roleData.role);
        // Default tab based on role
        if (['delivery_agent', 'driver', 'salesman'].includes(roleData.role)) {
          setActiveTab('my-deliveries');
        }
      }

      // Load distributors for filter
      try {
        const resp = await supabase.from('distributors').select('id, name');
        if (resp.data) setDistributors(resp.data as Distributor[]);
      } catch (e) {
        console.error('Error loading distributors:', e);
      }
    };

    loadInitialData();
  }, []);

  // Load packing lists
  useEffect(() => {
    const loadPackingLists = async () => {
      const filters: any = {};
      if (distributorFilter !== 'all') {
        filters.distributorId = distributorFilter;
      }
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      const lists = await fetchPackingLists(filters);
      setPackingLists(lists);
    };

    loadPackingLists();
  }, [distributorFilter, statusFilter, fetchPackingLists]);

  const handleDeletePackingList = async (packingListId: string, distId: string | null) => {
    const success = await deletePackingList(packingListId, distId);
    if (success) {
      setPackingLists(prev => prev.filter(pl => pl.id !== packingListId));
    }
  };

  const handleDispatch = async (packingListId: string) => {
    const success = await updatePackingListStatus(packingListId, 'dispatched');
    if (success) {
      setPackingLists(prev => 
        prev.map(pl => pl.id === packingListId ? { ...pl, status: 'dispatched' as const } : pl)
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      packed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      dispatched: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    };
    return <Badge className={styles[status] || styles.draft}>{status.toUpperCase()}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'packed': return <PackageCheck className="h-4 w-4 text-blue-600" />;
      case 'dispatched': return <Truck className="h-4 w-4 text-amber-600" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  // Filter packing lists by search
  const filteredPackingLists = packingLists.filter(pl => 
    pl.packing_list_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary stats
  const stats = {
    total: packingLists.length,
    draft: packingLists.filter(pl => pl.status === 'draft').length,
    packed: packingLists.filter(pl => pl.status === 'packed').length,
    dispatched: packingLists.filter(pl => pl.status === 'dispatched').length,
    completed: packingLists.filter(pl => pl.status === 'completed').length
  };

  const getDistributorName = (distributorId: string | null) => {
    if (!distributorId) return 'Direct Sales';
    const dist = distributors.find(d => d.id === distributorId);
    return dist?.name || 'Unknown';
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header - Dynamic based on role */}
        <div className="bg-card border-b sticky top-0 z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {isDeliveryAgent ? 'My Delivery Run' : 'Packing Lists'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isDeliveryAgent 
                    ? 'View and complete your assigned deliveries' 
                    : 'Manage delivery packing lists'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Role-based visibility */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Delivery Agents see ONLY My Deliveries tab */}
          {isDeliveryAgent ? (
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="my-deliveries" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  My Deliveries
                </TabsTrigger>
              </TabsList>
            </div>
          ) : (
            /* Admin/Manager see management tabs only */
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">All Lists</span>
                </TabsTrigger>
                <TabsTrigger value="delivery-run" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Delivery Runs</span>
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* Create Packing List Tab - Admin/Manager Only */}
          {isAdminOrManager && (
            <TabsContent value="create" className="mt-0">
              <CreatePackingListTab />
            </TabsContent>
          )}

          {/* All Packing Lists Tab - Admin/Manager Only */}
          {isAdminOrManager && (
            <TabsContent value="all" className="mt-0">
              {/* Summary Cards */}
              <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="bg-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card className="bg-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-muted-foreground">{stats.draft}</p>
                    <p className="text-xs text-muted-foreground">Draft</p>
                  </CardContent>
                </Card>
                <Card className="bg-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.packed}</p>
                    <p className="text-xs text-muted-foreground">Packed</p>
                  </CardContent>
                </Card>
                <Card className="bg-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.dispatched}</p>
                    <p className="text-xs text-muted-foreground">Dispatched</p>
                  </CardContent>
                </Card>
                <Card className="bg-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="px-4 pb-4 flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search packing lists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Distributor Filter */}
                <Select value={distributorFilter} onValueChange={setDistributorFilter}>
                  <SelectTrigger className="w-40">
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="direct">Direct Sales</SelectItem>
                    {distributors.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Packing Lists */}
              <div className="px-4 pb-6 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredPackingLists.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No packing lists found</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setActiveTab('create')}
                      >
                        Create Your First Packing List
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  filteredPackingLists.map(packingList => (
                    <Card key={packingList.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              {getStatusIcon(packingList.status)}
                            </div>
                            <div>
                              <p className="font-medium">{packingList.packing_list_number}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  Delivery: {format(new Date(packingList.delivery_date), 'dd MMM yyyy')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {getDistributorName(packingList.distributor_id)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(packingList.status)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/packing-list/${packingList.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {packingList.status === 'packed' && (
                                  <DropdownMenuItem onClick={() => handleDispatch(packingList.id)}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Dispatch
                                  </DropdownMenuItem>
                                )}
                                {packingList.status === 'draft' && (
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDeletePackingList(packingList.id, packingList.distributor_id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Orders</p>
                            <p className="font-semibold">{packingList.total_orders}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Items (KG)</p>
                            <p className="font-semibold">{(packingList.total_items / 1000).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Value</p>
                            <p className="font-semibold">₹{packingList.total_value.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          )}

          {/* Delivery Run Details Tab - Admin/Manager Only */}
          {isAdminOrManager && (
            <TabsContent value="delivery-run" className="mt-0">
              <DeliveryRunTab />
            </TabsContent>
          )}

          {/* My Deliveries Tab - For Delivery Agents */}
          <TabsContent value="my-deliveries" className="mt-0 p-4">
            <MyDeliveriesTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
