import { useEffect, useState, memo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { useConnectivity } from "@/hooks/useConnectivity";
import { offlineStorage, STORES } from "@/lib/offlineStorage";
import { toast } from "@/hooks/use-toast";
import { SyncProgressModal } from "./SyncProgressModal";
import { CacheWarmingProgress, useCacheWarming } from "./CacheWarmingProgress";
import { useMasterDataCache } from "@/hooks/useMasterDataCache";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useManagedInterval } from "@/utils/intervalManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const SyncStatusIndicator = memo(() => {
  const isOnline = useConnectivity() === 'online';
  const { processSyncQueue } = useOfflineSync();
  const { warmCacheWithProgress } = useMasterDataCache();
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncingUI, setShowSyncingUI] = useState(false); // Only show if sync takes >500ms
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const mountedRef = useRef(true);
  const syncingDisplayRef = useRef<NodeJS.Timeout | null>(null);

  // Cache warming state
  const {
    isWarming,
    steps,
    currentStep,
    startWarming,
    updateStep,
    completeWarming,
    dismissWarming,
  } = useCacheWarming();
  
  // Only show syncing UI if sync takes more than 500ms (reduces visual noise)
  useEffect(() => {
    if (isSyncing) {
      syncingDisplayRef.current = setTimeout(() => {
        if (mountedRef.current) setShowSyncingUI(true);
      }, 500);
    } else {
      if (syncingDisplayRef.current) {
        clearTimeout(syncingDisplayRef.current);
      }
      setShowSyncingUI(false);
    }
    
    return () => {
      if (syncingDisplayRef.current) {
        clearTimeout(syncingDisplayRef.current);
      }
    };
  }, [isSyncing]);

  // ONE-TIME CLEANUP: Remove old stuck items from sync queue on app open - more aggressive
  useEffect(() => {
    const cleanupOldStuckItems = async () => {
      try {
        const queue = await offlineStorage.getSyncQueue();
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000; // Changed from 1 hour to 30 mins
        
        // Find items to remove (stuck/old) - more aggressive cleanup
        const itemsToRemove = queue.filter((item: any) => {
          // Remove items that have failed 3+ times (changed from 5)
          if (item.retryCount >= 3) return true;
          // Remove items older than 30 minutes (changed from 1 hour)
          if (item.timestamp && item.timestamp < thirtyMinutesAgo) return true;
          // Remove items that were already synced
          if (item._synced) return true;
          return false;
        });
        
        // Delete stuck items
        for (const item of itemsToRemove) {
          await offlineStorage.delete(STORES.SYNC_QUEUE, item.id);
        }
        
        if (itemsToRemove.length > 0) {
          console.log(`🧹 [SyncStatusIndicator] Cleaned up ${itemsToRemove.length} old/stuck sync items`);
        }
      } catch (error) {
        console.error('Error cleaning up old sync items:', error);
      }
    };
    
    cleanupOldStuckItems();
  }, []); // Run only once on mount

  // Check sync queue with managed interval (pauses when app is hidden)
  const checkQueue = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const queue = await offlineStorage.getSyncQueue();
      
      // Filter out old items (older than 1 hour) and items that failed 5+ times
      // These are stuck items that shouldn't show the sync indicator
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const actualPendingItems = queue.filter((item: any) => {
        // Skip items that have failed 5+ times
        if (item.retryCount >= 5) return false;
        // Skip items older than 1 hour that haven't been synced
        if (item.timestamp && item.timestamp < oneHourAgo && !item._syncing) return false;
        return true;
      });
      
      if (mountedRef.current) {
        setSyncQueueCount(actualPendingItems.length);
      }
    } catch (error) {
      console.error('Error checking sync queue:', error);
    }
  }, []);

  // Initial check and online listener
  useEffect(() => {
    mountedRef.current = true;
    checkQueue();

    // Listen for online event to trigger immediate sync check
    const handleOnline = () => {
      console.log('🌐 SyncStatusIndicator: Online detected, checking queue...');
      checkQueue();
    };

    // Listen for queue updates to trigger immediate sync check (when items are added while already online)
    const handleQueueUpdated = () => {
      console.log('📥 SyncStatusIndicator: Queue updated, checking queue...');
      checkQueue();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('syncQueueUpdated', handleQueueUpdated);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('syncQueueUpdated', handleQueueUpdated);
    };
  }, [checkQueue]);

  // REMOVED: Aggressive queue polling every 5 seconds
  // Per event-based sync architecture: Only check queue on:
  // - Component mount (done in useEffect above)
  // - syncQueueUpdated event (when items are actually added)
  // - online event (when connectivity returns)
  // This prevents constant sync indicator activity on tab switches

  // Track last sync time and queue count to prevent rapid re-syncs and sync loops
  const lastSyncTimeRef = useRef<number>(0);
  const lastQueueCountRef = useRef<number>(0);
  const syncDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Monitor syncing status when coming online - SILENT mode with extended debounce to prevent loops
  useEffect(() => {
    // Skip if already syncing or offline
    if (isSyncing || !isOnline || syncQueueCount === 0) return;
    
    // SMART SYNC: Skip if queue count hasn't changed (likely stuck items)
    if (syncQueueCount === lastQueueCountRef.current && syncQueueCount > 0) {
      console.log('🔄 [SyncIndicator] Same queue count as before, skipping sync loop');
      return;
    }
    
    // Prevent sync if we recently synced (within last 60 seconds) - increased from 30s
    const now = Date.now();
    if (now - lastSyncTimeRef.current < 60000) {
      return;
    }
    
    // Debounce to prevent multiple rapid triggers (e.g., tab switching) - increased from 2s to 5s
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }
    
    syncDebounceRef.current = setTimeout(async () => {
      if (!mountedRef.current || isSyncing) return;
      
      lastSyncTimeRef.current = Date.now();
      lastQueueCountRef.current = syncQueueCount; // Track queue count to detect stuck items
      setIsSyncing(true);
      setLastSyncStatus(null);

      try {
        await processSyncQueue();
        
        // Wait for queue to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!mountedRef.current) return;
        
        // Check final queue status - use more aggressive filtering (3 retries instead of 5)
        const queue = await offlineStorage.getSyncQueue();
        const actualPending = queue.filter((item: any) => {
          if (item.retryCount >= 3) return false;
          return true;
        });
        
        if (actualPending.length === 0) {
          setLastSyncStatus('success');
          setSyncQueueCount(0);
          
          // Clear success status after 3 seconds
          setTimeout(() => {
            if (mountedRef.current) setLastSyncStatus(null);
          }, 3000);
        } else {
          setSyncQueueCount(actualPending.length);
          // Don't set error status for retryable items - just leave pending
        }
      } catch (error) {
        if (mountedRef.current) setLastSyncStatus('error');
      } finally {
        if (mountedRef.current) setIsSyncing(false);
      }
    }, 5000); // Increased from 2s to 5s debounce
    
    return () => {
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
      }
    };
  }, [isOnline, syncQueueCount, isSyncing, processSyncQueue]);

  // Handle prepare offline data click
  const handlePrepareOfflineData = useCallback(() => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Please connect to the internet to prepare offline data.",
        variant: "destructive"
      });
      return;
    }
    
    startWarming();
    warmCacheWithProgress((stepId, status) => {
      updateStep(stepId, status);
    });
  }, [isOnline, startWarming, warmCacheWithProgress, updateStep]);

  // Handle view sync queue click
  const handleViewSyncQueue = useCallback(() => {
    setShowSyncModal(true);
  }, []);

  // Render the dropdown menu trigger - use showSyncingUI instead of isSyncing to reduce visual noise
  const renderTrigger = () => {
    if (showSyncingUI) {
      return (
        <button
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="Syncing data..."
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary-foreground/70" />
          {syncQueueCount > 0 && (
            <span className="text-xs text-primary-foreground/70">{syncQueueCount}</span>
          )}
        </button>
      );
    }
    
    if (syncQueueCount > 0) {
      return (
        <button
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title={isOnline ? `${syncQueueCount} items pending sync` : `${syncQueueCount} items waiting to sync when online`}
        >
          {isOnline ? (
            <Cloud className="h-4 w-4 text-primary-foreground/70" />
          ) : (
            <CloudOff className="h-4 w-4 text-yellow-400" />
          )}
          <span className="text-xs text-primary-foreground/70">{syncQueueCount}</span>
        </button>
      );
    }
    
    // Always show sync icon for access to Prepare Offline Data
    return (
      <button
        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        title="Sync options"
      >
        <Database className="h-4 w-4 text-primary-foreground/70" />
      </button>
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {renderTrigger()}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={handlePrepareOfflineData} disabled={!isOnline}>
            <Database className="h-4 w-4 mr-2 text-blue-500" />
            <span>Prepare Offline Data</span>
          </DropdownMenuItem>
          {syncQueueCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleViewSyncQueue}>
                <RefreshCw className="h-4 w-4 mr-2 text-green-500" />
                <span>View Sync Queue ({syncQueueCount})</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sync Queue Modal */}
      <SyncProgressModal 
        open={showSyncModal} 
        onOpenChange={setShowSyncModal}
        onTriggerSync={processSyncQueue}
      />

      {/* Cache Warming Progress Modal */}
      <CacheWarmingProgress
        isOpen={isWarming}
        onComplete={completeWarming}
        onDismiss={dismissWarming}
        steps={steps}
        currentStep={currentStep}
        isOnline={isOnline}
      />
    </>
  );
});

SyncStatusIndicator.displayName = 'SyncStatusIndicator';
