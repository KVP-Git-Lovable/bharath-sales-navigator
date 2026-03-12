import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Loader2, Target } from 'lucide-react';
import { useTargetTypes, TargetType } from '@/hooks/useTargetTypes';

const METRIC_OPTIONS = [
  { value: 'revenue', label: 'Revenue (₹)' },
  { value: 'quantity', label: 'Quantity (Units)' },
  { value: 'visits', label: 'Visits (Count)' },
  { value: 'count', label: 'Count' },
];

export function TargetTypesTab() {
  const { targetTypes, isLoading, create, update, remove, isCreating, isUpdating } = useTargetTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TargetType | null>(null);
  const [form, setForm] = useState({ name: '', metric: 'revenue', description: '' });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', metric: 'revenue', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (t: TargetType) => {
    setEditing(t);
    setForm({ name: t.name, metric: t.metric, description: t.description || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      await update({ id: editing.id, name: form.name, metric: form.metric, description: form.description || null });
    } else {
      await create({ name: form.name, metric: form.metric, description: form.description || undefined });
    }
    setDialogOpen(false);
  };

  const handleToggleActive = async (t: TargetType) => {
    await update({ id: t.id, is_active: !t.is_active });
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
              <Target className="h-5 w-5" />
              Target Types
            </CardTitle>
            <CardDescription>Define what types of targets your organization tracks</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Type
          </Button>
        </CardHeader>
        <CardContent>
          {targetTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No target types defined yet. Create your first one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targetTypes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {METRIC_OPTIONS.find(m => m.value === t.metric)?.label || t.metric}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {t.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Switch checked={t.is_active} onCheckedChange={() => handleToggleActive(t)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(t.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Target Type' : 'Create Target Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sales Target"
              />
            </div>
            <div>
              <Label>Metric</Label>
              <Select value={form.metric} onValueChange={(v) => setForm(f => ({ ...f, metric: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isCreating || isUpdating || !form.name.trim()}>
              {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
