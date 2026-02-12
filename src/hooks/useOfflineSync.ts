import { useEffect, useCallback, useRef } from 'react';
import { useConnectivity } from './useConnectivity';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { syncOrdersToVanStock, getTodayDateString } from '@/utils/vanStockSync';
import { visitStatusCache } from '@/lib/visitStatusCache';
// Removed isSlowConnection import - sync should always attempt when online

export function useOfflineSync() {
  const connectivityStatus = useConnectivity();
  
  // CRITICAL: Use useRef to prevent concurrent sync operations across renders
  const isSyncingRef = useRef(false);

  // Process sync queue when coming back online
  const processSyncQueue = useCallback(async () => {
    // Don't sync if offline
    if (connectivityStatus !== 'online') {
      console.log('📴 Offline - skipping sync');
      return;
    }
    
    // Prevent concurrent sync operations
    if (isSyncingRef.current) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }
    
    // NOTE: Removed slow connection check - we should always attempt sync when online
    // The sync will happen in the background and won't block user actions
    
    isSyncingRef.current = true;

    try {
      // Helper to check if an ID is a valid UUID (from database) vs temp offline ID
      const isValidUUID = (id: string): boolean => {
        if (!id) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      };

      // Clean up stale sync items with priority-based retention
      // CREATE_ORDER items get 48-hour / 5-retry protection to prevent data loss
      const cleanupStaleSyncItems = async (queue: any[]): Promise<any[]> => {
        const now = Date.now();
        const fifteenMinutesAgo = now - (15 * 60 * 1000);
        const fortyEightHoursAgo = now - (48 * 60 * 60 * 1000);
        const cleanQueue: any[] = [];
        
        for (const item of queue) {
          const isCritical = item.action === 'CREATE_ORDER';
          const ageMs = item.timestamp ? now - item.timestamp : 0;
          const retries = item.retryCount || 0;
          
          // Critical items (orders): 48-hour window, 5 retries max
          // Non-critical items: 15-minute window, 2 retries max
          const maxAge = isCritical ? fortyEightHoursAgo : fifteenMinutesAgo;
          const maxRetries = isCritical ? 5 : 2;
          
          const isStale = item.timestamp && item.timestamp < maxAge;
          const tooManyRetries = retries >= maxRetries;
          
          if (isStale || tooManyRetries) {
            if (isCritical) {
              // NEVER silently delete orders - mark as permanently_failed instead
              console.error(`⛔ ORDER SYNC FAILED PERMANENTLY: age=${Math.round(ageMs / 60000)}min, retries=${retries}`, JSON.stringify(item.data));
              const failedItem = { ...item, status: 'permanently_failed', failedAt: new Date().toISOString() };
              await offlineStorage.save(STORES.SYNC_QUEUE, failedItem);
              cleanQueue.push(failedItem);
            } else {
              console.log(`🧹 Removing stale sync item: ${item.action}, age=${Math.round(ageMs / 60000)}min, retries=${retries}`);
              await offlineStorage.delete(STORES.SYNC_QUEUE, item.id);
            }
          } else {
            cleanQueue.push(item);
          }
        }
        
        return cleanQueue;
      };

      const ensureNoOrderVisitsQueued = async (existingQueue: any[]) => {
        try {
          // If for any reason the syncQueue was not populated (or was cleared), rebuild
          // UPDATE_VISIT_NO_ORDER actions from offline-cached visits.
          const today = getTodayDateString();
          const queuedKeys = new Set(
            (existingQueue || [])
              .filter((q: any) => q?.action === 'UPDATE_VISIT_NO_ORDER')
              .map((q: any) => {
                const d = q?.data || {};
                return `${d.retailerId}:${d.userId}:${d.plannedDate}`;
              })
          );

          const cachedVisits = await offlineStorage.getAll<any>(STORES.VISITS);
          const candidates = (cachedVisits || []).filter((v: any) =>
            v?.planned_date === today &&
            v?.status === 'unproductive' &&
            !!v?.no_order_reason &&
            !!v?.retailer_id &&
            !!v?.user_id &&
            !v?._synced && // Skip already synced visits
            !isValidUUID(v?.id) // Skip visits with valid UUID (already in database)
          );

          for (const v of candidates) {
            const key = `${v.retailer_id}:${v.user_id}:${v.planned_date}`;
            if (queuedKeys.has(key)) continue;

            await offlineStorage.addToSyncQueue('UPDATE_VISIT_NO_ORDER', {
              visitId: v.id,
              retailerId: v.retailer_id,
              userId: v.user_id,
              noOrderReason: v.no_order_reason,
              checkOutTime: v.check_out_time,
              plannedDate: v.planned_date,
              timestamp: v.updated_at || v.created_at || new Date().toISOString(),
            });

            queuedKeys.add(key);
          }

          if (candidates.length > 0) {
            console.log('🔁 Rebuilt missing no-order sync items from offline cache:', candidates.length);
          }
        } catch (e) {
          console.warn('⚠️ Failed to rebuild no-order sync items (non-fatal):', e);
        }
      };

      // Step 1: Get and clean up stale items first
      let syncQueue = await offlineStorage.getSyncQueue();
      syncQueue = await cleanupStaleSyncItems(syncQueue);
      
      // Step 2: Only rebuild queue if there are NO existing items
      // This prevents re-adding items that are about to be processed
      if (syncQueue.length === 0) {
        await ensureNoOrderVisitsQueued(syncQueue);
        syncQueue = await offlineStorage.getSyncQueue();
      }

      if (syncQueue.length === 0) {
        isSyncingRef.current = false;
        return;
      }

      console.log(`🔄 Processing ${syncQueue.length} queued sync items`);

      let successCount = 0;
      let failCount = 0;
      const failedItems: any[] = [];

      for (const item of syncQueue) {
        try {
          console.log(`⏳ Syncing ${item.action}...`, item.data);
          
          // Process each sync item based on action type
          await processSyncItem(item);
          
          // Remove from queue after successful sync
          await offlineStorage.delete(STORES.SYNC_QUEUE, item.id);
          console.log(`✅ Successfully synced ${item.action}`);
          successCount++;
        } catch (error: any) {
          const errorMsg = error?.message || error?.toString() || 'Unknown error';
          const errorCode = error?.code || '';
          
          console.error(`❌ Failed to sync ${item.action}:`, {
            action: item.action,
            error: errorMsg,
            code: errorCode,
            details: error,
            data: item.data
          });
          
          failCount++;
          failedItems.push({
            action: item.action,
            error: errorMsg
          });
          
          // Increment retry count
          const updatedItem = {
            ...item,
            retryCount: (item.retryCount || 0) + 1,
            lastError: errorMsg,
            lastRetryAt: new Date().toISOString()
          };
          
          const isCritical = item.action === 'CREATE_ORDER';
          const maxRetries = isCritical ? 5 : 2;
          
          if (updatedItem.retryCount < maxRetries) {
            await offlineStorage.save(STORES.SYNC_QUEUE, updatedItem);
          } else if (isCritical) {
            // NEVER delete order data - mark as permanently failed for manual recovery
            console.error(`⛔ ORDER PERMANENTLY FAILED after ${maxRetries} retries:`, JSON.stringify(item.data));
            const failedItem = { ...updatedItem, status: 'permanently_failed', failedAt: new Date().toISOString() };
            await offlineStorage.save(STORES.SYNC_QUEUE, failedItem);
          } else {
            // Non-critical items can be removed after max retries
            console.error(`⛔ Removing non-critical item after ${maxRetries} failed attempts:`, item.action);
            await offlineStorage.delete(STORES.SYNC_QUEUE, item.id);
          }
        }
      }

      // SILENT SYNC: Per offline-first architecture, sync should NOT dispatch UI refresh events
      // The UI already reflects local state. Sync only backs up data to server.
      // REMOVED: syncComplete and visitDataChanged event dispatches
      
      if (successCount > 0) {
        // Only run van stock sync silently in background
        console.log('🚚 Running final van stock sync after sync complete...');
        syncOrdersToVanStock(getTodayDateString()).catch(err => {
          console.error('Error in final van stock sync:', err);
        });
      }

      // SILENT sync - no toasts, no notifications
      if (successCount > 0 && failCount === 0) {
        console.log(`✅ Silent sync complete: ${successCount} items synced`);
      } else if (failCount > 0) {
        console.log(`⚠️ Silent sync partial: ${successCount} succeeded, ${failCount} failed`);
      }
      
      // Force update sync queue indicator after processing (bypass throttle)
      if (successCount > 0 || failCount > 0) {
        window.dispatchEvent(new Event('syncQueueUpdated'));
      }
    } catch (error) {
      console.error('❌ Error processing sync queue:', error);
      // Silent error - user can check via sync modal
    } finally {
      // Always release the lock
      isSyncingRef.current = false;
    }
  }, [connectivityStatus]);

  // Process individual sync items
  const processSyncItem = async (item: any) => {
    const { action, data } = item;
    
    // Helper to check if an ID is a valid UUID (from database) vs temp offline ID
    const isValidUUID = (id: string): boolean => {
      if (!id) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };
    
    switch (action) {
      case 'UPDATE_VISIT_NO_ORDER':
        try {
          console.log('📝 Syncing no-order visit update:', JSON.stringify(data));
          const { visitId: noOrderVisitId, retailerId: noOrderRetailerId, userId: noOrderUserId, noOrderReason, checkOutTime, plannedDate, timestamp } = data;
          
          // Validate required fields
          if (!noOrderRetailerId || !noOrderUserId || !plannedDate) {
            console.error('❌ Missing required fields for no-order sync:', { noOrderRetailerId, noOrderUserId, plannedDate });
            throw new Error(`Missing required fields: retailerId=${noOrderRetailerId}, userId=${noOrderUserId}, plannedDate=${plannedDate}`);
          }
          
          // Use checkOutTime or timestamp as fallback
          const effectiveCheckOutTime = checkOutTime || timestamp || new Date().toISOString();
          
          // ALWAYS look up or create visit by retailer_id + user_id + planned_date
          // This ensures we handle ALL cases: offline IDs, stale cached IDs, or missing visits
          // Use order + limit to handle duplicate visits (get most recent one)
          console.log('🔍 Looking for existing visit in database for:', { noOrderRetailerId, noOrderUserId, plannedDate });
          
          const { data: existingVisits, error: lookupError } = await supabase
            .from('visits')
            .select('id')
            .eq('retailer_id', noOrderRetailerId)
            .eq('user_id', noOrderUserId)
            .eq('planned_date', plannedDate)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (lookupError) {
            console.error('❌ Error looking up visit:', lookupError);
            throw lookupError;
          }
          
          const existingVisit = existingVisits && existingVisits.length > 0 ? existingVisits[0] : null;
          
          let effectiveNoOrderVisitId: string;
          
          if (existingVisit) {
            effectiveNoOrderVisitId = existingVisit.id;
            console.log('✅ Found existing visit:', effectiveNoOrderVisitId);
            
            // Update the existing visit
            const { data: updatedVisit, error: updateError } = await supabase
              .from('visits')
              .update({
                status: 'unproductive',
                no_order_reason: noOrderReason,
                check_out_time: effectiveCheckOutTime,
                updated_at: new Date().toISOString()
              })
              .eq('id', effectiveNoOrderVisitId)
              .select()
              .single();
            
            if (updateError) throw updateError;
            console.log('✅ Visit updated with no-order reason');
            
            // Cache the updated visit with _synced flag to prevent rebuild loop
            if (updatedVisit) {
              await offlineStorage.save(STORES.VISITS, { ...updatedVisit, _synced: true });
              console.log('✅ Updated visit cached with _synced flag');
            }
          } else {
            // Create new visit
            console.log('📝 Creating new visit for no-order...');
            const { data: newVisit, error: createError } = await supabase
              .from('visits')
              .insert({
                retailer_id: noOrderRetailerId,
                user_id: noOrderUserId,
                planned_date: plannedDate,
                status: 'unproductive',
                no_order_reason: noOrderReason,
                check_out_time: effectiveCheckOutTime,
                created_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (createError) throw createError;
            
            effectiveNoOrderVisitId = newVisit.id;
            console.log('✅ No-order visit created successfully:', effectiveNoOrderVisitId);
            
            // Cache the new visit with _synced flag
            await offlineStorage.save(STORES.VISITS, { ...newVisit, _synced: true });
          }
          
          // Update visitStatusCache to ensure UI reflects the change
          await visitStatusCache.set(
            effectiveNoOrderVisitId,
            noOrderRetailerId,
            noOrderUserId,
            plannedDate,
            'unproductive',
            undefined,
            noOrderReason
          );
          console.log('✅ Visit status cache updated for retailer:', noOrderRetailerId);
          
          // REMOVED: Event dispatches after individual sync items
          // Per offline-first architecture: UI was already updated locally when the action was queued
          // Sync only backs up to server, no UI refresh needed
          console.log('✅ No-order visit synced silently to database');
        
        } catch (noOrderError) {
          console.error('❌ Error in UPDATE_VISIT_NO_ORDER:', noOrderError);
          throw noOrderError;
        }
        break;
        
        
      case 'CREATE_ORDER':
        console.log('Syncing order creation:', data);
        // Handle both old format (single data) and new format (order + items)
        if (data.order && data.items) {
          // Strip non-existent columns (scheme_details, pending_amount)
          const { scheme_details, pending_amount, ...orderClean } = data.order;
          
          // KEEP the order ID if it's a valid UUID (generated by offlineOrderUtils)
          // Only strip if it's not a valid UUID (offline-generated temp ID)
          const offlineOrderId = orderClean.id;
          const orderToInsert = { ...orderClean };
          if (offlineOrderId && !isValidUUID(offlineOrderId)) {
            console.log('⚠️ Stripping invalid order ID:', offlineOrderId);
            delete orderToInsert.id;
          }
          
          // Strip visit_id if it's not a valid UUID (offline-generated)
          if (orderToInsert.visit_id && !isValidUUID(orderToInsert.visit_id)) {
            console.log('⚠️ Stripping invalid visit_id:', orderToInsert.visit_id);
            delete orderToInsert.visit_id;
          }
          
          // DUPLICATE PREVENTION: Check if order already exists by ID first, then idempotency_key
          if (offlineOrderId && isValidUUID(offlineOrderId)) {
            const { data: existingById } = await supabase
              .from('orders')
              .select('id')
              .eq('id', offlineOrderId)
              .maybeSingle();
            
            if (existingById) {
              console.log('✅ Order already synced by ID, skipping:', offlineOrderId);
              return; // Already synced by offlineOrderUtils direct sync
            }
          }
          
          if (orderToInsert.idempotency_key) {
            try {
              const checkResult = await (supabase
                .from('orders')
                .select('id')
                .eq('idempotency_key', orderToInsert.idempotency_key)
                .limit(1) as any);
              
              if (checkResult.data && checkResult.data.length > 0) {
                console.log('⚠️ Order with idempotency_key already exists, skipping duplicate:', orderToInsert.idempotency_key);
                return; // Successfully "synced" (already existed)
              }
            } catch (dupCheckError) {
              console.warn('Could not check for duplicate order (continuing):', dupCheckError);
            }
          }
          
          // New format with separate order and items
          let actualOrderId = offlineOrderId; // Use offline ID as fallback
          
          // Try to insert order (with original UUID if valid)
          const { data: insertedOrder, error: orderError } = await supabase
            .from('orders')
            .insert(orderToInsert)
            .select()
            .single();
          
          // Handle duplicate key error gracefully
          if (orderError) {
            if (orderError.code === '23505') {
              // Duplicate key error - order already exists
              // Find the existing order to get its ID for items
              console.log('⚠️ Duplicate order detected, checking for missing items...');
              
              // Try to find existing order by idempotency_key or retailer+date
              let existingOrderId = null;
              if (orderToInsert.idempotency_key) {
                const { data: existing } = await supabase
                  .from('orders')
                  .select('id')
                  .eq('idempotency_key', orderToInsert.idempotency_key)
                  .single();
                existingOrderId = existing?.id;
              }
              
              if (!existingOrderId && orderToInsert.retailer_id) {
                // Fallback: find by retailer and approximate time
                const { data: existing } = await supabase
                  .from('orders')
                  .select('id')
                  .eq('retailer_id', orderToInsert.retailer_id)
                  .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();
                existingOrderId = existing?.id;
              }
              
              if (existingOrderId) {
                actualOrderId = existingOrderId;
              }
              // Don't return here - continue to ensure items exist
            } else {
              throw orderError;
            }
          } else {
            actualOrderId = insertedOrder.id;
          }
          
          // ALWAYS check and insert items (even if order existed)
          // First check if items already exist for this order
          const { data: existingItems } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', actualOrderId)
            .limit(1);
          
          if (!existingItems || existingItems.length === 0) {
            // Items don't exist - insert them
            const itemsWithCorrectOrderId = data.items.map((item: any) => {
              // Strip variant_id if the column doesn't exist
              const { variant_id, ...itemWithoutVariant } = item;
              return {
                ...itemWithoutVariant,
                order_id: actualOrderId
              };
            });
            
            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(itemsWithCorrectOrderId);
            
            // Ignore duplicate errors for items
            if (itemsError && itemsError.code !== '23505') {
              throw itemsError;
            }
            
            console.log('✅ Order items synced for order:', actualOrderId);
          }
          
          // POST-SYNC CLEANUP: Remove synced order from local storage to prevent duplicates
          // Since the order now exists in DB, we don't need to keep it locally
          try {
            // Delete the offline order by its original ID
            if (offlineOrderId) {
              await offlineStorage.delete(STORES.ORDERS, offlineOrderId);
              console.log('🧹 [orderCleanup] Removed synced order from local storage:', offlineOrderId);
            }
            
            // Also try to delete by actualOrderId in case it was saved with DB ID
            if (actualOrderId && actualOrderId !== offlineOrderId) {
              await offlineStorage.delete(STORES.ORDERS, actualOrderId);
            }
            
            // Clean by idempotency_key as well
            if (data.order?.idempotency_key) {
              const cachedOrders = await offlineStorage.getAll<any>(STORES.ORDERS);
              const matchingOrders = cachedOrders.filter((o: any) => 
                o.idempotency_key === data.order.idempotency_key
              );
              for (const matchingOrder of matchingOrders) {
                await offlineStorage.delete(STORES.ORDERS, matchingOrder.id);
                console.log('🧹 [orderCleanup] Removed order by idempotency_key:', matchingOrder.id);
              }
            }
          } catch (cacheErr) {
            console.warn('⚠️ Post-sync cleanup failed (non-fatal):', cacheErr);
          }

          // Update retailer's pending_amount and last_order_date
          const orderRetailerId = data.order?.retailer_id;
          if (orderRetailerId) {
            // Get current pending amount from retailer
            const { data: retailerData } = await supabase
              .from('retailers')
              .select('pending_amount')
              .eq('id', orderRetailerId)
              .single();
            
            const currentPending = retailerData?.pending_amount || 0;
            const creditPending = data.order?.credit_pending_amount || 0;
            const creditPaid = data.order?.credit_paid_amount || 0;
            const previousCleared = data.order?.previous_pending_cleared || 0;
            
            // Calculate new pending: current + new credit - paid amount (that clears previous)
            const newPending = data.order?.is_credit_order 
              ? currentPending + creditPending - previousCleared
              : 0; // Full payment clears everything
            
            console.log('💰 Updating retailer pending amount from sync:', { 
              orderRetailerId, 
              currentPending, 
              creditPending,
              creditPaid,
              previousCleared,
              newPending 
            });
            
            const { error: retailerUpdateError } = await supabase
              .from('retailers')
              .update({ 
                pending_amount: Math.max(0, newPending),
                last_order_date: new Date().toISOString().split('T')[0]
              })
              .eq('id', orderRetailerId);
            
            if (retailerUpdateError) {
              console.error('❌ Failed to update retailer pending amount during sync:', retailerUpdateError);
            } else {
              console.log('✅ Retailer pending amount updated during sync');
            }
          }

          // Trigger visit status refresh (database trigger auto-updates visit status)
          if (data.visitId || data.order?.visit_id) {
            const visitId = data.visitId || data.order.visit_id;
            const retailerId = data.order?.retailer_id;
            
            // Explicitly update visit status to productive (don't rely only on DB trigger)
            console.log('🔄 Updating visit status to productive after order sync:', { visitId });
            const { error: visitUpdateError } = await supabase
              .from('visits')
              .update({
                status: 'productive',
                no_order_reason: null,
                check_out_time: new Date().toISOString()
              })
              .eq('id', visitId);
            
            if (visitUpdateError) {
              console.error('❌ Error updating visit status:', visitUpdateError);
            } else {
              console.log('✅ Visit status updated to productive');
            }
            
            console.log('✅ Order synced, dispatching visitStatusChanged event:', { visitId, retailerId });
            
            // Include order in dispatch for immediate orders state update
            window.dispatchEvent(new CustomEvent('visitStatusChanged', {
              detail: { 
                visitId, 
                status: 'productive', 
                retailerId,
                order: data.order 
              }
            }));
            
            // ALSO dispatch visitDataChanged to trigger full page reload with increased delay
            setTimeout(() => {
              console.log('✅ Dispatching visitDataChanged for full page reload');
              window.dispatchEvent(new Event('visitDataChanged'));
            }, 1000);
            
            // Sync order quantities to van stock
            console.log('🚚 Syncing order to van stock...');
            const orderDate = data.order?.created_at?.split('T')[0] || getTodayDateString();
            syncOrdersToVanStock(orderDate, data.order?.user_id).catch(err => {
              console.error('Error syncing van stock after order:', err);
            });
          }
        } else {
          // Old format - just the order data
          const { error: orderError } = await supabase
            .from('orders')
            .insert(data);
          if (orderError) throw orderError;

          // Update retailer's pending_amount for old format too
          if (data.retailer_id) {
            const { data: retailerData } = await supabase
              .from('retailers')
              .select('pending_amount')
              .eq('id', data.retailer_id)
              .single();
            
            const currentPending = retailerData?.pending_amount || 0;
            const creditPending = data.credit_pending_amount || 0;
            const previousCleared = data.previous_pending_cleared || 0;
            
            const newPending = data.is_credit_order 
              ? currentPending + creditPending - previousCleared
              : 0;
            
            console.log('💰 Updating retailer pending amount from sync (old format):', { 
              retailerId: data.retailer_id, 
              currentPending, 
              creditPending,
              previousCleared,
              newPending 
            });
            
            await supabase
              .from('retailers')
              .update({ 
                pending_amount: Math.max(0, newPending),
                last_order_date: new Date().toISOString().split('T')[0]
              })
              .eq('id', data.retailer_id);
          }

          // Trigger visit status refresh (database trigger auto-updates visit status)
          if (data.visit_id) {
            // Explicitly update visit status to productive (don't rely only on DB trigger)
            console.log('🔄 Updating visit status to productive after order sync (old format):', { visitId: data.visit_id });
            const { error: visitUpdateError } = await supabase
              .from('visits')
              .update({
                status: 'productive',
                no_order_reason: null,
                check_out_time: new Date().toISOString()
              })
              .eq('id', data.visit_id);
            
            if (visitUpdateError) {
              console.error('❌ Error updating visit status:', visitUpdateError);
            } else {
              console.log('✅ Visit status updated to productive');
            }
            
            console.log('✅ Order synced, dispatching visitStatusChanged event:', { 
              visitId: data.visit_id, 
              retailerId: data.retailer_id 
            });
            
            // Include order in dispatch for immediate orders state update
            window.dispatchEvent(new CustomEvent('visitStatusChanged', {
              detail: { 
                visitId: data.visit_id, 
                status: 'productive', 
                retailerId: data.retailer_id,
                order: data 
              }
            }));
            
            // ALSO dispatch visitDataChanged to trigger full page reload with increased delay
            setTimeout(() => {
              console.log('✅ Dispatching visitDataChanged for full page reload');
              window.dispatchEvent(new Event('visitDataChanged'));
            }, 1000);
            
            // Sync order quantities to van stock (old format)
            console.log('🚚 Syncing order to van stock (old format)...');
            const oldOrderDate = data.created_at?.split('T')[0] || getTodayDateString();
            syncOrdersToVanStock(oldOrderDate, data.user_id).catch(err => {
              console.error('Error syncing van stock after order:', err);
            });
          }
        }
        break;
        
      case 'UPDATE_ORDER':
        console.log('Syncing order update:', data);
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update(data.updates)
          .eq('id', data.id);
        if (updateOrderError) throw updateOrderError;
        break;
        
      case 'CREATE_VISIT':
      case 'CHECK_IN':
        console.log('Syncing visit/check-in:', data);
        // Only include valid columns - explicitly exclude invalid fields like visit_type
        const visitInsertData: any = {};
        if (data.user_id) visitInsertData.user_id = data.user_id;
        if (data.retailer_id) visitInsertData.retailer_id = data.retailer_id;
        if (data.planned_date) visitInsertData.planned_date = data.planned_date;
        if (data.status) visitInsertData.status = data.status;
        if (data.check_in_time) visitInsertData.check_in_time = data.check_in_time;
        if (data.check_in_location) visitInsertData.check_in_location = data.check_in_location;
        if (data.check_in_photo_url) visitInsertData.check_in_photo_url = data.check_in_photo_url;
        if (data.check_in_address) visitInsertData.check_in_address = data.check_in_address;
        if (data.location_match_in !== undefined) visitInsertData.location_match_in = data.location_match_in;
        if (data.skip_check_in_reason) visitInsertData.skip_check_in_reason = data.skip_check_in_reason;
        if (data.skip_check_in_time) visitInsertData.skip_check_in_time = data.skip_check_in_time;
        if (data.no_order_reason) visitInsertData.no_order_reason = data.no_order_reason;
        
        const { error: visitError } = await supabase
          .from('visits')
          .insert(visitInsertData);
        if (visitError) throw visitError;
        break;
        
      case 'CHECK_OUT':
        console.log('Syncing check-out:', data);
        const { error: checkoutError } = await supabase
          .from('visits')
          .update({
            check_out_time: data.check_out_time,
            check_out_location: data.check_out_location,
            check_out_photo_url: data.check_out_photo_url,
            check_out_address: data.check_out_address,
            location_match_out: data.location_match_out,
            status: 'completed'
          })
          .eq('id', data.visit_id);
        if (checkoutError) throw checkoutError;
        break;
        
      case 'CREATE_VISIT_LOG':
        console.log('Syncing retailer visit log:', data);
        // Check if log already exists for this retailer/user/date to prevent duplicates
        const { data: existingLogs, error: checkLogError } = await supabase
          .from('retailer_visit_logs')
          .select('id')
          .eq('user_id', data.user_id)
          .eq('retailer_id', data.retailer_id)
          .eq('visit_date', data.visit_date)
          .limit(1);
        
        if (!checkLogError && existingLogs && existingLogs.length > 0) {
          console.log('⚠️ Visit log already exists, updating instead:', existingLogs[0].id);
          // Update existing log instead of creating duplicate
          await supabase
            .from('retailer_visit_logs')
            .update({
              end_time: data.end_time,
              time_spent_seconds: data.time_spent_seconds
            })
            .eq('id', existingLogs[0].id);
        } else {
          // Remove the offline-generated ID before inserting to let Supabase generate a new one
          const { id: offlineId, ...visitLogData } = data;
          const { error: visitLogError } = await supabase
            .from('retailer_visit_logs')
            .insert(visitLogData);
          if (visitLogError) throw visitLogError;
        }
        
        // Remove from offline storage after successful sync
        try {
          await offlineStorage.delete(STORES.RETAILER_VISIT_LOGS, data.id);
          console.log('✅ Removed synced visit log from offline storage');
        } catch (deleteError) {
          console.log('Note: Could not remove visit log from offline storage:', deleteError);
        }
        break;
        
      case 'UPDATE_VISIT_LOG':
        console.log('Syncing visit log update:', data);
        // CRITICAL: Use the end_time from the queued data (captured when action occurred)
        // NOT the current sync processing time
        const queuedEndTime = data.end_time;
        const queuedTimeSpent = data.time_spent_seconds;
        
        if (!queuedEndTime) {
          console.log('⚠️ No end_time in queued data, skipping');
          break;
        }
        
        // Find the existing log by user/retailer/date and update
        const { data: logsToUpdate, error: findLogError } = await supabase
          .from('retailer_visit_logs')
          .select('id, end_time')
          .eq('user_id', data.user_id)
          .eq('retailer_id', data.retailer_id)
          .eq('visit_date', data.visit_date)
          .order('start_time', { ascending: false })
          .limit(1);
        
        if (findLogError) throw findLogError;
        
        if (logsToUpdate && logsToUpdate.length > 0) {
          const existingEndTime = logsToUpdate[0].end_time;
          
          // Only update if our queued end_time is newer than what's in DB
          // This prevents older queue items from overwriting newer data
          if (!existingEndTime || new Date(queuedEndTime) > new Date(existingEndTime)) {
            const { error: updateLogError } = await supabase
              .from('retailer_visit_logs')
              .update({
                end_time: queuedEndTime,
                time_spent_seconds: queuedTimeSpent
              })
              .eq('id', logsToUpdate[0].id);
            if (updateLogError) throw updateLogError;
            console.log('✅ Visit log updated in database with queued timestamp:', queuedEndTime);
          } else {
            console.log('⏭️ Skipping update - DB has newer end_time than queued');
          }
        } else {
          console.log('⚠️ No existing log found to update, skipping');
        }
        break;
        
      case 'CREATE_STOCK':
        console.log('Syncing stock creation:', data);
        const { error: stockError } = await supabase
          .from('stock')
          .insert(data);
        if (stockError) throw stockError;
        break;
        
      case 'UPDATE_STOCK':
        console.log('Syncing stock update:', data);
        const { error: updateStockError } = await supabase
          .from('stock')
          .update(data.updates)
          .eq('id', data.id);
        if (updateStockError) throw updateStockError;
        break;
        
      case 'CREATE_RETAILER':
        console.log('Syncing retailer creation:', data);
        // Handle both data formats: wrapped { retailer, tempId } or direct retailer object
        const retailerPayload = data.retailer || data;
        // Remove tempId if present (it's not a database field)
        const { tempId, ...retailerData } = retailerPayload;
        const { error: retailerError } = await supabase
          .from('retailers')
          .insert(retailerData);
        if (retailerError) throw retailerError;
        
        // Dispatch event to refresh retailer list
        window.dispatchEvent(new Event('retailerDataChanged'));
        console.log('✅ Retailer created successfully');
        break;
        
      case 'UPDATE_RETAILER':
        console.log('Syncing retailer update:', data);
        const { id: retailerId, updates, user_id } = data;
        const { error: updateRetailerError } = await supabase
          .from('retailers')
          .update(updates)
          .eq('id', retailerId)
          .eq('user_id', user_id);
        if (updateRetailerError) throw updateRetailerError;
        break;
        
      case 'CREATE_ATTENDANCE':
        console.log('Syncing attendance check-in:', data);
        const { data: syncedAttendance, error: attendanceError } = await supabase
          .from('attendance')
          .insert(data)
          .select()
          .single();
        if (attendanceError) throw attendanceError;
        
        // Update offline storage with real database ID
        if (syncedAttendance) {
          await offlineStorage.save(STORES.ATTENDANCE, { 
            ...syncedAttendance, 
            cached_at: new Date().toISOString() 
          });
          console.log('✅ Attendance synced and cache updated with real ID');
        }
        break;
        
      case 'UPDATE_ATTENDANCE':
        console.log('Syncing attendance check-out:', data);
        const { error: updateAttendanceError } = await supabase
          .from('attendance')
          .update(data.updates)
          .eq('id', data.id);
        if (updateAttendanceError) throw updateAttendanceError;
        break;
        
      case 'CREATE_BEAT':
        console.log('Syncing beat creation:', data);
        const { error: beatError } = await supabase
          .from('beats')
          .insert(data);
        if (beatError) throw beatError;
        break;
        
      case 'UPDATE_BEAT':
        console.log('Syncing beat update:', data);
        const { error: updateBeatError } = await supabase
          .from('beats')
          .update(data.updates)
          .eq('id', data.id);
        if (updateBeatError) throw updateBeatError;
        break;
        
      case 'CREATE_BEAT_PLAN':
        console.log('Syncing beat plan creation:', data);
        const { error: beatPlanError } = await supabase
          .from('beat_plans')
          .insert(data);
        if (beatPlanError) throw beatPlanError;
        break;
        
      case 'DELETE_RETAILER':
        console.log('Syncing retailer deletion:', data);
        const { error: deleteRetailerError } = await supabase
          .from('retailers')
          .delete()
          .eq('id', data.id);
        if (deleteRetailerError) throw deleteRetailerError;
        break;
        
      case 'DELETE_BEAT':
        console.log('Syncing beat deletion:', data);
        const { error: deleteBeatError } = await supabase
          .from('beats')
          .delete()
          .eq('id', data.id);
        if (deleteBeatError) throw deleteBeatError;
        break;
        
      case 'UPDATE_BEAT_PLAN':
        console.log('Syncing beat plan update:', data);
        const { error: updateBeatPlanError } = await supabase
          .from('beat_plans')
          .update(data.updates)
          .eq('id', data.id);
        if (updateBeatPlanError) throw updateBeatPlanError;
        break;
        
      case 'NO_ORDER':
        console.log('Syncing no order visit:', data);
        const { error: noOrderError } = await supabase
          .from('visits')
          .update({
            status: 'no_order',
            no_order_reason: data.reason,
            notes: data.notes,
            visit_date: data.visit_date
          })
          .eq('id', data.visit_id);
        if (noOrderError) throw noOrderError;
        break;
        
      case 'CREATE_COMPETITION_DATA':
        console.log('Syncing competition data:', data);
        const { error: competitionError } = await supabase
          .from('competition_data')
          .insert(data);
        if (competitionError) throw competitionError;
        break;
        
      case 'CREATE_RETURN_STOCK':
        console.log('Syncing return stock:', data);
        // Return stock is typically part of orders table or a separate returns table
        // Update this based on your schema
        const { error: returnStockError } = await supabase
          .from('orders')
          .insert({
            ...data,
            order_type: 'return'
          });
        if (returnStockError) throw returnStockError;
        break;
        
      case 'SEND_INVOICE':
        console.log('Syncing invoice send:', data);
        try {
          // Convert base64 back to blob
          const base64Data = data.invoiceBlob.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          
          const fileName = data.fileName;
          
          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, blob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) throw uploadError;

          if (uploadData) {
            // Get public URL
            const { data: { publicUrl } } = await supabase.storage
              .from('invoices')
              .getPublicUrl(uploadData.path);

            // Send via edge function
            const { error: fnError } = await supabase.functions.invoke('send-invoice-whatsapp', {
              body: {
                invoiceId: data.orderId,
                customerPhone: data.customerPhone,
                pdfUrl: publicUrl,
                invoiceNumber: data.invoiceNumber
              }
            });

            if (fnError) throw fnError;
            console.log('✅ Invoice sent during sync');
          }
        } catch (invoiceError) {
          console.error('Failed to send invoice during sync:', invoiceError);
          throw invoiceError;
        }
        break;
        
      case 'SEND_INVOICE_SMS':
        console.log('📨 Syncing invoice SMS/WhatsApp from offline queue:', data);
        try {
          console.log('📄 Generating invoice PDF for order:', data.orderId);
          
          // Generate invoice PDF
          const { fetchAndGenerateInvoice } = await import('@/utils/invoiceGenerator');
          const { blob, invoiceNumber } = await fetchAndGenerateInvoice(data.orderId);
          
          console.log('✅ Invoice generated:', invoiceNumber);
          
          const fileName = `invoice-${invoiceNumber}.pdf`;
          
          console.log('☁️ Uploading PDF to storage:', fileName);
          
          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, blob, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) {
            console.error('❌ Storage upload failed during sync:', uploadError);
            throw uploadError;
          }

          if (uploadData) {
            console.log('✅ PDF uploaded successfully');
            
            // Get public URL
            const { data: { publicUrl } } = await supabase.storage
              .from('invoices')
              .getPublicUrl(uploadData.path);

            console.log('🔗 Public URL:', publicUrl);
            console.log('📨 Invoking send-invoice-whatsapp edge function...');

            // Send via edge function
            const { data: fnResult, error: fnError } = await supabase.functions.invoke('send-invoice-whatsapp', {
              body: {
                invoiceId: data.orderId,
                customerPhone: data.customerPhone,
                pdfUrl: publicUrl,
                invoiceNumber: invoiceNumber
              }
            });

            if (fnError) {
              console.error('❌ Edge function error during sync:', fnError);
              throw fnError;
            }
            
            console.log('✅ Invoice SMS/WhatsApp sent successfully during sync:', fnResult);
            
            // Show success notification
            toast({
              title: '✅ SMS Sent',
              description: 'Offline invoice SMS delivered successfully',
              duration: 3000,
            });
          }
        } catch (smsError) {
          console.error('❌ Failed to send invoice SMS during sync:', smsError);
          console.error('❌ SMS error details:', JSON.stringify(smsError, null, 2));
          throw smsError;
        }
        break;
        
      case 'UPLOAD_PAYMENT_PROOF':
        console.log('Syncing payment proof upload:', data);
        try {
          // Convert base64 back to blob
          const base64Data = data.blobBase64.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'image/jpeg' });
          
          // Upload the blob to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('expense-bills')
            .upload(data.fileName, blob, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = await supabase.storage
            .from('expense-bills')
            .getPublicUrl(data.fileName);

          console.log(`✅ Payment proof uploaded: ${publicUrl}`);
          
          // Note: The order was already submitted with null payment_proof_url
          // If needed, we could update the order here with the new URL
          // But for now, the proof is uploaded and available in storage
        } catch (uploadError) {
          console.error('Failed to upload payment proof:', uploadError);
          throw uploadError;
        }
        break;
        
      default:
        console.warn('Unknown sync action:', action);
    }
  };

  // Save data with offline support
  const saveWithOfflineSupport = useCallback(async (
    storeName: string, 
    data: any, 
    syncAction?: string
  ) => {
    try {
      // Always save to IndexedDB first
      await offlineStorage.save(storeName, data);
      
      // If online, try to sync to server
      if (connectivityStatus === 'online' && syncAction) {
        try {
          await processSyncItem({ action: syncAction, data });
        } catch (error) {
          // If server sync fails, add to sync queue
          await offlineStorage.addToSyncQueue(syncAction, data);
          toast({
            title: "Saved Offline",
            description: "Changes will sync when online",
          });
        }
      } else if (syncAction) {
        // If offline, add to sync queue
        await offlineStorage.addToSyncQueue(syncAction, data);
        toast({
          title: "Saved Offline",
          description: "Changes queued for sync",
        });
      }
    } catch (error) {
      console.error('Error saving with offline support:', error);
      throw error;
    }
  }, [connectivityStatus]);

  // Auto-sync when connectivity is restored and cleanup old data
  useEffect(() => {
    if (connectivityStatus === 'online') {
      // Trigger sync immediately when online
      console.log('🌐 Internet connected - starting immediate sync...');
      processSyncQueue();
      
      // Retry sync multiple times to ensure all items are processed
      const retryTimeouts = [
        setTimeout(() => {
          console.log('🔄 Running follow-up sync check (3s)...');
          processSyncQueue();
        }, 3000),
        setTimeout(() => {
          console.log('🔄 Running follow-up sync check (10s)...');
          processSyncQueue();
        }, 10000),
        setTimeout(() => {
          console.log('🔄 Running follow-up sync check (30s)...');
          processSyncQueue();
        }, 30000),
      ];
      
      // Also sync when app becomes visible (user switches back to app)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && connectivityStatus === 'online') {
          console.log('👁️ App became visible - triggering sync...');
          processSyncQueue();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Sync on focus (browser tab focused)
      const handleFocus = () => {
        if (connectivityStatus === 'online') {
          console.log('🎯 Window focused - triggering sync...');
          processSyncQueue();
        }
      };
      window.addEventListener('focus', handleFocus);
      
      // Clean up old synced items (older than 3 days) after successful sync
      const cleanupOldData = async () => {
        try {
          await offlineStorage.deleteOldSyncedItems();
          console.log('🧹 Old synced data cleaned up successfully');
        } catch (error) {
          console.error('❌ Error cleaning up old data:', error);
        }
      };
      
      // Run cleanup after sync completes
      const cleanupTimeout = setTimeout(cleanupOldData, 15000);
      
      return () => {
        retryTimeouts.forEach(clearTimeout);
        clearTimeout(cleanupTimeout);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [connectivityStatus, processSyncQueue]);

  return {
    connectivityStatus,
    saveWithOfflineSupport,
    processSyncQueue,
    isOnline: connectivityStatus === 'online',
    isOffline: connectivityStatus === 'offline',
    isUnknown: connectivityStatus === 'unknown'
  };
}