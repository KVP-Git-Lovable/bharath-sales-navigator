import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Clock, RefreshCw, AlertTriangle, XCircle, WifiOff } from "lucide-react";
import { offlineStorage, STORES } from "@/lib/offlineStorage";
import { useManagedInterval } from "@/utils/intervalManager";
import { type SyncErrorType, type SyncState, MAX_AUTO_RETRIES } from "@/lib/syncErrorClassifier";

interface SyncItem {
  id: string;
  action: string;
  syncState: SyncState;
  errorType?: SyncErrorType;
  lastError?: string;
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

  const loadSyncQueue = useCallback(async () => {
    try {
      const queue = await offlineStorage.getSyncQueue();
      setTotalItems(queue.length);
      setSyncItems(queue.map(item => ({
        id: item.id,
        action: item.action,
        syncState: item.syncState || (item.retryCount > 0 ? 'RETRYING' : 'QUEUED'),
        errorType: item.errorType,
        lastError: item.lastError,
        data: item.data,
        timestamp: item.timestamp,
        retryCount: item.retryCount
      })));
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }, []);

  // Manual retry: reset retryCount and syncState so items get retried
  const handleManualRetry = useCallback(async () => {
    try {
      const queue = await offlineStorage.getSyncQueue();
      for (const item of queue) {
        if (item.syncState === 'FAILED_SYNC' || (item.retryCount || 0) >= MAX_AUTO_RETRIES) {
          await offlineStorage.save(STORES.SYNC_QUEUE, {
            ...item,
            retryCount: 0,
            syncState: 'QUEUED',
            lastRetryAt: undefined,
          });
        }
      }
      // Trigger sync after resetting
      if (onTriggerSync) onTriggerSync();
      await loadSyncQueue();
    } catch (e) {
      console.error('Error resetting sync items:', e);
    }
  }, [onTriggerSync, loadSyncQueue]);

  useEffect(() => {
    if (!open) return;
    loadSyncQueue();
    if (onTriggerSync) onTriggerSync();
  }, [open, onTriggerSync, loadSyncQueue]);

  useManagedInterval('sync-progress-modal', loadSyncQueue, 2000, { enabled: open, runWhenHidden: false });

  const failedCount = syncItems.filter(i => i.syncState === 'FAILED_SYNC').length;
  const retryingCount = syncItems.filter(i => i.syncState === 'RETRYING').length;
  const queuedCount = syncItems.filter(i => i.syncState === 'QUEUED' || i.syncState === 'SYNCING').length;

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
      'UPDATE_VISIT_NO_ORDER': 'Recording No Order',
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
    if (action === 'CREATE_RETAILER' && data) return data.shop_name || data.name || 'New Retailer';
    if (action === 'CREATE_BEAT' && data) return data.beat_name || 'New Beat';
    if (action === 'CREATE_BEAT_PLAN' && data) return data.beat_name || 'Beat Plan';
    return '';
  };

  const getSyncStateIcon = (item: SyncItem) => {
    switch (item.syncState) {
      case 'FAILED_SYNC':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'RETRYING':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'SYNCING':
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      case 'QUEUED':
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSyncStateBadge = (item: SyncItem) => {
    switch (item.syncState) {
      case 'FAILED_SYNC':
        return <Badge variant="destructive" className="text-[10px] px-1.5">Failed</Badge>;
      case 'RETRYING':
        return <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5">Retry {item.retryCount}/{MAX_AUTO_RETRIES}</Badge>;
      case 'SYNCING':
        return <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5">Syncing</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-1.5">Queued</Badge>;
    }
  };

  const getErrorTypeLabel = (errorType?: SyncErrorType) => {
    if (!errorType) return null;
    const labels: Record<SyncErrorType, { label: string; icon: React.ReactNode }> = {
      NETWORK: { label: 'Network', icon: <WifiOff className="h-3 w-3" /> },
      VALIDATION: { label: 'Invalid Data', icon: <XCircle className="h-3 w-3" /> },
      AUTH: { label: 'Auth Error', icon: <AlertCircle className="h-3 w-3" /> },
      CONFLICT: { label: 'Conflict', icon: <AlertTriangle className="h-3 w-3" /> },
      SERVER: { label: 'Server Error', icon: <AlertCircle className="h-3 w-3" /> },
      UNKNOWN: { label: 'Unknown', icon: <AlertCircle className="h-3 w-3" /> },
    };
    return labels[errorType];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sync Progress</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="flex gap-2 flex-wrap">
            {queuedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" /> {queuedCount} Queued
              </Badge>
            )}
            {retryingCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" /> {retryingCount} Retrying
              </Badge>
            )}
            {failedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" /> {failedCount} Failed
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Pending Items ({totalItems})</h4>
            <div className="flex gap-2">
              {failedCount > 0 && (
                <Button size="sm" variant="outline" onClick={handleManualRetry} className="h-7 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset & Retry Failed
                </Button>
              )}
              {onTriggerSync && syncItems.length > 0 && (
                <Button size="sm" variant="outline" onClick={onTriggerSync} className="h-7 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Now
                </Button>
              )}
            </div>
          </div>

          {/* Sync Items List */}
          {syncItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>All data synced successfully!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {syncItems.map((item) => {
                const details = getItemDetails(item);
                const errorInfo = getErrorTypeLabel(item.errorType);
                return (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between p-3 rounded-lg border bg-card gap-2 ${
                      item.syncState === 'FAILED_SYNC' ? 'border-destructive/30 bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="mt-0.5 flex-shrink-0">
                        {getSyncStateIcon(item)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{getActionLabel(item.action)}</div>
                        {details && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {details}
                          </div>
                        )}
                        {item.lastError && (
                          <div className="text-xs text-destructive mt-1 flex items-center gap-1">
                            {errorInfo && errorInfo.icon}
                            <span className="truncate">
                              {errorInfo ? `${errorInfo.label}: ` : ''}{item.lastError}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {getSyncStateBadge(item)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
