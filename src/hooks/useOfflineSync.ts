import { useEffect, useCallback } from 'react';
import { useConnectivity } from './useConnectivity';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { toast } from '@/hooks/use-toast';

export function useOfflineSync() {
  const connectivityStatus = useConnectivity();

  // Process sync queue when coming back online
  const processSyncQueue = useCallback(async () => {
    if (connectivityStatus !== 'online') return;

    try {
      const syncQueue = await offlineStorage.getSyncQueue();
      
      if (syncQueue.length === 0) return;
      
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
            lastError: errorMsg
          };
          
          // Keep in queue for retry (max 5 attempts)
          if (updatedItem.retryCount < 5) {
            await offlineStorage.save(STORES.SYNC_QUEUE, updatedItem);
          } else {
            // After 5 failed attempts, remove from queue
            console.error(`⛔ Removing item after 5 failed attempts:`, item.action);
            await offlineStorage.delete(STORES.SYNC_QUEUE, item.id);
          }
        }
      }

      // Silent sync - no automatic toasts
      // Users can check sync progress via the sync icon/modal
      if (successCount > 0 && failCount === 0) {
        console.log(`✅ Silent sync complete: ${successCount} items synced successfully`);
      } else if (failCount > 0) {
        const failedActions = failedItems.map(f => f.action).join(', ');
        console.log(`⚠️ Silent sync partial: ${successCount} succeeded, ${failCount} failed (${failedActions})`);
      }
    } catch (error) {
      console.error('❌ Error processing sync queue:', error);
      // Silent error - user can check via sync modal
    }
  }, [connectivityStatus]);

  // Process individual sync items
  const processSyncItem = async (item: any) => {
    const { action, data } = item;
    
    // Import supabase client dynamically to avoid circular dependencies
    const { supabase } = await import('@/integrations/supabase/client');
    
    switch (action) {
      case 'UPDATE_VISIT_NO_ORDER':
        console.log('Syncing no-order visit update:', data);
        const { visitId: noOrderVisitId, retailerId: noOrderRetailerId, userId: noOrderUserId, noOrderReason, plannedDate } = data;
        
        let effectiveNoOrderVisitId = noOrderVisitId;
        
        // If no visit ID was stored, try to find or create the visit
        if (!effectiveNoOrderVisitId) {
          console.log('No visit ID in queue, looking for existing visit...');
          const { data: existingVisit } = await supabase
            .from('visits')
            .select('id')
            .eq('retailer_id', noOrderRetailerId)
            .eq('user_id', noOrderUserId)
            .eq('planned_date', plannedDate)
            .maybeSingle();
          
          if (existingVisit) {
            effectiveNoOrderVisitId = existingVisit.id;
            console.log('Found existing visit:', effectiveNoOrderVisitId);
          } else {
            // Create new visit
            console.log('Creating new visit for no-order...');
            const { data: newVisit, error: createError } = await supabase
              .from('visits')
              .insert({
                retailer_id: noOrderRetailerId,
                user_id: noOrderUserId,
                planned_date: plannedDate,
                status: 'unproductive',
                no_order_reason: noOrderReason,
                created_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (createError) throw createError;
            
            effectiveNoOrderVisitId = newVisit.id;
            console.log('Created new visit:', effectiveNoOrderVisitId);
            
            // Cache the new visit
            await offlineStorage.save(STORES.VISITS, newVisit);
          }
        }
        
        // Update the visit with no-order reason
        const { error: updateError } = await supabase
          .from('visits')
          .update({
            status: 'unproductive',
            no_order_reason: noOrderReason,
            updated_at: new Date().toISOString()
          })
          .eq('id', effectiveNoOrderVisitId);
        
        if (updateError) throw updateError;
        
        console.log('✅ Visit updated with no-order reason');
        
        // Dispatch event to update UI
        window.dispatchEvent(new CustomEvent('visitStatusChanged', {
          detail: { visitId: effectiveNoOrderVisitId, status: 'unproductive', retailerId: noOrderRetailerId }
        }));
        
        // ALSO dispatch visitDataChanged to trigger full page reload and update unproductive count
        setTimeout(() => {
          console.log('✅ Dispatching visitDataChanged for unproductive count update');
          window.dispatchEvent(new Event('visitDataChanged'));
        }, 1000); // Increased delay to ensure database update completes
        
        break;
        
      case 'CREATE_ORDER':
        console.log('Syncing order creation:', data);
        // Handle both old format (single data) and new format (order + items)
        if (data.order && data.items) {
          // New format with separate order and items
          const { error: orderError } = await supabase
            .from('orders')
            .insert(data.order);
          if (orderError) throw orderError;
          
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(data.items);
          if (itemsError) throw itemsError;

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

          // Trigger visit status refresh - create visit if doesn't exist
          const retailerId = data.order?.retailer_id;
          const userId = data.order?.user_id;
          const plannedDate = data.order?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
          let effectiveVisitId = data.visitId || data.order?.visit_id;
          
          // If no visit ID, try to find or create one
          if (!effectiveVisitId && retailerId && userId) {
            console.log('🔍 No visit ID found for order, looking for existing visit...');
            const { data: existingVisit } = await supabase
              .from('visits')
              .select('id')
              .eq('retailer_id', retailerId)
              .eq('user_id', userId)
              .eq('planned_date', plannedDate)
              .maybeSingle();
            
            if (existingVisit) {
              effectiveVisitId = existingVisit.id;
              console.log('✅ Found existing visit:', effectiveVisitId);
            } else {
              // Create a new visit for this order
              console.log('📝 Creating new visit for synced order...');
              const { data: newVisit, error: createVisitError } = await supabase
                .from('visits')
                .insert({
                  retailer_id: retailerId,
                  user_id: userId,
                  planned_date: plannedDate,
                  status: 'productive',
                  check_out_time: new Date().toISOString(),
                  created_at: new Date().toISOString()
                })
                .select()
                .single();
              
              if (createVisitError) {
                console.error('❌ Error creating visit for order:', createVisitError);
              } else {
                effectiveVisitId = newVisit.id;
                console.log('✅ Created new visit for order:', effectiveVisitId);
                
                // Cache the new visit
                await offlineStorage.save(STORES.VISITS, newVisit);
              }
            }
          }
          
          // Update visit status to productive
          if (effectiveVisitId) {
            console.log('🔄 Updating visit status to productive after order sync:', { visitId: effectiveVisitId });
            const { error: visitUpdateError } = await supabase
              .from('visits')
              .update({
                status: 'productive',
                no_order_reason: null,
                check_out_time: new Date().toISOString()
              })
              .eq('id', effectiveVisitId);
            
            if (visitUpdateError) {
              console.error('❌ Error updating visit status:', visitUpdateError);
            } else {
              console.log('✅ Visit status updated to productive');
            }
            
            console.log('✅ Order synced, dispatching visitStatusChanged event:', { visitId: effectiveVisitId, retailerId });
            
            window.dispatchEvent(new CustomEvent('visitStatusChanged', {
              detail: { visitId: effectiveVisitId, status: 'productive', retailerId }
            }));
            
            // ALSO dispatch visitDataChanged to trigger full page reload with increased delay
            setTimeout(() => {
              console.log('✅ Dispatching visitDataChanged for full page reload');
              window.dispatchEvent(new Event('visitDataChanged'));
            }, 1000);
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

          // Trigger visit status refresh - create visit if doesn't exist
          const retailerId = data.retailer_id;
          const userId = data.user_id;
          const plannedDate = data.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
          let effectiveVisitId = data.visit_id;
          
          // If no visit ID, try to find or create one
          if (!effectiveVisitId && retailerId && userId) {
            console.log('🔍 No visit ID found for order (old format), looking for existing visit...');
            const { data: existingVisit } = await supabase
              .from('visits')
              .select('id')
              .eq('retailer_id', retailerId)
              .eq('user_id', userId)
              .eq('planned_date', plannedDate)
              .maybeSingle();
            
            if (existingVisit) {
              effectiveVisitId = existingVisit.id;
              console.log('✅ Found existing visit:', effectiveVisitId);
            } else {
              // Create a new visit for this order
              console.log('📝 Creating new visit for synced order (old format)...');
              const { data: newVisit, error: createVisitError } = await supabase
                .from('visits')
                .insert({
                  retailer_id: retailerId,
                  user_id: userId,
                  planned_date: plannedDate,
                  status: 'productive',
                  check_out_time: new Date().toISOString(),
                  created_at: new Date().toISOString()
                })
                .select()
                .single();
              
              if (createVisitError) {
                console.error('❌ Error creating visit for order (old format):', createVisitError);
              } else {
                effectiveVisitId = newVisit.id;
                console.log('✅ Created new visit for order (old format):', effectiveVisitId);
                
                // Cache the new visit
                await offlineStorage.save(STORES.VISITS, newVisit);
              }
            }
          }
          
          // Update visit status to productive
          if (effectiveVisitId) {
            console.log('🔄 Updating visit status to productive after order sync (old format):', { visitId: effectiveVisitId });
            const { error: visitUpdateError } = await supabase
              .from('visits')
              .update({
                status: 'productive',
                no_order_reason: null,
                check_out_time: new Date().toISOString()
              })
              .eq('id', effectiveVisitId);
            
            if (visitUpdateError) {
              console.error('❌ Error updating visit status:', visitUpdateError);
            } else {
              console.log('✅ Visit status updated to productive');
            }
            
            console.log('✅ Order synced, dispatching visitStatusChanged event:', { 
              visitId: effectiveVisitId, 
              retailerId
            });
            
            window.dispatchEvent(new CustomEvent('visitStatusChanged', {
              detail: { visitId: effectiveVisitId, status: 'productive', retailerId }
            }));
            
            // ALSO dispatch visitDataChanged to trigger full page reload with increased delay
            setTimeout(() => {
              console.log('✅ Dispatching visitDataChanged for full page reload');
              window.dispatchEvent(new Event('visitDataChanged'));
            }, 1000);
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
        const { id: visitId, ...visitData } = data;
        const { error: visitError } = await supabase
          .from('visits')
          .insert(visitData);
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
        const { error: retailerError } = await supabase
          .from('retailers')
          .insert(data);
        if (retailerError) throw retailerError;
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
        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert(data);
        if (attendanceError) throw attendanceError;
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
      setTimeout(cleanupOldData, 10000);
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