/**
 * Order Cleanup Utility
 * Cleans up orphan orders from local storage that have been synced to database
 * Prevents duplicate order display issues
 */

import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { loadMyVisitsSnapshot, saveMyVisitsSnapshot } from '@/lib/myVisitsSnapshot';

/**
 * Clean up orphan orders from local storage
 * Removes orders that already exist in the database by matching ID or idempotency_key
 */
export async function cleanupOrphanOrders(
  userId: string,
  targetDate: string
): Promise<{ cleaned: number; remaining: number }> {
  try {
    console.log('🧹 [orderCleanup] Starting orphan order cleanup for', targetDate);
    
    // Step 1: Get all local orders for this date
    const localOrders = await offlineStorage.getAll<any>(STORES.ORDERS);
    const localOrdersForDate = localOrders.filter((o: any) => 
      o.user_id === userId && 
      (o.order_date === targetDate || (o.created_at && o.created_at.startsWith(targetDate)))
    );
    
    if (localOrdersForDate.length === 0) {
      console.log('🧹 [orderCleanup] No local orders to cleanup');
      return { cleaned: 0, remaining: 0 };
    }
    
    console.log(`🧹 [orderCleanup] Found ${localOrdersForDate.length} local orders`);
    
    // Step 2: Fetch DB orders for comparison
    const { data: dbOrders, error } = await supabase
      .from('orders')
      .select('id, idempotency_key')
      .eq('user_id', userId)
      .eq('order_date', targetDate);
    
    if (error) {
      console.error('🧹 [orderCleanup] Error fetching DB orders:', error);
      return { cleaned: 0, remaining: localOrdersForDate.length };
    }
    
    const dbOrderIds = new Set(dbOrders?.map(o => o.id) || []);
    const dbIdempotencyKeys = new Set(
      dbOrders?.filter(o => o.idempotency_key).map(o => o.idempotency_key) || []
    );
    
    console.log(`🧹 [orderCleanup] DB has ${dbOrderIds.size} orders, ${dbIdempotencyKeys.size} idempotency keys`);
    
    // Step 3: Delete local orders that exist in DB
    let cleanedCount = 0;
    for (const localOrder of localOrdersForDate) {
      const existsById = dbOrderIds.has(localOrder.id);
      const existsByKey = localOrder.idempotency_key && dbIdempotencyKeys.has(localOrder.idempotency_key);
      
      if (existsById || existsByKey) {
        await offlineStorage.delete(STORES.ORDERS, localOrder.id);
        cleanedCount++;
        console.log(`🧹 [orderCleanup] Removed synced order: ${localOrder.id}`);
      }
    }
    
    console.log(`🧹 [orderCleanup] Cleaned ${cleanedCount} orders, ${localOrdersForDate.length - cleanedCount} remaining`);
    return { cleaned: cleanedCount, remaining: localOrdersForDate.length - cleanedCount };
  } catch (error) {
    console.error('🧹 [orderCleanup] Error in cleanupOrphanOrders:', error);
    return { cleaned: 0, remaining: 0 };
  }
}

/**
 * Clean up stale synced orders from local storage
 * Removes orders older than 24 hours that have already been synced
 */
