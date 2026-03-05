import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { offlineStorage } from "@/lib/offlineStorage";
import { useManagedInterval } from "@/utils/intervalManager";

interface SyncItem {
  id: string;
  action: string;
  status: 'pending' | 'syncing' | 'success' | 'error';
  error?: string;
  data?: any;
  timestamp?: number;
  retryCount?: number;
}

interface SyncProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTriggerSync?: () => void;
}

export const SyncProgressModal = ({ open, onOpenChange, onTriggerSync }: SyncProgressModalProps) => {
  const [syncItems, setSyncItems] = useState<SyncItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [syncedItems, setSyncedItems] = useState(0);

  const loadSyncQueue = useCallback(async () => {
    try {
      const queue = await offlineStorage.getSyncQueue();
      setTotalItems(queue.length);
      setSyncItems(queue.map(item => ({
        id: item.id,
        action: item.action,
        status: item.status === 'permanently_failed' ? 'error' : 'pending',
        error: item.lastError || (item.status === 'permanently_failed' ? 'Sync failed - tap Retry' : undefined),
        data: item.data,
        timestamp: item.timestamp,
        retryCount: item.retryCount
      })));
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    loadSyncQueue();
    // Trigger sync when modal opens
    if (onTriggerSync) {
      onTriggerSync();
    }
  }, [open, onTriggerSync, loadSyncQueue]);

  // Use managed interval when modal is open (reduced from 1s to 2s)
  useManagedInterval(
    'sync-progress-modal',
    loadSyncQueue,
    2000,
    { enabled: open, runWhenHidden: false }
  );

  useEffect(() => {
    const successCount = syncItems.filter(item => item.status === 'success').length;
    setSyncedItems(successCount);
  }, [syncItems]);

  const progress = totalItems > 0 ? (syncedItems / totalItems) * 100 : 0;

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'CREATE_ORDER': 'Creating Order',
      'UPDATE_ORDER': 'Updating Order',
      'CREATE_VISIT': 'Creating Visit',
      'CHECK_IN': 'Check In',
      'CHECK_OUT': 'Check Out',
      'CREATE_STOCK': 'Creating Stock',
      'UPDATE_STOCK': 'Updating Stock',
      'CREATE_RETAILER': 'Creating Retailer',
      'UPDATE_RETAILER': 'Updating Retailer',
      'DELETE_RETAILER': 'Deleting Retailer',
      'CREATE_ATTENDANCE': 'Check In Attendance',
      'UPDATE_ATTENDANCE': 'Check Out Attendance',
      'CREATE_BEAT': 'Creating Beat',
      'UPDATE_BEAT': 'Updating Beat',
      'DELETE_BEAT': 'Deleting Beat',
      'CREATE_BEAT_PLAN': 'Creating Beat Plan',
      'UPDATE_BEAT_PLAN': 'Updating Beat Plan',
      'NO_ORDER': 'Recording No Order',
      'CREATE_COMPETITION_DATA': 'Recording Competition Data',
      'CREATE_RETURN_STOCK': 'Recording Return Stock',
      'SEND_INVOICE_SMS': 'Sending Invoice SMS/WhatsApp',
    };
    return labels[action] || action;
  };

  const getItemDetails = (item: SyncItem) => {
    const { action, data } = item;
    
    if (action === 'CREATE_ORDER' && data) {
      const order = data.order || data;
      const retailerName = order.retailer_name || 'Unknown Retailer';
      const amount = order.total_amount || order.amount || 0;
      return `${retailerName} - ₹${amount.toFixed(2)}`;
    }
    
    if (action === 'SEND_INVOICE_SMS' && data) {
      return `${data.retailerName || 'Retailer'} - Invoice Message`;
    }
    
    if (action === 'CREATE_RETAILER' && data) {
      return data.shop_name || data.name || 'New Retailer';
    }
    
    if (action === 'CREATE_BEAT' && data) {
      return data.beat_name || 'New Beat';
    }
    
    if (action === 'CREATE_BEAT_PLAN' && data) {
      return data.beat_name || 'Beat Plan';
    }
    
    return '';
  };

  const getStatusIcon = (status: SyncItem['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sync Progress</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{syncedItems} / {totalItems}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress.toFixed(0)}% Complete
            </p>
          </div>

          {/* Sync Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Items Being Synced</h4>
              {onTriggerSync && syncItems.length > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onTriggerSync}
                  className="h-7"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry Sync
                </Button>
              )}
            </div>
            {syncItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>All data synced successfully!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {syncItems.map((item) => {
                  const details = getItemDetails(item);
                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card gap-2"
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {getStatusIcon(item.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{getActionLabel(item.action)}</div>
                          {details && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {details}
                            </div>
                          )}
                          {item.retryCount && item.retryCount > 0 && (
                            <div className="text-xs text-orange-600 mt-0.5">
                              Retry attempt {item.retryCount}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={
                          item.status === 'success' ? 'default' : 
                          item.status === 'error' ? 'destructive' : 
                          'secondary'
                        }
                        className="flex-shrink-0"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
