/**
 * Startup Cleanup Hook
 * Runs cleanup routines when app starts and is online
 * Cleans orphan orders, stale cache, and synced data
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { runFullOrderCleanup, cleanupStaleSyncedOrders } from '@/utils/orderCleanup';
import { cleanupOldSnapshots } from '@/lib/myVisitsSnapshot';
import { offlineStorage, STORES } from '@/lib/offlineStorage';

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Hook that runs cleanup routines on app startup when online
 */
export function useStartupCleanup() {
  const hasRunCleanupRef = useRef(false);
  
  useEffect(() => {
    const runStartupCleanup = async () => {
      // Only run once per app session
      if (hasRunCleanupRef.current) {
        return;
      }
      
      // Only run if online
      if (!navigator.onLine) {
        console.log('🧹 [startupCleanup] Offline - skipping cleanup');
        return;
      }
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('🧹 [startupCleanup] No user - skipping cleanup');
        return;
      }
      
      hasRunCleanupRef.current = true;
      
      console.log('🧹 [startupCleanup] Starting cleanup routines...');
      
      try {
        const today = getTodayDate();
        
        // Run cleanup in parallel
        await Promise.all([
          // Clean orphan orders for today
          runFullOrderCleanup(user.id, today),
          
          // Clean old snapshots (older than 7 days)
          cleanupOldSnapshots(user.id),
          
          // Clean stale synced orders globally
          cleanupStaleSyncedOrders(),
          
          // Clean old sync queue items
          cleanupOldSyncQueue()
        ]);
        
        console.log('🧹 [startupCleanup] Cleanup routines completed');
      } catch (error) {
        console.error('🧹 [startupCleanup] Error during cleanup:', error);
      }
    };
    
    // Delay cleanup to not block app startup
    const timeoutId = setTimeout(() => {
      runStartupCleanup();
    }, 3000); // Wait 3 seconds after mount
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Also run cleanup when coming back online after being offline
  useEffect(() => {
    const handleOnline = async () => {
      // Small delay to ensure stable connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!navigator.onLine) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const today = getTodayDate();
      console.log('🧹 [startupCleanup] Online restored - running cleanup');
      
      // Run lighter cleanup on reconnection
      await runFullOrderCleanup(user.id, today);
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
}

/**
 * Clean up old sync queue items that have been processed
 */
async function cleanupOldSyncQueue(): Promise<void> {
  try {
    const syncQueue = await offlineStorage.getSyncQueue();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let cleaned = 0;
    
    for (const item of syncQueue) {
      // Remove items older than 24 hours
      if (item.timestamp && item.timestamp < oneDayAgo) {
        await offlineStorage.delete(STORES.SYNC_QUEUE, item.id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [startupCleanup] Cleaned ${cleaned} old sync queue items`);
    }
  } catch (error) {
    console.error('🧹 [startupCleanup] Error cleaning sync queue:', error);
  }
}