export async function cleanupStaleSyncedOrders(): Promise<number> {
  try {
    const allLocalOrders = await offlineStorage.getAll<any>(STORES.ORDERS);
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    let cleanedCount = 0;
    
    for (const order of allLocalOrders) {
      const createdAt = order.created_at ? new Date(order.created_at).getTime() : 0;
      const isOld = createdAt < twentyFourHoursAgo;
      const isSynced = order._synced === true;
      
      // Remove old synced orders
      if (isOld && isSynced) {
        await offlineStorage.delete(STORES.ORDERS, order.id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 [orderCleanup] Cleaned ${cleanedCount} stale synced orders`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('🧹 [orderCleanup] Error in cleanupStaleSyncedOrders:', error);
    return 0;
  }
}

/**
 * Verify and clean local orders against database
 * For each local order, check if it exists in DB and remove if so
 */
export async function verifyAndCleanLocalOrders(userId: string): Promise<number> {
  try {
    const allLocalOrders = await offlineStorage.getAll<any>(STORES.ORDERS);
    const userOrders = allLocalOrders.filter((o: any) => o.user_id === userId);
    
    if (userOrders.length === 0) {
      return 0;
    }
    
    console.log(`🧹 [orderCleanup] Verifying ${userOrders.length} local orders against DB`);
    
    // Get all order IDs and idempotency keys
    const orderIds = userOrders.map(o => o.id).filter(Boolean);
    const idempotencyKeys = userOrders
      .map(o => o.idempotency_key)
      .filter(Boolean);
    
    // Batch check by IDs
    let dbOrderIds = new Set<string>();
    let dbIdempotencyKeys = new Set<string>();
    
    if (orderIds.length > 0) {
      const { data: dbOrders } = await supabase
        .from('orders')
        .select('id, idempotency_key')
        .in('id', orderIds);
      
      if (dbOrders) {
        dbOrders.forEach(o => {
          dbOrderIds.add(o.id);
          if (o.idempotency_key) dbIdempotencyKeys.add(o.idempotency_key);
        });
      }
    }
    
    // Also check by idempotency keys
    if (idempotencyKeys.length > 0) {
      const { data: dbOrdersByKey } = await supabase
        .from('orders')
        .select('id, idempotency_key')
        .in('idempotency_key', idempotencyKeys);
      
      if (dbOrdersByKey) {
        dbOrdersByKey.forEach(o => {
          dbOrderIds.add(o.id);
          if (o.idempotency_key) dbIdempotencyKeys.add(o.idempotency_key);
        });
      }
    }
    
    // Delete local orders that exist in DB
    let cleanedCount = 0;
    for (const order of userOrders) {
      const existsById = dbOrderIds.has(order.id);
      const existsByKey = order.idempotency_key && dbIdempotencyKeys.has(order.idempotency_key);
      
      if (existsById || existsByKey) {
        await offlineStorage.delete(STORES.ORDERS, order.id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 [orderCleanup] Verified and cleaned ${cleanedCount} synced orders`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('🧹 [orderCleanup] Error in verifyAndCleanLocalOrders:', error);
    return 0;
  }
}

/**
 * Clean up duplicate orders from snapshot
 * Removes orders from snapshot that already exist in database
 */
export async function cleanupSnapshotDuplicates(
  userId: string,
  targetDate: string,
  dbOrderIds: string[]
): Promise<number> {
  try {
    const snapshot = await loadMyVisitsSnapshot(userId, targetDate);
    if (!snapshot || !snapshot.orders || snapshot.orders.length === 0) {
      return 0;
    }
    
    const dbIdSet = new Set(dbOrderIds);
    const originalCount = snapshot.orders.length;
    
    // Filter out orders that exist in DB
    snapshot.orders = snapshot.orders.filter(o => !dbIdSet.has(o.id));
    
    const removedCount = originalCount - snapshot.orders.length;
    
    if (removedCount > 0) {
      // Recalculate stats
      snapshot.progressStats.totalOrders = snapshot.orders.length;
      snapshot.progressStats.totalOrderValue = Math.round(
        snapshot.orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
      );
      
      // Save updated snapshot
      await saveMyVisitsSnapshot(userId, targetDate, {
        beatPlans: snapshot.beatPlans,
        visits: snapshot.visits,
        retailers: snapshot.retailers,
        orders: snapshot.orders,
        progressStats: snapshot.progressStats,
        currentBeatName: snapshot.currentBeatName,
        pointsTotal: snapshot.pointsTotal,
        pointsByRetailer: snapshot.pointsByRetailer
      });
      
      console.log(`🧹 [orderCleanup] Removed ${removedCount} duplicate orders from snapshot`);
    }
    
    return removedCount;
  } catch (error) {
    console.error('🧹 [orderCleanup] Error in cleanupSnapshotDuplicates:', error);
    return 0;
  }
}

/**
 * Run full cleanup routine
 * Cleans both local storage and snapshot
 */
export async function runFullOrderCleanup(userId: string, targetDate: string): Promise<void> {
  try {
    console.log('🧹 [orderCleanup] Running full cleanup for', userId, targetDate);
    
    // Step 1: Clean orphan orders from local storage
    const { cleaned: orphansCleaned } = await cleanupOrphanOrders(userId, targetDate);
    
    // Step 2: Clean stale synced orders
    const staleCleaned = await cleanupStaleSyncedOrders();
    
    // Step 3: Verify remaining local orders against DB
    const verifiedCleaned = await verifyAndCleanLocalOrders(userId);
    
    // Step 4: Get DB order IDs for snapshot cleanup
    const { data: dbOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .eq('order_date', targetDate);
    
    if (dbOrders && dbOrders.length > 0) {
      const dbOrderIds = dbOrders.map(o => o.id);
      await cleanupSnapshotDuplicates(userId, targetDate, dbOrderIds);
    }
    
    console.log(`🧹 [orderCleanup] Full cleanup complete: orphans=${orphansCleaned}, stale=${staleCleaned}, verified=${verifiedCleaned}`);
  } catch (error) {
    console.error('🧹 [orderCleanup] Error in runFullOrderCleanup:', error);
  }
}
