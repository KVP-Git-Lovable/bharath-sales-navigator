import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Shield, Save, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { toast } from 'sonner';

// Module → Feature structure
const MODULES = [
  {
    name: 'attendance',
    label: 'Attendance',
    features: [
      { name: 'attendance_check_in_out', label: 'Check-in / Check-out' },
      { name: 'attendance_face_verification', label: 'Face Verification' },
      { name: 'attendance_leave_applications', label: 'Leave Applications' },
      { name: 'attendance_regularization_requests', label: 'Regularization Requests' },
      { name: 'attendance_holiday_list', label: 'Holiday List' },
      { name: 'attendance_timeline_view', label: 'Timeline View' },
      { name: 'attendance_journey_map', label: 'Journey Map' },
      { name: 'attendance_statistics', label: 'Attendance Statistics' },
      { name: 'attendance_photo_capture', label: 'Photo Capture' },
    ]
  },
  {
    name: 'my_visit',
    label: 'My Visit',
    features: [
      { name: 'visit_list', label: 'Visit List' },
      { name: 'visit_cards', label: 'Visit Cards' },
      { name: 'visit_check_in_verification', label: 'Check-in Verification' },
      { name: 'visit_order_entry', label: 'Order Entry' },
      { name: 'visit_no_order_reasons', label: 'No-Order Reasons' },
      { name: 'visit_points_gamification', label: 'Points / Gamification' },
      { name: 'visit_ai_recommendations', label: 'AI Recommendations' },
      { name: 'visit_create_visit', label: 'Create Visit' },
      { name: 'visit_insights_panel', label: 'Insights Panel' },
      { name: 'visit_van_stock_management', label: 'Van Stock Management' },
      { name: 'visit_export_visits', label: 'Export Visits' },
      { name: 'visit_sync_data', label: 'Sync Data' },
    ]
  },
  {
    name: 'all_retailers',
    label: 'All Retailers',
    features: [
      { name: 'retailer_list', label: 'Retailer List' },
      { name: 'retailer_add', label: 'Add Retailer' },
      { name: 'retailer_detail', label: 'Retailer Detail' },
      { name: 'retailer_category_filter', label: 'Category Filter' },
      { name: 'retailer_beat_assignment', label: 'Beat Assignment' },
      { name: 'retailer_credit_score', label: 'Credit Score' },
      { name: 'retailer_order_history', label: 'Order History' },
      { name: 'retailer_analytics', label: 'Retailer Analytics' },
      { name: 'retailer_bulk_import', label: 'Bulk Import' },
      { name: 'retailer_location_map', label: 'Location Map' },
    ]
  },
  {
    name: 'my_target',
    label: 'My Target',
    features: [
      { name: 'target_overview', label: 'Target Overview' },
      { name: 'target_period_selection', label: 'Period Selection' },
      { name: 'target_achievement_percentage', label: 'Achievement Percentage' },
      { name: 'target_territory_performance', label: 'Territory Performance' },
      { name: 'target_beat_performance', label: 'Beat Performance' },
      { name: 'target_retailer_performance', label: 'Retailer Performance' },
      { name: 'target_ai_recommendations', label: 'AI Recommendations' },
      { name: 'target_shortfall_analysis', label: 'Shortfall Analysis' },
    ]
  },
  {
    name: 'performance',
    label: 'Performance',
    features: [
      { name: 'performance_overall', label: 'Overall Performance' },
      { name: 'performance_territory_breakdown', label: 'Territory Breakdown' },
      { name: 'performance_beat_breakdown', label: 'Beat Breakdown' },
      { name: 'performance_retailer_breakdown', label: 'Retailer Breakdown' },
      { name: 'performance_period_comparison', label: 'Period Comparison' },
      { name: 'performance_trend_analysis', label: 'Trend Analysis' },
      { name: 'performance_leaderboard', label: 'Leaderboard' },
    ]
  },
  {
    name: 'analytics',
    label: 'Analytics',
    features: [
      { name: 'analytics_business_summary', label: 'Business Summary' },
      { name: 'analytics_beat_details', label: 'Beat Details' },
      { name: 'analytics_retailer_details', label: 'Retailer Details' },
      { name: 'analytics_order_details', label: 'Order Details' },
      { name: 'analytics_product_breakdown', label: 'Product Breakdown' },
      { name: 'analytics_pending_payments', label: 'Pending Payments' },
      { name: 'analytics_user_filter', label: 'User Filter' },
      { name: 'analytics_date_range_picker', label: 'Date Range Picker' },
      { name: 'analytics_performance_calendar', label: 'Performance Calendar' },
      { name: 'analytics_leaderboard', label: 'Leaderboard' },
    ]
  },
  {
    name: 'institutional_sales',
    label: 'Institutional Sales',
    features: [
      { name: 'institutional_dashboard', label: 'Dashboard' },
      { name: 'institutional_leads', label: 'Leads' },
      { name: 'institutional_accounts', label: 'Accounts' },
      { name: 'institutional_contacts', label: 'Contacts' },
      { name: 'institutional_opportunities', label: 'Opportunities' },
      { name: 'institutional_quotes', label: 'Quotes' },
      { name: 'institutional_order_commitments', label: 'Order Commitments' },
      { name: 'institutional_invoices', label: 'Invoices' },
      { name: 'institutional_price_books', label: 'Price Books' },
      { name: 'institutional_collections', label: 'Collections' },
      { name: 'institutional_products', label: 'Products' },
    ]
  },
  {
    name: 'distributor_master',
    label: 'Distributor Master',
    features: [
      { name: 'distributor_list', label: 'Distributor List' },
      { name: 'distributor_add', label: 'Add Distributor' },
      { name: 'distributor_detail', label: 'Distributor Detail' },
      { name: 'distributor_edit', label: 'Edit Distributor' },
      { name: 'distributor_partnership_status', label: 'Partnership Status' },
      { name: 'distributor_fleet_size', label: 'Fleet Size' },
      { name: 'distributor_coverage_area', label: 'Coverage Area' },
      { name: 'distributor_retailer_mapping', label: 'Retailer Mapping' },
    ]
  },
  {
    name: 'primary_orders',
    label: 'Primary Orders',
    features: [
      { name: 'primary_order_list', label: 'Order List' },
      { name: 'primary_order_status', label: 'Order Status' },
      { name: 'primary_order_create', label: 'Create Order' },
      { name: 'primary_order_details', label: 'Order Details' },
      { name: 'primary_order_transporter_info', label: 'Transporter Info' },
      { name: 'primary_order_dispatch_date', label: 'Dispatch Date' },
      { name: 'primary_order_inventory_sync', label: 'Inventory Sync' },
    ]
  },
  {
    name: 'territories',
    label: 'Territories',
    features: [
      { name: 'territory_list', label: 'Territory List' },
      { name: 'territory_detail', label: 'Territory Detail' },
      { name: 'territory_assignment', label: 'Territory Assignment' },
      { name: 'territory_region_management', label: 'Region Management' },
      { name: 'territory_coverage_statistics', label: 'Coverage Statistics' },
    ]
  },
  {
    name: 'gps_track',
    label: 'GPS Track',
    features: [
      { name: 'gps_live_tracking', label: 'Live Tracking' },
      { name: 'gps_journey_playback', label: 'Journey Playback' },
      { name: 'gps_visit_statistics', label: 'Visit Statistics' },
      { name: 'gps_distance_traveled', label: 'Distance Traveled' },
      { name: 'gps_time_analytics', label: 'Time Analytics' },
      { name: 'gps_team_status', label: 'Team Status' },
    ]
  },
  {
    name: 'my_beats',
    label: 'My Beats',
    features: [
      { name: 'beat_list', label: 'Beat List' },
      { name: 'beat_create', label: 'Create Beat' },
      { name: 'beat_detail', label: 'Beat Detail' },
      { name: 'beat_schedule', label: 'Beat Schedule' },
      { name: 'beat_analytics', label: 'Beat Analytics' },
      { name: 'beat_retailer_assignment', label: 'Retailer Assignment' },
      { name: 'beat_travel_allowance', label: 'Travel Allowance' },
    ]
  },
  {
    name: 'competition_master',
    label: 'Competition Master',
    features: [
      { name: 'competition_competitor_list', label: 'Competitor List' },
      { name: 'competition_competitor_detail', label: 'Competitor Detail' },
      { name: 'competition_sales_team_size', label: 'Sales Team Size' },
      { name: 'competition_regional_presence', label: 'Regional Presence' },
      { name: 'competition_sku_comparison', label: 'SKU Comparison' },
      { name: 'competition_swot_analysis', label: 'SWOT Analysis' },
      { name: 'competition_news_articles', label: 'News Articles' },
    ]
  },
  {
    name: 'check_schemes',
    label: 'Check Schemes',
    features: [
      { name: 'scheme_active_schemes', label: 'Active Schemes' },
      { name: 'scheme_types', label: 'Scheme Types' },
      { name: 'scheme_validity_tracking', label: 'Validity Tracking' },
      { name: 'scheme_details', label: 'Scheme Details' },
      { name: 'scheme_applicability', label: 'Applicability' },
      { name: 'scheme_tiered_offers', label: 'Tiered Offers' },
    ]
  },
  {
    name: 'my_expenses',
    label: 'My Expenses',
    features: [
      { name: 'expense_beat_allowance', label: 'Beat Allowance' },
      { name: 'expense_claims', label: 'Expense Claims' },
      { name: 'expense_claim_history', label: 'Claim History' },
      { name: 'expense_approval_status', label: 'Approval Status' },
      { name: 'expense_distance_calculation', label: 'Distance-based Calculation' },
    ]
  },
];

