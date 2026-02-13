import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getUserDataSummary } from '@/utils/userArchiveUtils';

interface UserDeleteDataDialogProps {
  user: { id: string; full_name: string; username: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Module groupings for selective deletion
const MODULE_GROUPS: Record<string, { label: string; categories: string[] }> = {
  orders: { label: 'Orders', categories: ['Sales'] },
  retailers: { label: 'Retailers', categories: [] }, // handled separately
  beats: { label: 'Beats', categories: ['Territory'] },
  visits: { label: 'Visits', categories: [] }, // handled separately
  attendance: { label: 'Attendance & Leave', categories: ['Attendance'] },
  targets: { label: 'Targets & Business Plans', categories: ['Targets'] },
  gamification: { label: 'Gamification', categories: ['Gamification'] },
  gps: { label: 'GPS Tracking', categories: ['Tracking'] },
  communication: { label: 'Communication', categories: ['Communication'] },
  learning: { label: 'Learning & Coaching', categories: ['Learning'] },
  expenses: { label: 'Expenses', categories: ['Expenses'] },
  performance: { label: 'Performance', categories: ['Performance'] },
  competition: { label: 'Competition', categories: ['Competition'] },
  branding: { label: 'Branding', categories: ['Branding'] },
  analytics: { label: 'Analytics', categories: ['Analytics'] },
  employee: { label: 'Employee Data', categories: ['Employee'] },
  jointSales: { label: 'Joint Sales', categories: ['Joint Sales'] },
  distributor: { label: 'Distributor', categories: ['Distributor'] },
  institutional: { label: 'Institutional', categories: ['Institutional'] },
  ai: { label: 'AI & Insights', categories: ['AI'] },
  other: { label: 'Other', categories: ['Other', 'Security'] },
};

// Map specific table names to module keys for tables that need special mapping
const TABLE_TO_MODULE: Record<string, string> = {
  orders: 'orders',
  visits: 'visits',
  retailers: 'retailers',
  invoices: 'orders',
  packing_lists: 'orders',
};

function getModuleForTable(tableName: string, category: string): string {
  if (TABLE_TO_MODULE[tableName]) return TABLE_TO_MODULE[tableName];
  // Find module by category
  for (const [key, group] of Object.entries(MODULE_GROUPS)) {
    if (group.categories.includes(category)) return key;
  }
  return 'other';
}

export const UserDeleteDataDialog: React.FC<UserDeleteDataDialogProps> = ({
  user,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [deleteMode, setDeleteMode] = useState<'all' | 'selective'>('all');
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [dataSummary, setDataSummary] = useState<{ tableName: string; count: number; category: string }[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (open && user) {
      setDeleteMode('all');
      setSelectedModules(new Set());
      setShowConfirm(false);
      fetchDataSummary();
    }
  }, [open, user]);

  const fetchDataSummary = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const summary = await getUserDataSummary(user.id);
      // Filter out Core category (profiles, employees, user_roles, user_profiles) - we don't delete those
      const filtered = summary.filter(s => s.category !== 'Core');
      setDataSummary(filtered);
    } catch (error) {
      console.error('Error fetching data summary:', error);
      toast.error('Failed to load data summary');
    } finally {
      setLoadingData(false);
    }
  };

  // Group data summary by module
  const moduleSummary = React.useMemo(() => {
    const result: Record<string, { label: string; count: number; tables: string[] }> = {};
    for (const item of dataSummary) {
      const moduleKey = getModuleForTable(item.tableName, item.category);
      if (!result[moduleKey]) {
        result[moduleKey] = {
          label: MODULE_GROUPS[moduleKey]?.label || moduleKey,
          count: 0,
          tables: [],
        };
      }
      result[moduleKey].count += item.count;
      result[moduleKey].tables.push(item.tableName);
    }
    return result;
  }, [dataSummary]);

  const totalRecords = dataSummary.reduce((sum, s) => sum + s.count, 0);

