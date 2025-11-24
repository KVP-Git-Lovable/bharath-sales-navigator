import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';

/**
 * Submit an order with offline support
 * @param orderData - The order data to insert
 * @param orderItems - The order items to insert
 * @param options - Additional options
 * @returns Result with success status and order data
 */
export async function submitOrderWithOfflineSupport(
  orderData: any,
  orderItems: any[],
  options: { 
    onOffline?: () => void;
    onOnline?: () => void;
    connectivityStatus?: 'online' | 'offline' | 'unknown';
  } = {}
) {
  // Treat 'unknown' as online (assume online until proven offline)
  const isOnline = options.connectivityStatus !== 'offline';
  
  if (!isOnline) {
    // Offline: Queue for sync
    console.log('📵 OFFLINE: Queueing order for sync...');
    const orderId = crypto.randomUUID();
    const offlineOrder = {
      ...orderData,
      id: orderId,
      created_at: new Date().toISOString(),
      order_date: new Date().toISOString().split('T')[0]
    };

    const offlineItems = orderItems.map(item => ({
      ...item,
      order_id: orderId
    }));

    // Save to offline storage
    await offlineStorage.save(STORES.ORDERS, { ...offlineOrder, items: offlineItems });
    console.log('✅ Order saved to IndexedDB:', orderId);
    
    // Queue for sync
    await offlineStorage.addToSyncQueue('CREATE_ORDER', {
      order: offlineOrder,
      items: offlineItems
    });
    console.log('✅ Order added to sync queue');

    options.onOffline?.();

    return { 
      success: true, 
      offline: true, 
      order: offlineOrder 
    };
  } else {
    // Online: Submit directly
    console.log('🌐 ONLINE: Submitting order to server...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;
    console.log('✅ Order inserted to database:', order.id);

    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);

    if (itemsError) throw itemsError;

    options.onOnline?.();

    return { 
      success: true, 
      offline: false, 
      order 
    };
  }
}

/**
 * Fetch products with offline caching support
 * @returns Products data from online or cache
 */
export async function fetchProductsWithOfflineSupport() {
  const isOnline = navigator.onLine;
  
  if (isOnline) {
    // Online: Fetch from Supabase and cache
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        category:product_categories(name)
      `)
      .eq('is_active', true)
      .order('name');

    if (productsError) throw productsError;

    // Fetch schemes
    const { data: schemesData } = await supabase
      .from('product_schemes')
      .select('*')
      .eq('is_active', true);

    // Fetch variants
    const { data: variantsData } = await supabase
      .from('product_variants')
      .select('*')
      .eq('is_active', true);

    // Enrich products
    const enrichedProducts = (productsData || []).map((product: any) => ({
      ...product,
      schemes: (schemesData || []).filter((s: any) => s.product_id === product.id),
      variants: (variantsData || []).filter((v: any) => v.product_id === product.id)
    }));

    // Cache for offline use
    for (const product of enrichedProducts) {
      await offlineStorage.save(STORES.PRODUCTS, product);
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

    return {
      products: enrichedProducts,
      fromCache: false
    };
  } else {
    // Offline: Load from cache
    const cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
    const cachedVariants = await offlineStorage.getAll(STORES.VARIANTS);
    const cachedSchemes = await offlineStorage.getAll(STORES.SCHEMES);

    // Filter only active products and their active variants/schemes
    const activeProducts = (cachedProducts || []).filter((p: any) => p.is_active === true);
    const activeVariants = (cachedVariants || []).filter((v: any) => v.is_active === true);
    const activeSchemes = (cachedSchemes || []).filter((s: any) => s.is_active === true);

    const enrichedProducts = activeProducts.map((product: any) => ({
      ...product,
      variants: activeVariants.filter((v: any) => v.product_id === product.id),
      schemes: activeSchemes.filter((s: any) => s.product_id === product.id)
    }));

    return {
      products: enrichedProducts,
      fromCache: true
    };
  }
}
