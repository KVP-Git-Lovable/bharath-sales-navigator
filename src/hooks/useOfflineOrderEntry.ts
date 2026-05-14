import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { addOrderToSnapshot } from '@/lib/myVisitsSnapshot';
import { toast } from '@/hooks/use-toast';
import { getLocalTodayDate } from '@/utils/dateUtils';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: { name: string } | null;
  rate: number;
  unit: string;
  base_unit?: string;
  closing_stock: number;
  schemes?: any[];
  variants?: any[];
}

/**
 * PRODUCT DISPLAY FLOW - ESTABLISHED STANDARD
 * 
 * This hook manages the complete product lifecycle from Product Master to Order Entry.
 * 
 * ACTIVE PRODUCT RULES:
 * - Products/variants with is_active = true OR null/undefined → SHOWN
 * - Products/variants with is_active = false → HIDDEN
 * - When new products are added to Product Master with active status, they automatically appear
 * 
 * DISPLAY NAMING CONVENTION (SYSTEM-WIDE):
 * - Base products (no variants): Display product.name
 * - Base products (with variants): Display product.name + all active variants
 * - Product variants: Display ONLY variant.variant_name (NOT "product.name - variant.variant_name")
 * 
 * SYNC FLOW:
 * 1. Product added/updated in Product Master (is_active = true)
 * 2. syncProductsInBackground() fetches and caches to IndexedDB
 * 3. Order Entry loads from cache instantly
 * 4. TableOrderForm dropdown shows all active products + variants
 * 5. Van Stock Management shows same products
 * 
 * This ensures consistent product display across:
 * - Order Entry (grid and table modes)
 * - Van Stock Management
 * - Cart
 * - Invoices
 */