  const selectedRecordCount = React.useMemo(() => {
    if (deleteMode === 'all') return totalRecords;
    let count = 0;
    for (const [key, mod] of Object.entries(moduleSummary)) {
      if (selectedModules.has(key)) count += mod.count;
    }
    return count;
  }, [deleteMode, selectedModules, moduleSummary, totalRecords]);

  const toggleModule = (moduleKey: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleKey)) {
        next.delete(moduleKey);
      } else {
        next.add(moduleKey);
      }
      return next;
    });
  };

  const canProceed =
    deleteMode === 'all'
      ? totalRecords > 0
      : selectedModules.size > 0;

  const handleContinue = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const modulesToDelete = deleteMode === 'all'
        ? Object.keys(moduleSummary)
        : Array.from(selectedModules);

      const response = await supabase.functions.invoke('admin-delete-user-data', {
        body: {
          userId: user.id,
          deleteMode,
          selectedModules: modulesToDelete,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const result = response.data;
      if (result?.error) throw new Error(result.error);

      toast.success(
        `Successfully deleted ${result?.totalDeleted || selectedRecordCount} records for "${user.full_name || user.username}". Data archived to Recycle Bin.`
      );
      setShowConfirm(false);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error deleting user data:', error);
      toast.error(error.message || 'Failed to delete user data');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedModulesForConfirm = React.useMemo(() => {
    if (deleteMode === 'all') {
      return Object.entries(moduleSummary).map(([key, mod]) => ({
        key,
        label: mod.label,
        count: mod.count,
      }));
    }
    return Array.from(selectedModules)
      .filter(key => moduleSummary[key])
      .map(key => ({
        key,
        label: moduleSummary[key].label,
        count: moduleSummary[key].count,
      }));
  }, [deleteMode, selectedModules, moduleSummary]);

  if (!user) return null;

  return (
    <>
      <Dialog open={open && !showConfirm} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              Delete User Data
            </DialogTitle>
            <DialogDescription>
              Delete data for "{user.full_name || user.username}"
              <br />
              <span className="text-xs text-muted-foreground">The user account will remain active</span>
            </DialogDescription>
          </DialogHeader>

          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading data summary...</span>
            </div>
          ) : totalRecords === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Database className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No data records found for this user.</p>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Found <span className="text-foreground font-bold">{totalRecords}</span> records across{' '}
                <span className="text-foreground font-bold">{Object.keys(moduleSummary).length}</span> modules
              </div>

              <RadioGroup value={deleteMode} onValueChange={(v) => setDeleteMode(v as 'all' | 'selective')} className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="all" id="delete-all" className="mt-0.5" />
                  <div>
                    <Label htmlFor="delete-all" className="font-medium cursor-pointer">Delete All Data</Label>
                    <p className="text-xs text-muted-foreground">
                      Remove all {totalRecords} records across all modules
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="selective" id="delete-selective" className="mt-0.5" />
                  <div>
                    <Label htmlFor="delete-selective" className="font-medium cursor-pointer">Selective Deletion (Module-wise)</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose specific modules to delete
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {deleteMode === 'selective' && (
                <ScrollArea className="flex-1 h-[40vh] max-h-[400px] border rounded-lg p-1">
                  <div className="space-y-1 p-2">
                    {Object.entries(moduleSummary)
                      .sort(([, a], [, b]) => b.count - a.count)
                      .map(([key, mod]) => (
                        <label
                          key={key}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedModules.has(key)}
                            onCheckedChange={() => toggleModule(key)}
                          />
                          <span className="flex-1 text-sm font-medium">{mod.label}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {mod.count} records
                          </span>
                        </label>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleContinue}
              disabled={!canProceed || loadingData}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Continue to Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Data Deletion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to permanently delete the following data for "{user.full_name || user.username}":</p>
                <ul className="space-y-1">
                  {selectedModulesForConfirm.map(m => (
                    <li key={m.key} className="flex items-center gap-2 text-sm">
                      <Trash2 className="h-3 w-3 text-destructive" />
                      <span className="font-medium">{m.label}:</span>
                      <span>{m.count} records</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs border-t pt-2 text-muted-foreground">
                  Data will be archived to the Recycle Bin before deletion. This action cannot be easily undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Confirm Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
