import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { moveToRecycleBin } from '@/utils/recycleBinUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Gift, Search, Loader2, AlertTriangle, TrendingUp, Calendar, Globe, MapPin, Settings } from 'lucide-react';
import { SchemeFormFields } from './SchemeFormFields';
import { SchemeDetailsDisplay } from './SchemeDetailsDisplay';
import { SchemeApplicabilitySelector, ApplicabilityRule } from './SchemeApplicabilitySelector';
import { SchemePolicyConfig } from './SchemePolicyConfig';

interface ProductCategory {
  id: string;
  name: string;
  description: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category_id: string;
  rate: number;
  unit: string;
  is_active: boolean;
}

interface ProductScheme {
  id: string;
  product_id?: string;
  product?: Product;
  variant_id?: string;
  category_id?: string;
  category?: ProductCategory;
  name: string;
  description: string;
  scheme_type: string;
  condition_quantity: number;
  quantity_condition_type?: string;
  discount_percentage: number;
  discount_amount: number;
  free_quantity: number;
  buy_quantity: number;
  free_product_id?: string;
  bundle_product_ids: string[];
  bundle_discount_amount: number;
  bundle_discount_percentage: number;
  tier_data: Array<{
    min_qty: number;
    max_qty: number;
    discount_percentage: number;
  }>;
  is_first_order_only: boolean;
  validity_days?: number;
  min_order_value: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

const initialSchemeForm = {
  id: '',
  product_id: '',
  variant_id: 'all',
  category_id: '',
  name: '',
  description: '',
  scheme_type: 'percentage_discount',
  condition_quantity: 0,
  quantity_condition_type: 'more_than',
  discount_percentage: 0,
  discount_amount: 0,
  free_quantity: 0,
  buy_quantity: 0,
  free_product_id: '',
  bundle_product_ids: [] as string[],
  bundle_discount_amount: 0,
  bundle_discount_percentage: 0,
  tier_data: [] as any[],
  is_first_order_only: false,
  validity_days: null as number | null,
  min_order_value: 0,
  is_active: true,
  start_date: '',
  end_date: '',
  // New applicability fields
  applicability_type: 'global' as 'global' | 'targeted' | 'hybrid',
  priority: 0,
  exclusion_group: ''
};

export const SchemeMaster = () => {
  const [schemes, setSchemes] = useState<ProductScheme[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isSchemeDialogOpen, setIsSchemeDialogOpen] = useState(false);
  const [schemeForm, setSchemeForm] = useState(initialSchemeForm);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: '', name: '' });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Applicability state
  const [applicabilityRules, setApplicabilityRules] = useState<ApplicabilityRule[]>([]);

  // Bulk action states
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchSchemes(), fetchProducts(), fetchCategories()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchemes = async () => {
    const { data, error } = await supabase
      .from('product_schemes')
      .select(`
        *,
        product:products!product_schemes_product_id_fkey(*),
        category:product_categories(*),
        free_product:products!product_schemes_free_product_id_fkey(*)
      `)
      .order('name');
    
    if (error) throw error;
    setSchemes((data as any) || []);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, description, category_id, rate, unit, is_active')
      .order('name');
    
    if (error) throw error;
    setProducts(data || []);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setCategories(data || []);
  };

  const handleSchemeSubmit = async () => {
    try {
      let schemeId = schemeForm.id;
      
      if (schemeForm.id) {
        const { error } = await supabase
          .from('product_schemes')
          .update({
            product_id: schemeForm.product_id || null,
            variant_id: schemeForm.variant_id === 'all' ? null : schemeForm.variant_id,
            category_id: schemeForm.category_id || null,
            name: schemeForm.name,
            description: schemeForm.description,
            scheme_type: schemeForm.scheme_type,
            condition_quantity: schemeForm.condition_quantity,
            quantity_condition_type: schemeForm.quantity_condition_type,
            discount_percentage: schemeForm.discount_percentage,
            discount_amount: schemeForm.discount_amount,
            free_quantity: schemeForm.free_quantity,
            buy_quantity: schemeForm.buy_quantity,
            free_product_id: schemeForm.free_product_id || null,
            bundle_product_ids: schemeForm.bundle_product_ids,
            bundle_discount_amount: schemeForm.bundle_discount_amount,
            bundle_discount_percentage: schemeForm.bundle_discount_percentage,
            tier_data: schemeForm.tier_data,
            is_first_order_only: schemeForm.is_first_order_only,
            validity_days: schemeForm.validity_days,
            min_order_value: schemeForm.min_order_value,
            is_active: schemeForm.is_active,
            start_date: schemeForm.start_date || null,
            end_date: schemeForm.end_date || null,
            applicability_type: schemeForm.applicability_type,
            priority: schemeForm.priority,
            exclusion_group: schemeForm.exclusion_group || null
          })
          .eq('id', schemeForm.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('product_schemes')
          .insert({
            product_id: schemeForm.product_id || null,
            variant_id: schemeForm.variant_id === 'all' ? null : schemeForm.variant_id,
            category_id: schemeForm.category_id || null,
            name: schemeForm.name,
            description: schemeForm.description,
            scheme_type: schemeForm.scheme_type,
            condition_quantity: schemeForm.condition_quantity,
            quantity_condition_type: schemeForm.quantity_condition_type,
            discount_percentage: schemeForm.discount_percentage,
            discount_amount: schemeForm.discount_amount,
            free_quantity: schemeForm.free_quantity,
            buy_quantity: schemeForm.buy_quantity,
            free_product_id: schemeForm.free_product_id || null,
            bundle_product_ids: schemeForm.bundle_product_ids,
            bundle_discount_amount: schemeForm.bundle_discount_amount,
            bundle_discount_percentage: schemeForm.bundle_discount_percentage,
            tier_data: schemeForm.tier_data,
            is_first_order_only: schemeForm.is_first_order_only,
            validity_days: schemeForm.validity_days,
            min_order_value: schemeForm.min_order_value,
            is_active: schemeForm.is_active,
            start_date: schemeForm.start_date || null,
            end_date: schemeForm.end_date || null,
            applicability_type: schemeForm.applicability_type,
            priority: schemeForm.priority,
            exclusion_group: schemeForm.exclusion_group || null
          })
          .select('id')
          .single();
        
        if (error) throw error;
        schemeId = data?.id;
      }

      // Save applicability rules
      if (schemeId && schemeForm.applicability_type === 'targeted' && applicabilityRules.length > 0) {
        // Delete existing rules
        await supabase.from('scheme_applicability').delete().eq('scheme_id', schemeId);
        
        // Insert new rules
        const rulesToInsert = applicabilityRules.map(rule => ({
          scheme_id: schemeId,
          applicability_level: rule.level,
          entity_id: rule.entityId || null,
          entity_name: rule.entityName,
          include_children: rule.includeChildren
        }));
        
        await supabase.from('scheme_applicability').insert(rulesToInsert);
      } else if (schemeId && schemeForm.applicability_type === 'global') {
        // Clear rules if global
        await supabase.from('scheme_applicability').delete().eq('scheme_id', schemeId);
      }

      toast.success(schemeForm.id ? 'Scheme updated successfully' : 'Scheme created successfully');
      setIsSchemeDialogOpen(false);
      setSchemeForm(initialSchemeForm);
      setApplicabilityRules([]);
      fetchSchemes();
    } catch (error) {
      console.error('Error saving scheme:', error);
      toast.error('Failed to save scheme');
    }
  };

  const handleDeleteScheme = async (id: string, name: string) => {
    setDeleteConfirm({ open: true, id, name });
  };

  const executeDeleteScheme = async () => {
    try {
      const schemeData = schemes.find(s => s.id === deleteConfirm.id);
      if (schemeData) {
        await moveToRecycleBin({
          tableName: 'product_schemes',
          recordId: deleteConfirm.id,
          recordData: schemeData,
          moduleName: 'Product Schemes',
          recordName: schemeData.name
        });
      }
      
      const { error } = await supabase
        .from('product_schemes')
        .delete()
        .eq('id', deleteConfirm.id);
      
      if (error) throw error;
      toast.success('Scheme moved to recycle bin');
      fetchSchemes();
      setDeleteConfirm({ open: false, id: '', name: '' });
    } catch (error) {
      console.error('Error deleting scheme:', error);
      toast.error('Failed to delete scheme');
    }
  };

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedSchemes.length === 0) {
      toast.error('Please select schemes first');
      return;
    }
    
    try {
      setBulkActionLoading(true);
      const { error } = await supabase
        .from('product_schemes')
        .update({ is_active: activate })
        .in('id', selectedSchemes);
      
      if (error) throw error;
      toast.success(`${selectedSchemes.length} scheme(s) ${activate ? 'activated' : 'deactivated'}`);
      setSelectedSchemes([]);
      fetchSchemes();
    } catch (error) {
      console.error('Error updating schemes:', error);
      toast.error('Failed to update schemes');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSchemes(filteredSchemes.map(s => s.id));
    } else {
      setSelectedSchemes([]);
    }
  };

  const handleSelectScheme = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSchemes([...selectedSchemes, id]);
    } else {
      setSelectedSchemes(selectedSchemes.filter(s => s !== id));
    }
  };

  const openEditDialog = (scheme: ProductScheme) => {
    setSchemeForm({
      id: scheme.id,
      product_id: scheme.product_id || '',
      variant_id: scheme.variant_id || 'all',
      category_id: scheme.category_id || '',
      name: scheme.name,
      description: scheme.description || '',
      scheme_type: scheme.scheme_type,
      condition_quantity: scheme.condition_quantity,
      quantity_condition_type: scheme.quantity_condition_type || 'more_than',
      discount_percentage: scheme.discount_percentage,
      discount_amount: scheme.discount_amount,
      free_quantity: scheme.free_quantity,
      buy_quantity: scheme.buy_quantity || 0,
      free_product_id: scheme.free_product_id || '',
      bundle_product_ids: scheme.bundle_product_ids || [],
      bundle_discount_amount: scheme.bundle_discount_amount || 0,
      bundle_discount_percentage: scheme.bundle_discount_percentage || 0,
      tier_data: scheme.tier_data || [],
      is_first_order_only: scheme.is_first_order_only || false,
      validity_days: scheme.validity_days || null,
      min_order_value: scheme.min_order_value || 0,
      is_active: scheme.is_active,
      start_date: scheme.start_date || '',
      end_date: scheme.end_date || '',
      applicability_type: ((scheme as any).applicability_type as 'global' | 'targeted' | 'hybrid') || 'global',
      priority: (scheme as any).priority || 0,
      exclusion_group: (scheme as any).exclusion_group || ''
    });
    // Load applicability rules for this scheme
    loadApplicabilityRules(scheme.id);
    setIsSchemeDialogOpen(true);
  };

  const loadApplicabilityRules = async (schemeId: string) => {
    try {
      const { data } = await supabase
        .from('scheme_applicability')
        .select('*')
        .eq('scheme_id', schemeId);
      
      if (data) {
        setApplicabilityRules(data.map(r => ({
          level: r.applicability_level as ApplicabilityRule['level'],
          entityId: r.entity_id || '',
          entityName: r.entity_name || '',
          includeChildren: r.include_children ?? true
        })));
      } else {
        setApplicabilityRules([]);
      }
    } catch (error) {
      console.error('Error loading applicability rules:', error);
      setApplicabilityRules([]);
    }
  };

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter(scheme => {
      const matchesSearch = 
        scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scheme.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scheme.product?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || scheme.scheme_type === typeFilter;
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && scheme.is_active) ||
        (statusFilter === 'inactive' && !scheme.is_active);
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [schemes, searchQuery, typeFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return {
      total: schemes.length,
      active: schemes.filter(s => s.is_active).length,
      inactive: schemes.filter(s => !s.is_active).length,
      expiringSoon: schemes.filter(s => {
        if (!s.end_date || !s.is_active) return false;
        const endDate = new Date(s.end_date);
        return endDate > now && endDate <= sevenDaysFromNow;
      }).length
    };
  }, [schemes]);

  // Unique scheme types for filter
  const schemeTypes = useMemo(() => {
    return [...new Set(schemes.map(s => s.scheme_type))];
  }, [schemes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Gift className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Schemes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Gift className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Schemes & Offers
              </CardTitle>
              <CardDescription>
                Manage promotional schemes, discounts, and special offers
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <SchemePolicyConfig />
              <Dialog open={isSchemeDialogOpen} onOpenChange={(open) => {
                setIsSchemeDialogOpen(open);
                if (!open) {
                  setApplicabilityRules([]);
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setSchemeForm(initialSchemeForm);
                    setApplicabilityRules([]);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scheme
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>{schemeForm.id ? 'Edit Scheme' : 'Add New Scheme'}</DialogTitle>
                    <DialogDescription>
                      {schemeForm.id ? 'Update scheme details' : 'Create a new promotional scheme'}
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="details">Scheme Details</TabsTrigger>
                      <TabsTrigger value="applicability">
                        <MapPin className="h-4 w-4 mr-1" />
                        Targeting
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="details">
                      <ScrollArea className="h-[55vh] pr-4">
                        <SchemeFormFields 
                          schemeForm={schemeForm} 
                          setSchemeForm={setSchemeForm}
                          products={products}
                          categories={categories}
                        />
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="applicability">
                      <ScrollArea className="h-[55vh] pr-4">
                        <SchemeApplicabilitySelector
                          applicabilityType={schemeForm.applicability_type}
                          setApplicabilityType={(type) => setSchemeForm({ ...schemeForm, applicability_type: type })}
                          applicabilityRules={applicabilityRules}
                          setApplicabilityRules={setApplicabilityRules}
                        />
                        
                        {/* Priority & Exclusion Group */}
                        <div className="mt-6 space-y-4 border-t pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Priority</label>
                              <p className="text-xs text-muted-foreground mb-2">Higher = evaluated first</p>
                              <Input
                                type="number"
                                value={schemeForm.priority}
                                onChange={(e) => setSchemeForm({ ...schemeForm, priority: parseInt(e.target.value) || 0 })}
                                min={0}
                                max={100}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Exclusion Group</label>
                              <p className="text-xs text-muted-foreground mb-2">Mutually exclusive schemes</p>
                              <Input
                                value={schemeForm.exclusion_group}
                                onChange={(e) => setSchemeForm({ ...schemeForm, exclusion_group: e.target.value })}
                                placeholder="e.g., festival_offers"
                              />
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSchemeDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSchemeSubmit}>
                      {schemeForm.id ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, description, or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Scheme Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {schemeTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedSchemes.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedSchemes.length} selected</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkActivate(true)}
                disabled={bulkActionLoading}
              >
                Activate
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkActivate(false)}
                disabled={bulkActionLoading}
              >
                Deactivate
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setSelectedSchemes([])}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Schemes Table */}
          <ScrollArea className="h-[500px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedSchemes.length === filteredSchemes.length && filteredSchemes.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Scheme Name</TableHead>
                  <TableHead>Product/Category</TableHead>
                  <TableHead>Targeting</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchemes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No schemes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSchemes.map((scheme) => (
                    <TableRow key={scheme.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSchemes.includes(scheme.id)}
                          onCheckedChange={(checked) => handleSelectScheme(scheme.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {scheme.name}
                          {scheme.is_first_order_only && (
                            <Badge variant="outline" className="ml-2 text-xs">First Order</Badge>
                          )}
                        </div>
                        {scheme.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {scheme.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {scheme.product?.name || scheme.category?.name || 'All Products'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            (scheme as any).applicability_type === 'targeted' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        >
                          {(scheme as any).applicability_type === 'targeted' ? (
                            <><MapPin className="h-3 w-3 mr-1" />Targeted</>
                          ) : (
                            <><Globe className="h-3 w-3 mr-1" />Global</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {scheme.scheme_type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SchemeDetailsDisplay scheme={scheme} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={scheme.is_active ? 'default' : 'secondary'}>
                          {scheme.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(scheme)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteScheme(scheme.id, scheme.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheme</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm.name}"? This action will move the scheme to the recycle bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteScheme}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