interface ObjectPermission {
  id: string;
  profile_id: string;
  object_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_view_all: boolean;
  can_modify_all: boolean;
}

export const ObjectPermissions = () => {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<ObjectPermission>>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Fetch profiles
  const { data: profiles } = useQuery({
    queryKey: ['security-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_profiles')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch permissions for selected profile
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['profile-object-permissions', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      
      const { data, error } = await supabase
        .from('profile_object_permissions')
        .select('*')
        .eq('profile_id', selectedProfileId);
      
      if (error) throw error;
      return data as ObjectPermission[];
    },
    enabled: !!selectedProfileId
  });

  // Save mutations
  const saveMutation = useMutation({
    mutationFn: async (changes: Record<string, Partial<ObjectPermission>>) => {
      const updates = Object.entries(changes).map(([objectName, perms]) => ({
        profile_id: selectedProfileId,
        object_name: objectName,
        ...perms
      }));

      const { error } = await supabase
        .from('profile_object_permissions')
        .upsert(updates, { onConflict: 'profile_id,object_name' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-object-permissions'] });
      setPendingChanges({});
      toast.success('Permissions updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update permissions');
    }
  });

  const handlePermissionChange = (objectName: string, field: string, value: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [objectName]: {
        ...prev[objectName],
        [field]: value
      }
    }));
  };

  const getPermissionValue = (objectName: string, field: string): boolean => {
    if (pendingChanges[objectName]?.[field] !== undefined) {
      return pendingChanges[objectName][field] as boolean;
    }
    const perm = permissions?.find(p => p.object_name === objectName);
    return perm?.[field as keyof ObjectPermission] as boolean || false;
  };

  const handleSave = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info('No changes to save');
      return;
    }
    saveMutation.mutate(pendingChanges);
  };

  const toggleModule = (moduleName: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleName)) {
        newSet.delete(moduleName);
      } else {
        newSet.add(moduleName);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedModules(new Set(MODULES.map(m => m.name)));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // Count enabled permissions per module
  const getModuleEnabledCount = (moduleName: string) => {
    const module = MODULES.find(m => m.name === moduleName);
    if (!module) return 0;
    
    let count = 0;
    module.features.forEach(feature => {
      const fields = ['can_read', 'can_create', 'can_edit', 'can_delete', 'can_view_all', 'can_modify_all'];
      fields.forEach(field => {
        if (getPermissionValue(feature.name, field)) count++;
      });
    });
    return count;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Object Permissions</CardTitle>
            <CardDescription>Configure what features each profile can access</CardDescription>
          </div>
          {hasPendingChanges && (
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Selector */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label>Select Profile</Label>
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Choose a profile to configure" />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {profile.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProfileId && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          )}
        </div>

        {/* Module-based Permissions */}
        {selectedProfileId && (
          <div className="space-y-3">
            {MODULES.map((module) => {
              const isExpanded = expandedModules.has(module.name);
              const enabledCount = getModuleEnabledCount(module.name);
              
              return (
                <Collapsible
                  key={module.name}
                  open={isExpanded}
                  onOpenChange={() => toggleModule(module.name)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted/70 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Layers className="h-4 w-4 text-primary" />
                          <span className="font-medium">{module.label}</span>
                          <span className="text-xs text-muted-foreground">
                            ({module.features.length} features)
                          </span>
                        </div>
                        {enabledCount > 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {enabledCount} permissions enabled
                          </span>
                        )}
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-background">
                            <TableHead className="w-[250px]">Feature</TableHead>
                            <TableHead className="text-center w-[100px]">Read</TableHead>
                            <TableHead className="text-center w-[100px]">Create</TableHead>
                            <TableHead className="text-center w-[100px]">Edit</TableHead>
                            <TableHead className="text-center w-[100px]">Delete</TableHead>
                            <TableHead className="text-center w-[100px]">View All</TableHead>
                            <TableHead className="text-center w-[100px]">Modify All</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {module.features.map((feature) => (
                            <TableRow key={feature.name}>
                              <TableCell className="font-medium text-sm">
                                {feature.label}
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_read')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_read', checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_create')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_create', checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_edit')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_edit', checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_delete')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_delete', checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_view_all')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_view_all', checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={getPermissionValue(feature.name, 'can_modify_all')}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(feature.name, 'can_modify_all', checked as boolean)
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}

        {!selectedProfileId && (
          <div className="text-center py-12 text-muted-foreground">
            Select a profile to configure its permissions
          </div>
        )}

        {/* Legend */}
        {selectedProfileId && (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Read:</strong> View records
                </div>
                <div>
                  <strong>Create:</strong> Add new records
                </div>
                <div>
                  <strong>Edit:</strong> Update own records
                </div>
                <div>
                  <strong>Delete:</strong> Remove own records
                </div>
                <div>
                  <strong>View All:</strong> See all users' records
                </div>
                <div>
                  <strong>Modify All:</strong> Edit/delete all records
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
