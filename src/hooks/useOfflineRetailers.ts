import { useState, useCallback } from 'react';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { useConnectivity } from './useConnectivity';
import { toast } from './use-toast';
import { isSlowConnection } from '@/utils/internetSpeedCheck';

/**
 * Hook for managing retailers with offline support
 * Uses LOCAL-FIRST pattern for instant UI response on slow connections
 */
export function useOfflineRetailers() {
  const connectivityStatus = useConnectivity();
  const isOnline = connectivityStatus === 'online';
  const [loading, setLoading] = useState(false);

  /**
   * Create retailer with LOCAL-FIRST pattern
   * Saves locally immediately, syncs in background
   */
  const createRetailer = useCallback(async (retailerData: any) => {
    try {
      setLoading(true);
      const slowConnection = isSlowConnection();

      // STEP 1: ALWAYS create local retailer first for instant response
      const retailerId = crypto.randomUUID();
      const localRetailer = {
        ...retailerData,
        id: retailerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to local cache immediately
      await offlineStorage.save(STORES.RETAILERS, localRetailer);

      // Dispatch retailerAdded event immediately for instant UI update
      window.dispatchEvent(new CustomEvent('retailerAdded', { 
        detail: { retailer: localRetailer } 
      }));

      // Show instant success feedback
      toast({
        title: "Retailer Saved",
        description: slowConnection || !isOnline ? "Will sync when online" : "Syncing...",
      });

      setLoading(false);

      // STEP 2: If offline or slow, queue for sync and return immediately
      if (!isOnline || slowConnection) {
        await offlineStorage.addToSyncQueue('CREATE_RETAILER', localRetailer);
        console.log('📴 Retailer queued for sync (offline/slow):', retailerId);
        return { success: true, offline: true, data: localRetailer };
      }

      // STEP 3: Online with good connection - sync in background (non-blocking)
      setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('retailers')
            .insert({ ...retailerData, id: retailerId })
            .select()
            .single();

          if (error) {
            console.warn('Background sync failed, queuing:', error.message);
            await offlineStorage.addToSyncQueue('CREATE_RETAILER', localRetailer);
          } else {
            // Update cache with server response
            await offlineStorage.save(STORES.RETAILERS, data);
            console.log('✅ Retailer synced successfully:', retailerId);
          }
        } catch (syncError) {
          console.warn('Background sync error:', syncError);
          await offlineStorage.addToSyncQueue('CREATE_RETAILER', localRetailer);
        }
      }, 0);

      return { success: true, offline: false, data: localRetailer };
    } catch (error: any) {
      console.error('Error creating retailer:', error);
      toast({
        title: "Failed to Save Retailer",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setLoading(false);
      return { success: false, offline: false, data: null };
    }
  }, [isOnline]);

  /**
   * Update retailer with LOCAL-FIRST pattern
   * Updates locally immediately, syncs in background
   */
  const updateRetailer = useCallback(async (retailerId: string, updates: any) => {
    try {
      setLoading(true);
      const slowConnection = isSlowConnection();

      // STEP 1: Get current cached retailer
      const cachedRetailer = await offlineStorage.getById(STORES.RETAILERS, retailerId);
      
      if (!cachedRetailer) {
        throw new Error('Retailer not found');
      }
      
      // STEP 2: Update local cache immediately
      const updatedRetailer = {
        ...(cachedRetailer as any),
        ...updates,
        updated_at: new Date().toISOString()
      };

      await offlineStorage.save(STORES.RETAILERS, updatedRetailer);

      // Show instant success
      toast({
        title: "Retailer Updated",
        description: slowConnection || !isOnline ? "Will sync when online" : "Syncing...",
      });

      setLoading(false);

      // STEP 3: If offline or slow, queue for sync
      if (!isOnline || slowConnection) {
        await offlineStorage.addToSyncQueue('UPDATE_RETAILER', {
          id: retailerId,
          updates: { ...updates, updated_at: new Date().toISOString() }
        });
        return { success: true, offline: true, data: updatedRetailer };
      }

      // STEP 4: Sync in background (non-blocking)
      setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('retailers')
            .update(updates)
            .eq('id', retailerId)
            .select()
            .single();

          if (error) {
            console.warn('Background update sync failed:', error.message);
            await offlineStorage.addToSyncQueue('UPDATE_RETAILER', {
              id: retailerId,
              updates: { ...updates, updated_at: new Date().toISOString() }
            });
          } else {
            await offlineStorage.save(STORES.RETAILERS, data);
            console.log('✅ Retailer update synced:', retailerId);
          }
        } catch (syncError) {
          console.warn('Background update error:', syncError);
          await offlineStorage.addToSyncQueue('UPDATE_RETAILER', {
            id: retailerId,
            updates: { ...updates, updated_at: new Date().toISOString() }
          });
        }
      }, 0);

      return { success: true, offline: false, data: updatedRetailer };
    } catch (error: any) {
      console.error('Error updating retailer:', error);
      toast({
        title: "Failed to Update Retailer",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setLoading(false);
      return { success: false, offline: false, data: null };
    }
  }, [isOnline]);

  /**
   * Get all retailers (from cache or server)
   */
  const getAllRetailers = useCallback(async () => {
    try {
      setLoading(true);

      if (isOnline) {
        // Online: Fetch from server and cache
        const { data, error } = await supabase
          .from('retailers')
          .select('*')
          .order('name');

        if (error) throw error;

        // Update cache (single merge write)
        if (data) {
          await offlineStorage.mergeData(STORES.RETAILERS, data as any);
        }

        return { success: true, data: data || [] };
      } else {
        // Offline: Load from cache
        const cachedRetailers = await offlineStorage.getAll(STORES.RETAILERS);
        return { success: true, data: cachedRetailers || [] };
      }
    } catch (error: any) {
      console.error('Error fetching retailers:', error);
      
      // Try cache on error
      const cachedRetailers = await offlineStorage.getAll(STORES.RETAILERS);
      return { success: true, data: cachedRetailers || [] };
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  /**
   * Get retailer by ID (from cache or server)
   */
  const getRetailerById = useCallback(async (retailerId: string) => {
    try {
      if (isOnline) {
        // Online: Fetch from server
        const { data, error } = await supabase
          .from('retailers')
          .select('*')
          .eq('id', retailerId)
          .single();

        if (error) throw error;

        // Update cache
        if (data) {
          await offlineStorage.save(STORES.RETAILERS, data);
        }

        return { success: true, data };
      } else {
        // Offline: Load from cache
        const cachedRetailer = await offlineStorage.getById(STORES.RETAILERS, retailerId);
        return { success: true, data: cachedRetailer };
      }
    } catch (error: any) {
      console.error('Error fetching retailer:', error);
      
      // Try cache on error
      const cachedRetailer = await offlineStorage.getById(STORES.RETAILERS, retailerId);
      return { success: true, data: cachedRetailer };
    }
  }, [isOnline]);

  /**
   * Delete retailer with offline support
   */
  const deleteRetailer = useCallback(async (retailerId: string) => {
    try {
      setLoading(true);

      if (isOnline) {
        // Online: Delete directly
        const { error } = await supabase
          .from('retailers')
          .delete()
          .eq('id', retailerId);

        if (error) throw error;

        // Remove from cache
        await offlineStorage.delete(STORES.RETAILERS, retailerId);

        toast({
          title: "Retailer Deleted",
          description: "Retailer has been deleted successfully.",
        });

        return { success: true, offline: false };
      } else {
        // Offline: Queue for sync
        await offlineStorage.delete(STORES.RETAILERS, retailerId);
        await offlineStorage.addToSyncQueue('DELETE_RETAILER', { id: retailerId });

        toast({
          title: "Retailer Deletion Queued",
          description: "Retailer will be deleted when you're back online.",
        });

        return { success: true, offline: true };
      }
    } catch (error: any) {
      console.error('Error deleting retailer:', error);
      toast({
        title: "Failed to Delete Retailer",
        description: error.message || "Failed to delete retailer",
        variant: "destructive",
      });
      return { success: false, offline: false };
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  return {
    createRetailer,
    updateRetailer,
    deleteRetailer,
    getAllRetailers,
    getRetailerById,
    loading,
    isOnline
  };
}
