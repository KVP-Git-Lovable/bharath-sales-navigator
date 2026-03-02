import { useState, useEffect, useCallback } from 'react';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { useConnectivity } from './useConnectivity';
import { toast } from './use-toast';
import { visitStatusCache } from '@/lib/visitStatusCache';
import { getLocalTodayDate } from '@/utils/dateUtils';
import { markVisitDataChanged } from '@/lib/visitChangeMarker';

/**
 * Comprehensive offline order entry hook
 * Handles products, retailers, beats, competition data, and order submission offline
 */
export function useOfflineOrderComplete() {
  const connectivityStatus = useConnectivity();
  const isOnline = connectivityStatus === 'online';
  
  const [products, setProducts] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [competitionSkus, setCompetitionSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load all cached data on mount
   */
  const loadCachedData = useCallback(async () => {
    try {
      console.log('📦 Loading cached data for offline use...');
      
      const [
        cachedProducts,
        cachedVariants,
        cachedSchemes,
        cachedCategories,
        cachedRetailers,
        cachedBeats,
        cachedCompetitors,
        cachedCompetitionSkus
      ] = await Promise.all([
        offlineStorage.getAll(STORES.PRODUCTS),
        offlineStorage.getAll(STORES.VARIANTS),
        offlineStorage.getAll(STORES.SCHEMES),
        offlineStorage.getAll(STORES.CATEGORIES),
        offlineStorage.getAll(STORES.RETAILERS),
        offlineStorage.getAll(STORES.BEATS),
        offlineStorage.getAll(STORES.COMPETITION_MASTER),
        offlineStorage.getAll(STORES.COMPETITION_SKUS)
      ]);

      // Enrich products with their variants and schemes
      const enrichedProducts = (cachedProducts || []).map((product: any) => ({
        ...product,
        variants: (cachedVariants || []).filter((v: any) => v.product_id === product.id),
        schemes: (cachedSchemes || []).filter((s: any) => s.product_id === product.id),
        category: (cachedCategories || []).find((c: any) => c.id === product.category_id)
      }));

      setProducts(enrichedProducts);
      setRetailers(cachedRetailers || []);
      setBeats(cachedBeats || []);
      setCompetitors(cachedCompetitors || []);
      setCompetitionSkus(cachedCompetitionSkus || []);

      console.log('✅ Cached data loaded:', {
        products: enrichedProducts.length,
        retailers: (cachedRetailers || []).length,
        beats: (cachedBeats || []).length,
        competitors: (cachedCompetitors || []).length,
        competitionSkus: (cachedCompetitionSkus || []).length
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading cached data:', error);
      setLoading(false);
    }
  }, []);

  /**
   * Sync data from server when online
   */
  const syncFromServer = useCallback(async () => {
    if (!isOnline) return;

    try {
      console.log('🔄 Syncing data from server...');

      // Fetch products with related data
      const { data: productsData } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(*)
        `)
        .eq('is_active', true);

      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('is_active', true);

      const { data: schemesData } = await supabase
        .from('product_schemes')
        .select('*')
        .eq('is_active', true);

      const { data: categoriesData } = await supabase
        .from('product_categories')
        .select('*');

      const { data: retailersData } = await supabase
        .from('retailers')
        .select('*');

      const { data: beatsData } = await supabase
        .from('beats')
        .select('*')
        .eq('is_active', true);

      const { data: competitorsData } = await supabase
        .from('competition_master')
        .select('*');

      const { data: competitionSkusData } = await supabase
        .from('competition_skus')
        .select('*')
        .eq('is_active', true);

      // Cache everything to IndexedDB
      if (productsData) {
        for (const product of productsData) {
          await offlineStorage.save(STORES.PRODUCTS, product);
        }
      }

      if (variantsData) {
        for (const variant of variantsData) {
          await offlineStorage.save(STORES.VARIANTS, variant);
        }
      }

      if (schemesData) {
        for (const scheme of schemesData) {
          await offlineStorage.save(STORES.SCHEMES, scheme);
        }
      }

      if (categoriesData) {
        for (const category of categoriesData) {
          await offlineStorage.save(STORES.CATEGORIES, category);
        }
      }

      if (retailersData) {
        for (const retailer of retailersData) {
          await offlineStorage.save(STORES.RETAILERS, retailer);
        }
      }

      if (beatsData) {
        for (const beat of beatsData) {
          await offlineStorage.save(STORES.BEATS, beat);
        }
      }

      if (competitorsData) {
        for (const competitor of competitorsData) {
          await offlineStorage.save(STORES.COMPETITION_MASTER, competitor);
        }
      }

      if (competitionSkusData) {
        for (const sku of competitionSkusData) {
          await offlineStorage.save(STORES.COMPETITION_SKUS, sku);
        }
      }

      // Reload cached data to update UI
      await loadCachedData();

      console.log('✅ Data synced successfully');
    } catch (error) {
      console.error('Error syncing from server:', error);
    }
  }, [isOnline, loadCachedData]);

  /**
   * Submit order with offline support
   */
  const submitOrder = useCallback(async (orderData: any, orderItems: any[]) => {
    try {
      // CRITICAL: Update visit status cache IMMEDIATELY for instant UI feedback
      // This ensures the VisitCard shows "Productive" right away, even on slow internet
      const orderDate = orderData.order_date || getLocalTodayDate();
      const orderValue = orderData.total_amount || orderItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      
      if (orderData.retailer_id && orderData.user_id) {
        console.log('⚡ [ORDER] Immediate cache update for instant UI feedback');
        await visitStatusCache.set(
          orderData.visit_id || crypto.randomUUID(),
          orderData.retailer_id,
          orderData.user_id,
          orderDate,
          'productive',
          orderValue
        );
      }

      if (isOnline) {
        // Online: Submit directly to Supabase
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (orderError) throw orderError;

        const itemsWithOrderId = orderItems.map(item => ({
          ...item,
          order_id: order.id
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId);

        if (itemsError) throw itemsError;

        // Database trigger automatically updates visit status to 'productive'
        // when order is inserted - no manual update needed
        console.log('✅ Order inserted, database trigger will auto-update visit status');

        toast({
          title: "Order Submitted",
          description: "Your order has been submitted successfully.",
        });

        // Dispatch events AFTER database update completes
        console.log('✅ Order submitted online, dispatching events with orderValue:', orderData.total_amount);
        window.dispatchEvent(new CustomEvent('visitStatusChanged', {
          detail: { 
            visitId: orderData.visit_id, 
            status: 'productive', 
            retailerId: orderData.retailer_id,
            orderValue: orderData.total_amount  // Include order value for immediate UI update
          }
        }));
        window.dispatchEvent(new CustomEvent('visitDataChanged', { detail: { date: orderDate } }));
        
        // Mark data changed for cross-page state sync
        markVisitDataChanged(orderDate);

        // Add delay before returning to allow events to be processed
        await new Promise(resolve => setTimeout(resolve, 300));

        return { success: true, offline: false, order };
      } else {
        // Offline: Queue for sync
        const orderId = crypto.randomUUID();
        const offlineOrder = {
          ...orderData,
          id: orderId,
          created_at: new Date().toISOString(),
          order_date: new Date().toISOString().split('T')[0]
        };

        const offlineItems = orderItems.map(item => ({
          ...item,
          id: crypto.randomUUID(),
          order_id: orderId
        }));

        // Save to offline storage
        await offlineStorage.save(STORES.ORDERS, { 
          ...offlineOrder, 
          items: offlineItems 
        });

        // Update visit status in offline cache to 'productive'
        if (orderData.visit_id) {
          console.log('🔄 Updating visit in offline cache for visit:', orderData.visit_id);
          const cachedVisits = await offlineStorage.getAll<any>(STORES.VISITS);
          const visitToUpdate = cachedVisits.find((v: any) => v.id === orderData.visit_id);
          
          if (visitToUpdate) {
            const updatedVisit = { 
              ...visitToUpdate, 
              status: 'productive',
              check_out_time: new Date().toISOString()
            };
            await offlineStorage.save(STORES.VISITS, updatedVisit);
            console.log('✅ Visit status updated in offline cache');
          } else {
            console.warn('⚠️ Visit not found in cache:', orderData.visit_id);
          }
        } else {
          console.warn('⚠️ No visit_id in orderData for offline order');
        }

        // Queue for sync
        await offlineStorage.addToSyncQueue('CREATE_ORDER', {
          order: offlineOrder,
          items: offlineItems,
          visitId: orderData.visit_id // Include visitId for visit status update during sync
        });

        toast({
          title: "Order Saved Offline",
          description: "Your order will be submitted when you're back online.",
          variant: "default",
        });

        // Dispatch events for immediate UI update
        console.log('✅ Order saved offline, dispatching events with orderValue:', orderData.total_amount);
        window.dispatchEvent(new CustomEvent('visitStatusChanged', {
          detail: { 
            visitId: orderData.visit_id, 
            status: 'productive', 
            retailerId: orderData.retailer_id,
            orderValue: orderData.total_amount  // Include order value for immediate UI update
          }
        }));
        window.dispatchEvent(new CustomEvent('visitDataChanged', { detail: { date: orderDate } }));
        
        // Mark data changed for cross-page state sync
        markVisitDataChanged(orderDate);

        // Add delay before returning to allow events to be processed
        await new Promise(resolve => setTimeout(resolve, 300));

        return { success: true, offline: true, order: offlineOrder };
      }
    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast({
        title: "Order Submission Failed",
        description: error.message || "Failed to submit order",
        variant: "destructive",
      });
      return { success: false, offline: false, order: null };
    }
  }, [isOnline]);

  /**
   * Save competition data with offline support
   */
  const saveCompetitionData = useCallback(async (competitionData: any) => {
    try {
      if (isOnline) {
        // Online: Submit directly
        const { data, error } = await supabase
          .from('competition_data')
          .insert(competitionData)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Competition Data Saved",
          description: "Competition data has been saved successfully.",
        });

        return { success: true, offline: false, data };
      } else {
        // Offline: Queue for sync
        const offlineData = {
          ...competitionData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        };

        await offlineStorage.save(STORES.COMPETITION_DATA, offlineData);
        await offlineStorage.addToSyncQueue('CREATE_COMPETITION_DATA', offlineData);

        toast({
          title: "Competition Data Saved Offline",
          description: "Data will be synced when you're back online.",
        });

        return { success: true, offline: true, data: offlineData };
      }
    } catch (error: any) {
      console.error('Error saving competition data:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save competition data",
        variant: "destructive",
      });
      return { success: false, offline: false, data: null };
    }
  }, [isOnline]);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  // Sync from server when coming online
  useEffect(() => {
    if (isOnline) {
      syncFromServer();
    }
  }, [isOnline, syncFromServer]);

  return {
    products,
    retailers,
    beats,
    competitors,
    competitionSkus,
    loading,
    isOnline,
    submitOrder,
    saveCompetitionData,
    syncFromServer,
    loadCachedData
  };
}
