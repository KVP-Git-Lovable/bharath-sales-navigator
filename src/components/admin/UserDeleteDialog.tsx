import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Trash2, UserCheck, AlertTriangle, Database, ArrowRight, CheckSquare, Square, ChevronDown, ChevronUp, Shuffle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUserDataSummary } from '@/utils/userArchiveUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PartialTransferPicker, PartialSelection } from './PartialTransferPicker';
import { Textarea } from '@/components/ui/textarea';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
}

interface UserDeleteDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface DataSummary {
  tableName: string;
  count: number;
  category: string;
}

interface AvailableUser {
  id: string;
  full_name: string;
  username: string;
}

export const UserDeleteDialog: React.FC<UserDeleteDialogProps> = ({
  user,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [deleteOption, setDeleteOption] = useState<'delete' | 'transfer' | 'partial_transfer'>('delete');
  const [transferToUserId, setTransferToUserId] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [dataSummary, setDataSummary] = useState<DataSummary[]>([]);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showAllTables, setShowAllTables] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [partialSelection, setPartialSelection] = useState<PartialSelection>({
    retailers: [], beats: [], territories: [], distributors: [], vans: [], direct_reports: [],
  });
  const [transferReason, setTransferReason] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [confirmDirectReports, setConfirmDirectReports] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchDataSummary();
      fetchAvailableUsers();
      setDeleteOption('delete');
      setTransferToUserId('');
      setShowAllTables(false);
      setExpandedCategories(new Set());
      setPartialSelection({
        retailers: [], beats: [], territories: [], distributors: [], vans: [], direct_reports: [],
      });
      setTransferReason('');
      setPreviewResult(null);
      setConfirmDirectReports(false);
    }
  }, [open, user]);

  const fetchDataSummary = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const summary = await getUserDataSummary(user.id);
      setDataSummary(summary);
      // Select all tables by default
      setSelectedTables(new Set(summary.map(s => s.tableName)));
    } catch (error) {
      console.error('Error fetching data summary:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAvailableUsers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .neq('id', user.id)
        .order('full_name');
      
      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!user) return;

    if (deleteOption === 'transfer' && !transferToUserId) {
      toast.error('Please select a user to transfer data to');
      return;
    }

    if (deleteOption === 'partial_transfer') {
      if (!transferToUserId) {
        toast.error('Select a target user');
        return;
      }
      if (transferToUserId === user.id) {
        toast.error('Cannot transfer to the same user');
        return;
      }
      const total = Object.values(partialSelection).reduce((s, a) => s + a.length, 0);
      if (total === 0) {
        toast.error('Select at least one record to transfer');
        return;
      }
      if (partialSelection.direct_reports.length > 0 && !confirmDirectReports) {
        toast.error('Confirm direct-reports transfer warning first');
        return;
      }
      if (transferReason.trim().length < 3) {
        toast.error('Enter a transfer reason (min 3 characters)');
        return;
      }
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const partialBody = deleteOption === 'partial_transfer' ? {
        partialPayload: {
          ...partialSelection,
          confirmTransferDirectReports: confirmDirectReports,
        },
        transferReason,
      } : {};

      const { data: result, error: invokeError } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          userId: user.id,
          deleteOption,
          transferToUserId: deleteOption === 'transfer' ? transferToUserId : undefined,
          ...(deleteOption === 'partial_transfer' ? { transferToUserId, ...partialBody, dryRun: false } : {}),
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to delete user');
      }


      if (result.warning) {
        toast.warning(result.warning);
      }

      if (deleteOption === 'partial_transfer') {
        toast.success('Ownership transferred. Source user kept active.');
      } else if (deleteOption === 'transfer') {
        toast.success('User deleted and data transferred to selected user');
      } else {
        toast.success('User and all related data deleted and archived to recycle bin');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error processing user deletion:', error);
      toast.error(error.message || 'Failed to process user deletion');
    } finally {
      setProcessing(false);
    }
  };

  const handlePreview = async () => {
    if (!user) return;
    if (!transferToUserId || transferToUserId === user.id) {
      toast.error('Select a different target user'); return;
    }
    const total = Object.values(partialSelection).reduce((s, a) => s + a.length, 0);
    if (total === 0) { toast.error('Select records first'); return; }
    setProcessing(true);
    try {
      const merged = await runPartialTransferChunked({
        userId: user.id,
        transferToUserId,
        selection: partialSelection,
        confirmDirectReports,
        transferReason: transferReason || 'preview',
        dryRun: true,
      });
      setPreviewResult(merged);
      toast.success('Preview ready — review counts below');
    } catch (e: any) {
      toast.error(e.message || 'Preview failed');
    } finally {
      setProcessing(false);
    }
  };

  const toggleTable = (tableName: string) => {
    const newSelected = new Set(selectedTables);
    if (newSelected.has(tableName)) {
      newSelected.delete(tableName);
    } else {
      newSelected.add(tableName);
    }
    setSelectedTables(newSelected);
  };

  const selectAll = () => {
    setSelectedTables(new Set(dataSummary.map(s => s.tableName)));
  };

  const deselectAll = () => {
    setSelectedTables(new Set());
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const selectCategory = (category: string, select: boolean) => {
    const newSelected = new Set(selectedTables);
    dataSummary.filter(s => s.category === category).forEach(s => {
      if (select) {
        newSelected.add(s.tableName);
      } else {
        newSelected.delete(s.tableName);
      }
    });
    setSelectedTables(newSelected);
  };

  // Group data by category
  const groupedData = dataSummary.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, DataSummary[]>);

  const totalRecords = dataSummary.reduce((sum, item) => sum + item.count, 0);
  const selectedRecords = dataSummary
    .filter(s => selectedTables.has(s.tableName))
    .reduce((sum, item) => sum + item.count, 0);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            You are about to delete "{user.full_name || user.username || user.email}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto flex flex-col">
          {/* Data Summary */}
          {loadingData ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Scanning all tables for user data...</span>
            </div>
          ) : dataSummary.length > 0 ? (
            <div className="space-y-3">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      Found {totalRecords.toLocaleString()} records across {dataSummary.length} tables
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllTables(!showAllTables)}
                      className="text-xs"
                    >
                      {showAllTables ? 'Hide Details' : 'Show All Tables'}
                      {showAllTables ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>

              {showAllTables && (
                <div className="border rounded-lg p-3 space-y-3">
                  {/* Selection Controls */}
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={selectAll} className="text-xs h-7">
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAll} className="text-xs h-7">
                        <Square className="h-3 w-3 mr-1" />
                        Deselect All
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedTables.size} of {dataSummary.length} tables selected ({selectedRecords.toLocaleString()} records)
                    </span>
                  </div>

                  {/* Table List by Category */}
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="space-y-2">
                      {Object.entries(groupedData).map(([category, items]) => {
                        const categorySelected = items.every(item => selectedTables.has(item.tableName));
                        const categoryPartial = items.some(item => selectedTables.has(item.tableName)) && !categorySelected;
                        const categoryRecords = items.reduce((sum, item) => sum + item.count, 0);

                        return (
                          <Collapsible
                            key={category}
                            open={expandedCategories.has(category)}
                            onOpenChange={() => toggleCategory(category)}
                          >
                            <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50">
                              <Checkbox
                                checked={categorySelected}
                                ref={(el) => {
                                  if (el && categoryPartial) {
                                    el.dataset.state = 'indeterminate';
                                  }
                                }}
                                onCheckedChange={(checked) => selectCategory(category, !!checked)}
                              />
                              <CollapsibleTrigger className="flex items-center justify-between flex-1 text-sm font-medium">
                                <span>{category}</span>
                                <span className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {items.length} tables, {categoryRecords.toLocaleString()} records
                                  </span>
                                  {expandedCategories.has(category) ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </span>
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                              <div className="pl-8 space-y-1 py-1">
                                {items.map((item) => (
                                  <div
                                    key={item.tableName}
                                    className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/30 cursor-pointer"
                                    onClick={() => toggleTable(item.tableName)}
                                  >
                                    <Checkbox
                                      checked={selectedTables.has(item.tableName)}
                                      onCheckedChange={() => toggleTable(item.tableName)}
                                    />
                                    <span className="text-xs flex-1 capitalize">
                                      {item.tableName.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {item.count.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Quick Summary when collapsed */}
              {!showAllTables && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {Object.entries(groupedData).slice(0, 6).map(([category, items]) => {
                    const categoryRecords = items.reduce((sum, item) => sum + item.count, 0);
                    return (
                      <div key={category} className="flex justify-between bg-muted/30 p-2 rounded">
                        <span className="text-muted-foreground">{category}:</span>
                        <span className="font-medium">{categoryRecords.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  {Object.keys(groupedData).length > 6 && (
                    <div className="col-span-3 text-center text-muted-foreground">
                      +{Object.keys(groupedData).length - 6} more categories...
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                This user has no associated data records.
              </AlertDescription>
            </Alert>
          )}

          {/* Delete Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">What would you like to do with the user's data?</Label>
            <RadioGroup
              value={deleteOption}
              onValueChange={(value) => setDeleteOption(value as 'delete' | 'transfer')}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="delete" id="delete" className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor="delete" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Trash2 className="h-4 w-4 text-destructive" />
                    Delete all data
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Move user and all related data to Recycle Bin. Can be restored later.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="transfer" id="transfer" className="mt-1" />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="transfer" className="flex items-center gap-2 cursor-pointer font-medium">
                    <UserCheck className="h-4 w-4 text-primary" />
                    Transfer data to another user
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Reassign all records (retailers, orders, visits, etc.) to a different user before deletion.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="partial_transfer" id="partial_transfer" className="mt-1" />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="partial_transfer" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Shuffle className="h-4 w-4 text-primary" />
                    Partial Ownership Transfer (Keep User Active)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Reassign ownership of selected retailers, beats, territories, distributors, vans or direct reports.
                    Historical data (orders, invoices, attendance, GPS, gamification) stays with the source user. User is NOT deleted.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Transfer User Selection */}
          {(deleteOption === 'transfer' || deleteOption === 'partial_transfer') && (
            <div className="space-y-2 pl-6 animate-in slide-in-from-top-2">
              <Label className="text-sm">
                {deleteOption === 'partial_transfer' ? 'Transfer ownership to:' : 'Transfer data to:'}
              </Label>
              <Select value={transferToUserId} onValueChange={setTransferToUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user to receive the data" />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Loading users...
                    </div>
                  ) : (
                    availableUsers.filter(u => u.id !== user.id).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.username}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              {transferToUserId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  <span>{user.full_name || user.username}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="font-medium text-foreground">
                    {availableUsers.find(u => u.id === transferToUserId)?.full_name || 
                     availableUsers.find(u => u.id === transferToUserId)?.username}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Partial Transfer Picker */}
          {deleteOption === 'partial_transfer' && transferToUserId && transferToUserId !== user.id && (
            <div className="space-y-3 pl-6">
              <PartialTransferPicker
                fromUserId={user.id}
                selection={partialSelection}
                onSelectionChange={setPartialSelection}
              />

              {partialSelection.direct_reports.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="text-xs font-medium">
                      Direct reports transfer changes reporting hierarchy.
                      Approval routing, dashboards, and leave escalation will be affected for {partialSelection.direct_reports.length} employee(s).
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={confirmDirectReports}
                        onCheckedChange={(c) => setConfirmDirectReports(!!c)}
                      />
                      <span className="text-xs">I understand and confirm this hierarchy change.</span>
                    </label>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Transfer reason (required, audit-logged)</Label>
                <Textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Rahul going on 1-month leave; transferring his beats to Suresh"
                  className="text-xs"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Eye className="h-3 w-3 mr-1" />}
                  Preview Transfer
                </Button>
              </div>

              {previewResult && (
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription className="text-xs space-y-1">
                    <p className="font-medium">Preview (no changes written):</p>
                    <ul className="list-disc list-inside">
                      {Object.entries(previewResult.counts || {}).map(([k, v]) => (
                        <li key={k}><span className="capitalize">{k.replace(/_/g, ' ')}</span>: {String(v)}</li>
                      ))}
                    </ul>
                    {previewResult.warnings && previewResult.warnings.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-amber-600">Warnings:</p>
                        <ul className="list-disc list-inside text-amber-600">
                          {previewResult.warnings.map((w: any, i: number) => (
                            <li key={i}>{w.message || JSON.stringify(w)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Warning */}
          <Alert variant={deleteOption === 'partial_transfer' ? 'default' : 'destructive'} className={deleteOption === 'partial_transfer' ? '' : 'border-destructive/50'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {deleteOption === 'delete' 
                ? 'The user will be moved to Recycle Bin along with all their data. You can restore them later if needed.'
                : deleteOption === 'transfer'
                ? 'The user\'s data will be transferred to the selected user. The user profile will then be moved to Recycle Bin.'
                : 'Only selected ownership records will be reassigned. Source user remains active. Historical transactional data is untouched.'}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant={deleteOption === 'partial_transfer' ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={
              processing ||
              (deleteOption === 'transfer' && !transferToUserId) ||
              (deleteOption === 'partial_transfer' && (
                !transferToUserId ||
                transferToUserId === user.id ||
                Object.values(partialSelection).reduce((s, a) => s + a.length, 0) === 0 ||
                (partialSelection.direct_reports.length > 0 && !confirmDirectReports) ||
                transferReason.trim().length < 3
              ))
            }
          >
            {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {deleteOption === 'transfer'
              ? 'Transfer & Delete'
              : deleteOption === 'partial_transfer'
              ? 'Confirm Transfer'
              : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};