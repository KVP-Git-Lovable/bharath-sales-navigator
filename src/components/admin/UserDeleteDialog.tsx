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
import { Loader2, Trash2, UserCheck, AlertTriangle, Database, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { moveUserToRecycleBin, getUserDataSummary, transferUserData } from '@/utils/userArchiveUtils';

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
  const [deleteOption, setDeleteOption] = useState<'delete' | 'transfer'>('delete');
  const [transferToUserId, setTransferToUserId] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [dataSummary, setDataSummary] = useState<DataSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchDataSummary();
      fetchAvailableUsers();
      setDeleteOption('delete');
      setTransferToUserId('');
    }
  }, [open, user]);

  const fetchDataSummary = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const summary = await getUserDataSummary(user.id);
      setDataSummary(summary);
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

    setProcessing(true);
    try {
      if (deleteOption === 'transfer') {
        if (!transferToUserId) {
          toast.error('Please select a user to transfer data to');
          setProcessing(false);
          return;
        }

        // Transfer data to another user first
        const transferSuccess = await transferUserData(user.id, transferToUserId);
        if (!transferSuccess) {
          throw new Error('Failed to transfer user data');
        }
        toast.success('User data transferred successfully');
      }

      // Move user to recycle bin (with or without data based on option)
      const success = await moveUserToRecycleBin(
        user.id,
        user.full_name || user.username || user.email
      );

      if (!success) {
        throw new Error('Failed to move user to recycle bin');
      }

      toast.success(
        deleteOption === 'transfer'
          ? 'User deleted and data transferred to selected user'
          : 'User and all related data moved to recycle bin'
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error processing user deletion:', error);
      toast.error(error.message || 'Failed to process user deletion');
    } finally {
      setProcessing(false);
    }
  };

  const totalRecords = dataSummary.reduce((sum, item) => sum + item.count, 0);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            You are about to delete "{user.full_name || user.username || user.email}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Data Summary */}
          {loadingData ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading user data summary...</span>
            </div>
          ) : dataSummary.length > 0 ? (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">This user has {totalRecords} records across {dataSummary.length} tables:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {dataSummary.map((item) => (
                    <div key={item.tableName} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{item.tableName.replace(/_/g, ' ')}:</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
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
            </RadioGroup>
          </div>

          {/* Transfer User Selection */}
          {deleteOption === 'transfer' && (
            <div className="space-y-2 pl-6 animate-in slide-in-from-top-2">
              <Label className="text-sm">Transfer data to:</Label>
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
                    availableUsers.map((u) => (
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

          {/* Warning */}
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {deleteOption === 'delete' 
                ? 'The user will be moved to Recycle Bin along with all their data. You can restore them later if needed.'
                : 'The user\'s data will be transferred to the selected user. The user profile will then be moved to Recycle Bin.'}
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
            variant="destructive"
            onClick={handleConfirm}
            disabled={processing || (deleteOption === 'transfer' && !transferToUserId)}
          >
            {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {deleteOption === 'transfer' ? 'Transfer & Delete' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
