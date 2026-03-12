import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Loader2, FileText } from 'lucide-react';
import { useTargetPolicies, TargetPolicy, EnabledParameters } from '@/hooks/useTargetPolicies';
import { useTargetTypes } from '@/hooks/useTargetTypes';

const PERIOD_OPTIONS = [
  { value: 'annual', label: 'Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
];

const PARAMETER_KEYS: { key: keyof EnabledParameters; label: string }[] = [
  { key: 'product', label: 'Product' },
  { key: 'retailer', label: 'Retailer' },
  { key: 'beat', label: 'Beat' },
  { key: 'distributor', label: 'Distributor' },
  { key: 'territory', label: 'Territory' },
  { key: 'monthly', label: 'Monthly Breakdown' },
];

export function TargetPoliciesTab() {
  const { policies, isLoading, create, update, remove, isCreating } = useTargetPolicies();
  const { targetTypes } = useTargetTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TargetPolicy | null>(null);
  const [form, setForm] = useState({
    name: '',
    target_type_id: '',
    period_type: 'annual',
    quantity_unit: '',
    enabled_parameters: {} as EnabledParameters,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', target_type_id: targetTypes[0]?.id || '', period_type: 'annual', quantity_unit: '', enabled_parameters: {} });
    setDialogOpen(true);
  };

  const openEdit = (p: TargetPolicy) => {
    setEditing(p);
    setForm({
      name: p.name,
      target_type_id: p.target_type_id,
      period_type: p.period_type,
      quantity_unit: p.quantity_unit || '',
      enabled_parameters: p.enabled_parameters || {},
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.target_type_id) return;
    const payload = {
      name: form.name,
      target_type_id: form.target_type_id,
      period_type: form.period_type,
      quantity_unit: form.quantity_unit || null,
      enabled_parameters: form.enabled_parameters,
    };
    if (editing) {
      await update({ id: editing.id, ...payload });
    } else {
      await create(payload);
    }
    setDialogOpen(false);
  };

  const toggleParam = (key: keyof EnabledParameters) => {
    setForm(f => ({
      ...f,
      enabled_parameters: { ...f.enabled_parameters, [key]: !f.enabled_parameters[key] },
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Target Policies
            </CardTitle>
            <CardDescription>Configure how each target type works — period, unit, and breakdown dimensions</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-2" disabled={targetTypes.length === 0}>
            <Plus className="h-4 w-4" /> Add Policy
          </Button>
        </CardHeader>
        <CardContent>
          {targetTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Create at least one Target Type first before defining policies.</p>
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No policies defined yet. Create your first policy.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Name</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => {
                  const activeParams = PARAMETER_KEYS.filter(pk => p.enabled_parameters?.[pk.key]);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.target_type?.name || '—'}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{p.period_type}</TableCell>
                      <TableCell>{p.quantity_unit || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {activeParams.length > 0 ? activeParams.map(pk => (
                            <Badge key={pk.key} variant="secondary" className="text-xs">{pk.label}</Badge>
                          )) : <span className="text-muted-foreground text-xs">None</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={p.is_active} onCheckedChange={() => update({ id: p.id, is_active: !p.is_active })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(p.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Policy' : 'Create Policy'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Policy Name</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. FY25 Sales Policy" />
            </div>
            <div>
              <Label>Target Type</Label>
              <Select value={form.target_type_id} onValueChange={(v) => setForm(f => ({ ...f, target_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {targetTypes.filter(t => t.is_active).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Type</Label>
                <Select value={form.period_type} onValueChange={(v) => setForm(f => ({ ...f, period_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity Unit</Label>
                <Input value={form.quantity_unit} onChange={(e) => setForm(f => ({ ...f, quantity_unit: e.target.value }))} placeholder="e.g. Kg, Units" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Enabled Parameters</Label>
              <div className="grid grid-cols-2 gap-2">
                {PARAMETER_KEYS.map(pk => (
                  <label key={pk.key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={!!form.enabled_parameters[pk.key]}
                      onCheckedChange={() => toggleParam(pk.key)}
                    />
                    <span className="text-sm">{pk.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isCreating || !form.name.trim() || !form.target_type_id}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