export function useOfflineOrderEntry() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false); // CRITICAL: Start with false - don't block UI
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Background sync function - defined before fetchProducts
  const syncProductsInBackground = async () => {
    try {
      // Fetch all products where is_active is true OR null (treat null as active)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name)
        `)
        .or('is_active.eq.true,is_active.is.null')
        .order('name');

      if (productsError) throw productsError;

      // Fetch all active schemes (is_active true or null)
      const { data: schemesData } = await supabase
        .from('product_schemes')
        .select('*')
        .or('is_active.eq.true,is_active.is.null');

      // Fetch all active variants (is_active true or null)
      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .or('is_active.eq.true,is_active.is.null');

      const enrichedProducts = (productsData || []).map((product: any) => ({
        ...product,
        schemes: (schemesData || []).filter((s: any) => s.product_id === product.id),
        variants: (variantsData || []).filter((v: any) => v.product_id === product.id)
      }));

      setProducts(enrichedProducts);
      setLoading(false);

      // Cache for offline use - do this in background
      offlineStorage.clear(STORES.PRODUCTS).then(() => {
        enrichedProducts.forEach(product => offlineStorage.save(STORES.PRODUCTS, product));
      });
      offlineStorage.clear(STORES.VARIANTS).then(() => {
        variantsData?.forEach(variant => offlineStorage.save(STORES.VARIANTS, variant));
      });
      offlineStorage.clear(STORES.SCHEMES).then(() => {
        schemesData?.forEach(scheme => offlineStorage.save(STORES.SCHEMES, scheme));
      });

      console.log(`✅ Synced ${enrichedProducts.length} products from network (background)`);
    } catch (error) {
      console.error('Background sync error:', error);
    }
  };

  // Fetch products with offline support - instant cache load, NO network blocking
  const fetchProducts = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('⏸️ Fetch already in progress, skipping...');
      return;
    }

    // Don't refetch if we already have products loaded
    if (hasFetchedRef.current) {
      console.log('✅ Products already loaded, skipping refetch');
      return;
    }

    isFetchingRef.current = true;
    
    // CRITICAL: Set loading false immediately - don't block UI
    // This ensures the page renders instantly even if cache operations take time
    setLoading(false);

    try {
      // 1. Load from cache INSTANTLY - no loading state blocking
      const cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
      const cachedVariants = await offlineStorage.getAll(STORES.VARIANTS);
      const cachedSchemes = await offlineStorage.getAll(STORES.SCHEMES);

      if (cachedProducts.length > 0) {
        // Filter only active products: is_active must be true or null/undefined (never false)
        const activeProducts = (cachedProducts || []).filter((p: any) => p.is_active !== false);
        const activeVariants = (cachedVariants || []).filter((v: any) => v.is_active !== false);
        const activeSchemes = (cachedSchemes || []).filter((s: any) => s.is_active !== false);
        
        const enrichedProducts = activeProducts.map((product: any) => ({
          ...product,
          variants: activeVariants.filter((v: any) => v.product_id === product.id),
          schemes: activeSchemes.filter((s: any) => s.product_id === product.id)
        }));
        setProducts(enrichedProducts);
        hasFetchedRef.current = true;
        console.log(`✅ Loaded ${enrichedProducts.length} active products from cache instantly`);
        
        // Background sync if online - DO NOT await, fire and forget
        if (isOnline) {
          // Use requestIdleCallback or setTimeout to not block main thread
          requestIdleCallback?.(() => {
            syncProductsInBackground().catch(err => 
              console.error('Background sync failed:', err)
            );
          }) || setTimeout(() => {
            syncProductsInBackground().catch(err => 
              console.error('Background sync failed:', err)
            );
          }, 100);
        }
      } else {
        // No cache - still don't block, fetch in background
        console.log('📦 No cached products, fetching from network in background...');
        
        // CRITICAL: Don't await - fetch in background without blocking
        if (isOnline) {
          syncProductsInBackground().then(() => {
            hasFetchedRef.current = true;
          }).catch(err => {
            console.error('Background sync failed:', err);
          });
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Try fallback to cache on error - non-blocking
      try {
        const cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
        const cachedVariants = await offlineStorage.getAll(STORES.VARIANTS);
        const cachedSchemes = await offlineStorage.getAll(STORES.SCHEMES);

        if (cachedProducts.length > 0) {
          const activeProducts = (cachedProducts || []).filter((p: any) => p.is_active !== false);
          const activeVariants = (cachedVariants || []).filter((v: any) => v.is_active !== false);
          const activeSchemes = (cachedSchemes || []).filter((s: any) => s.is_active !== false);
          
          const enrichedProducts = activeProducts.map((product: any) => ({
            ...product,
            variants: activeVariants.filter((v: any) => v.product_id === product.id),
            schemes: activeSchemes.filter((s: any) => s.product_id === product.id)
          }));
          setProducts(enrichedProducts);
          hasFetchedRef.current = true;
        }
      } catch (cacheError) {
        console.error('Cache fallback also failed:', cacheError);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isOnline]);

  // Submit order with offline support - optimized
  const submitOrder = async (orderData: any, orderItems: any[]) => {
    const localOrderDate = orderData.order_date || getLocalTodayDate();

    if (!isOnline) {
      // Offline: Queue for sync
      const orderId = crypto.randomUUID();
      const offlineOrder = {
        ...orderData,
        id: orderId,
        created_at: new Date().toISOString(),
        order_date: localOrderDate,
        status: orderData.status || 'confirmed',
        // CRITICAL: Round total_amount consistently to prevent cache/snapshot inconsistencies
        total_amount: Math.round(Number(orderData.total_amount ?? 0)),
      };

      const offlineItems = orderItems.map(item => ({
        ...item,
        order_id: orderId
      }));

      // Save to offline storage in parallel
      await Promise.all([
        offlineStorage.save(STORES.ORDERS, { ...offlineOrder, items: offlineItems }),
        offlineStorage.addToSyncQueue('CREATE_ORDER', {
          order: offlineOrder,
          items: offlineItems
        })
      ]);

      // Persist snapshot so My Visits "Today's Progress" updates even after navigation/app restart
      try {
        if (offlineOrder.user_id) {
          await addOrderToSnapshot(offlineOrder.user_id, localOrderDate, {
            id: offlineOrder.id,
            retailer_id: offlineOrder.retailer_id,
            user_id: offlineOrder.user_id,
            // Use the already-rounded total_amount from offlineOrder
            total_amount: offlineOrder.total_amount,
            order_date: localOrderDate,
            status: offlineOrder.status || 'confirmed',
            visit_id: offlineOrder.visit_id,
          });
        }
      } catch (e) {
        console.warn('[useOfflineOrderEntry] Could not update snapshot (offline):', e);
      }

      toast({
        title: "Order Saved Offline",
        description: "Your order will be synced when you're back online",
      });

      // Trigger data refresh for Today's Progress
      window.dispatchEvent(new CustomEvent('visitDataChanged', { detail: { date: localOrderDate } }));

      return { success: true, offline: true, order: offlineOrder };
    } else {
      // Online: Submit with optimized single transaction
      // CRITICAL: If online submission fails, fall back to offline queue to prevent data loss
      try {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({ ...orderData, order_date: localOrderDate, status: orderData.status || 'confirmed' })
          .select()
          .single();

        if (orderError) throw orderError;

        // Batch insert all items at once
        const itemsWithOrderId = orderItems.map(item => ({
          ...item,
          order_id: order.id
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId);

        if (itemsError) throw itemsError;

        // Persist locally so progress works immediately after navigation
        try {
          const roundedTotalAmount = Math.round(Number(order.total_amount ?? 0));
          const normalizedOrder = { ...order, items: orderItems, order_date: localOrderDate, status: order.status || 'confirmed', total_amount: roundedTotalAmount };
          await offlineStorage.save(STORES.ORDERS, normalizedOrder);
          if (normalizedOrder.user_id) {
            await addOrderToSnapshot(normalizedOrder.user_id, localOrderDate, {
              id: normalizedOrder.id,
              retailer_id: normalizedOrder.retailer_id,
              user_id: normalizedOrder.user_id,
              total_amount: roundedTotalAmount,
              order_date: localOrderDate,
              status: normalizedOrder.status || 'confirmed',
              visit_id: normalizedOrder.visit_id,
            });
          }
        } catch (e) {
          console.warn('[useOfflineOrderEntry] Could not persist online order locally (non-fatal):', e);
        }

        // Trigger data refresh for Today's Progress
        window.dispatchEvent(new CustomEvent('visitDataChanged', { detail: { date: localOrderDate } }));

        return { success: true, offline: false, order };
      } catch (onlineError: any) {
        // FALLBACK: Online submission failed — queue for offline sync to prevent data loss
        console.warn('[useOfflineOrderEntry] Online submission failed, falling back to offline queue:', onlineError.message);
        
        const orderId = crypto.randomUUID();
        const offlineOrder = {
          ...orderData,
          id: orderId,
          created_at: new Date().toISOString(),
          order_date: localOrderDate,
          status: orderData.status || 'confirmed',
          total_amount: Math.round(Number(orderData.total_amount ?? 0)),
        };

        const offlineItems = orderItems.map(item => ({
          ...item,
          order_id: orderId
        }));

        await Promise.all([
          offlineStorage.save(STORES.ORDERS, { ...offlineOrder, items: offlineItems }),
          offlineStorage.addToSyncQueue('CREATE_ORDER', {
            order: offlineOrder,
            items: offlineItems
          })
        ]);

        try {
          if (offlineOrder.user_id) {
            await addOrderToSnapshot(offlineOrder.user_id, localOrderDate, {
              id: offlineOrder.id,
              retailer_id: offlineOrder.retailer_id,
              user_id: offlineOrder.user_id,
              total_amount: offlineOrder.total_amount,
              order_date: localOrderDate,
              status: offlineOrder.status || 'confirmed',
              visit_id: offlineOrder.visit_id,
            });
          }
        } catch (e) {
          console.warn('[useOfflineOrderEntry] Could not update snapshot (fallback):', e);
        }

        toast({
          title: "Order Saved Locally",
          description: "Network issue detected. Your order will sync automatically when connection is stable.",
        });

        window.dispatchEvent(new CustomEvent('visitDataChanged', { detail: { date: localOrderDate } }));

        return { success: true, offline: true, order: offlineOrder };
      }
    }
  };

  return {
    products,
    loading,
    isOnline,
    fetchProducts,
    submitOrder
  };
}
