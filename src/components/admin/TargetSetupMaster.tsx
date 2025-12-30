import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Target } from 'lucide-react';

const BAND_OPTIONS = [1, 2, 3, 4, 5];
const UOM_OPTIONS = ['Units', 'KG', 'Liters', 'Pieces', 'Cases', 'Boxes', 'Cartons', 'Packs'];

interface TargetSetup {
  id: string;
  band: number;
  territory_id: string | null;
  state_territory_id: string | null;
  annual_revenue_target: number;
  annual_quantity_target: number;
  unit_of_measure: string;
  created_at: string;
  territory?: { id: string; name: string } | null;
  state_territory?: { id: string; name: string } | null;
}

export const TargetSetupMaster = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    band: '',
    territory_id: '',
    state_territory_id: '',
    annual_revenue_target: '',
    annual_quantity_target: '',
    unit_of_measure: 'Units'
  });

  // Fetch territories
  const { data: territories } = useQuery({
    queryKey: ['territories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('territories')
        .select('id, name, territory_type')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch target setup records
  const { data: targetSetups, isLoading } = useQuery({
    queryKey: ['target-setup-master'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('target_setup_master')
        .select(`
          *,
          territory:territories!target_setup_master_territory_id_fkey(id, name),
          state_territory:territories!target_setup_master_state_territory_id_fkey(id, name)
        `)
        .order('band');
      if (error) throw error;
      return data as TargetSetup[];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('target_setup_master')
        .insert({
          band: parseInt(formData.band),
          territory_id: formData.territory_id || null,
          state_territory_id: formData.state_territory_id || null,
          annual_revenue_target: parseFloat(formData.annual_revenue_target) || 0,
          annual_quantity_target: parseFloat(formData.annual_quantity_target) || 0,
          unit_of_measure: formData.unit_of_measure,
          created_by: user.id
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-setup-master'] });
      setFormData({
        band: '',
        territory_id: '',
        state_territory_id: '',
        annual_revenue_target: '',
        annual_quantity_target: '',
        unit_of_measure: 'Units'
      });
      toast({ title: 'Success', description: 'Target setup created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('target_setup_master')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-setup-master'] });
      toast({ title: 'Success', description: 'Target setup deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.band) {
      toast({ title: 'Error', description: 'Please select a band', variant: 'destructive' });
      return;
    }
    createMutation.mutate();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Add New Target Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="band">Band *</Label>
              <Select
                value={formData.band}
                onValueChange={(value) => setFormData(prev => ({ ...prev, band: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Band" />
                </SelectTrigger>
                <SelectContent>
                  {BAND_OPTIONS.map((band) => (
                    <SelectItem key={band} value={band.toString()}>
                      Band {band}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="territory">Territory</Label>
              <Select
                value={formData.territory_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, territory_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Territory" />
                </SelectTrigger>
                <SelectContent>
                  {territories?.map((territory) => (
                    <SelectItem key={territory.id} value={territory.id}>
                      {territory.name} {territory.territory_type ? `(${territory.territory_type})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State (Territory)</Label>
              <Select
                value={formData.state_territory_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, state_territory_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {territories?.map((territory) => (
                    <SelectItem key={territory.id} value={territory.id}>
                      {territory.name} {territory.territory_type ? `(${territory.territory_type})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenue">Annual Revenue Target (₹)</Label>
              <Input
                id="revenue"
                type="number"
                placeholder="Enter amount"
                value={formData.annual_revenue_target}
                onChange={(e) => setFormData(prev => ({ ...prev, annual_revenue_target: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Annual Quantity Target</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Enter quantity"
                value={formData.annual_quantity_target}
                onChange={(e) => setFormData(prev => ({ ...prev, annual_quantity_target: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uom">Unit of Measure</Label>
              <Select
                value={formData.unit_of_measure}
                onValueChange={(value) => setFormData(prev => ({ ...prev, unit_of_measure: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select UOM" />
                </SelectTrigger>
                <SelectContent>
                  {UOM_OPTIONS.map((uom) => (
                    <SelectItem key={uom} value={uom}>
                      {uom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Target Setup
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target Setup Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !targetSetups?.length ? (
            <p className="text-center text-muted-foreground py-8">No target setups found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Band</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Annual Revenue Target</TableHead>
                  <TableHead>Annual Quantity Target</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targetSetups.map((setup) => (
                  <TableRow key={setup.id}>
                    <TableCell className="font-medium">Band {setup.band}</TableCell>
                    <TableCell>{setup.territory?.name || '-'}</TableCell>
                    <TableCell>{setup.state_territory?.name || '-'}</TableCell>
                    <TableCell>{formatCurrency(setup.annual_revenue_target)}</TableCell>
                    <TableCell>{setup.annual_quantity_target.toLocaleString()}</TableCell>
                    <TableCell>{setup.unit_of_measure}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(setup.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TargetSetupMaster;
