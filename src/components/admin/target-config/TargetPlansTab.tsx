import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Lock, Unlock, ClipboardList } from 'lucide-react';
import { useTargetPlans, TargetPlan } from '@/hooks/useTargetPlans';
import { useTargetPolicies } from '@/hooks/useTargetPolicies';

interface TargetPlansTabProps {
  fyYear: number;
}

export function TargetPlansTab({ fyYear }: TargetPlansTabProps) {
  const { plans, isLoading, create, update, remove, lock, isCreating } = useTargetPlans(fyYear);
  const { policies } = useTargetPolicies();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TargetPlan | null>(null);
  const [lockConfirm, setLockConfirm] = useState<{ id: string; lock: boolean } | null>(null);
  const [form, setForm] = useState({
    name: '',
    policy_id: '',
    total_target_value: 0,
    total_secondary_value: 0,
    total_visits_target: 0,
    target_start_month: 1,
    target_end_month: 12,
  });

  const activePolicies = policies.filter(p => p.is_active);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: `FY ${fyYear - 1}-${String(fyYear).slice(-2)} Plan`,
      policy_id: activePolicies[0]?.id || '',
      total_target_value: 0,
      total_secondary_value: 0,
      total_visits_target: 0,
      target_start_month: 1,
      target_end_month: 12,
    });
    setDialogOpen(true);
  };

  const openEdit = (p: TargetPlan) => {
    setEditing(p);
    setForm({
      name: p.name,
      policy_id: p.policy_id,
      total_target_value: p.total_target_value,
      total_secondary_value: p.total_secondary_value,
      total_visits_target: p.total_visits_target,
      target_start_month: p.target_start_month,
      target_end_month: p.target_end_month,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.policy_id) return;
    if (editing) {
      await update({ id: editing.id, ...form });
    } else {
      await create({ ...form, fy_year: fyYear });
    }
    setDialogOpen(false);
  };

  const handleLockConfirm = async () => {
    if (lockConfirm) {
      await lock(lockConfirm);
      setLockConfirm(null);
    }
  };

  const selectedPolicy = activePolicies.find(p => p.id === form.policy_id);
  const selectedMetric = selectedPolicy?.target_type?.metric;

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
              <ClipboardList className="h-5 w-5" />
              Target Plans — FY {fyYear - 1}-{String(fyYear).slice(-2)}
            </CardTitle>
            <CardDescription>Create concrete plans with company-wide totals, then lock to enable allocation</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-2" disabled={activePolicies.length === 0}>
            <Plus className="h-4 w-4" /> Add Plan
          </Button>
        </CardHeader>
        <CardContent>
          {activePolicies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Create at least one active Target Policy before creating plans.</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No plans for this FY yet. Create one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Target Value</TableHead>
                  <TableHead>Months</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => {
                  const metric = p.policy?.target_type?.metric;
                  const formatValue = (v: number) => {
                    if (metric === 'revenue') return `₹${v.toLocaleString('en-IN')}`;
                    return v.toLocaleString('en-IN');
                  };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.policy?.name || '—'}</Badge>
                      </TableCell>
                      <TableCell>{formatValue(p.total_target_value)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.target_start_month}–{p.target_end_month}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_locked ? 'default' : 'secondary'}>
                          {p.is_locked ? 'Locked' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLockConfirm({ id: p.id, lock: !p.is_locked })}
                            title={p.is_locked ? 'Unlock' : 'Lock'}
                          >
                            {p.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
                          {!p.is_locked && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => remove(p.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan Name</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Policy</Label>
              <Select value={form.policy_id} onValueChange={(v) => setForm(f => ({ ...f, policy_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                <SelectContent>
                  {activePolicies.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.target_type?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {selectedMetric === 'revenue' ? 'Total Revenue Target (₹)' :
                 selectedMetric === 'quantity' ? `Total Quantity Target (${selectedPolicy?.quantity_unit || 'Units'})` :
                 selectedMetric === 'visits' ? 'Total Visits Target' : 'Total Target Value'}
              </Label>
              <Input
                type="number"
                value={form.total_target_value}
                onChange={(e) => setForm(f => ({ ...f, total_target_value: Number(e.target.value) }))}
              />
            </div>
            {selectedMetric === 'revenue' && (
              <div>
                <Label>Secondary Value (Quantity, optional)</Label>
                <Input
                  type="number"
                  value={form.total_secondary_value}
                  onChange={(e) => setForm(f => ({ ...f, total_secondary_value: Number(e.target.value) }))}
                />
              </div>
            )}
            {selectedMetric !== 'visits' && (
              <div>
                <Label>Total Visits Target (optional)</Label>
                <Input
                  type="number"
                  value={form.total_visits_target}
                  onChange={(e) => setForm(f => ({ ...f, total_visits_target: Number(e.target.value) }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Month</Label>
                <Input type="number" min={1} max={12} value={form.target_start_month} onChange={(e) => setForm(f => ({ ...f, target_start_month: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>End Month</Label>
                <Input type="number" min={1} max={12} value={form.target_end_month} onChange={(e) => setForm(f => ({ ...f, target_end_month: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isCreating || !form.name.trim() || !form.policy_id}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock/Unlock Confirmation */}
      <AlertDialog open={!!lockConfirm} onOpenChange={() => setLockConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lockConfirm?.lock ? 'Lock this plan?' : 'Unlock this plan?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {lockConfirm?.lock
                ? 'Locking will prevent edits and enable hierarchy allocation for this plan.'
                : 'Unlocking will allow edits but may affect existing allocations.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLockConfirm}>
              {lockConfirm?.lock ? 'Lock' : 'Unlock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
