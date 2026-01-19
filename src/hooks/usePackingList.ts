import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { reserveStockForPackingList, releaseReservedStock, aggregateOrderItems } from '@/utils/inventoryReservation';

export interface PackingList {
  id: string;
  packing_list_number: string;
  delivery_date: string;
  distributor_id: string | null;
  created_by: string | null;
  status: 'draft' | 'packed' | 'dispatched' | 'completed';
  total_orders: number;
  total_items: number;
  total_value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackingListItem {
  id: string;
  packing_list_id: string;
  product_id: string;
  product_name: string;
  unit: string | null;
  ordered_qty: number;
  picked_qty: number;
  short_qty: number;
  batch_number: string | null;
  expiry_date: string | null;
}

export interface PackingListAssignment {
  id: string;
  packing_list_id: string;
  agent_id: string | null;
  van_id: string | null;
  beat_ids: string[] | null;
  territory_ids: string[] | null;
  order_count: number;
  total_load_qty: number;
  total_load_value: number;
  status: 'assigned' | 'in_transit' | 'completed';
  dispatched_at: string | null;
  completed_at: string | null;
}

export interface OrderForPacking {
  id: string;
  order_date: string;
  delivery_date?: string;
  delivery_status?: string;
  retailer_id: string;
  retailer_name?: string;
  beat_id?: string;
  beat_name?: string;
  territory_id?: string;
  total_amount: number;
  // Payment info for delivery agent
  is_credit_order?: boolean;
  payment_method?: string;
  credit_paid_amount?: number;
  credit_pending_amount?: number;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit?: string;
    price: number;
  }>;
}

export function usePackingList() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch packing lists with filters
  const fetchPackingLists = useCallback(async (filters?: {
    distributorId?: string;
    status?: string;
    deliveryDate?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('packing_lists')
        .select('*')
        .order('delivery_date', { ascending: false });

      // Handle distributor filtering: 'direct' means null distributor_id
      if (filters?.distributorId === 'direct') {
        query = query.is('distributor_id', null);
      } else if (filters?.distributorId) {
        query = query.eq('distributor_id', filters.distributorId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.deliveryDate) {
        query = query.eq('delivery_date', filters.deliveryDate);
      }
      if (filters?.dateFrom) {
        query = query.gte('delivery_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('delivery_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PackingList[];
    } catch (error) {
      console.error('Error fetching packing lists:', error);
      toast({
        title: "Error",
        description: "Failed to fetch packing lists",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch single packing list with items and assignments
  const fetchPackingListDetail = useCallback(async (packingListId: string) => {
    setLoading(true);
    try {
      const [packingListRes, itemsRes, assignmentsRes, ordersRes] = await Promise.all([
        supabase.from('packing_lists').select('*').eq('id', packingListId).single(),
        supabase.from('packing_list_items').select('*').eq('packing_list_id', packingListId),
        supabase.from('packing_list_assignments').select('*').eq('packing_list_id', packingListId),
        supabase.from('orders').select(`
          id, items, total_amount, delivery_status,
          retailers(id, name, beat_id, beat_name, territory_id)
        `).eq('packing_list_id', packingListId)
      ]);

      if (packingListRes.error) throw packingListRes.error;

      return {
        packingList: packingListRes.data as PackingList,
        items: (itemsRes.data || []) as PackingListItem[],
        assignments: (assignmentsRes.data || []) as PackingListAssignment[],
        orders: ordersRes.data || []
      };
    } catch (error) {
      console.error('Error fetching packing list detail:', error);
      toast({
        title: "Error",
        description: "Failed to fetch packing list details",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch orders available for packing (confirmed D-1 orders without packing list)
  const fetchOrdersForPacking = useCallback(async (filters: {
    distributorId?: string;
    orderDate?: string;
    dateFrom?: string;
    dateTo?: string;
    beatIds?: string[];
    territoryIds?: string[];
    deliveryStatus?: string;  // Filter by delivery_status
    deliveryDate?: string;    // Filter by delivery_date
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_date,
          retailer_id,
          total_amount,
          items,
          delivery_date,
          delivery_status,
          is_credit_order,
          payment_method,
          credit_paid_amount,
          credit_pending_amount,
          retailers(
            id,
            name,
            beat_id,
            beat_name,
            territory_id
          )
        `)
        .is('packing_list_id', null)
        .eq('status', 'confirmed')
        .order('order_date', { ascending: false });

      // D-1 Filter: Only show orders with delivery_status = 'in_packing_list'
      // This ensures only D-1 orders appear in packing list management
      if (filters.deliveryStatus) {
        query = query.eq('delivery_status', filters.deliveryStatus);
      } else {
        // Default: Only show D-1 orders ready for packing
        query = query.eq('delivery_status', 'in_packing_list');
      }

      if (filters.deliveryDate) {
        query = query.eq('delivery_date', filters.deliveryDate);
      }
      if (filters.orderDate) {
        query = query.eq('order_date', filters.orderDate);
      }
      if (filters.dateFrom) {
        query = query.gte('order_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('order_date', filters.dateTo);
      }
      if (filters.beatIds && filters.beatIds.length > 0) {
        query = query.in('retailers.beat_id', filters.beatIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include retailer info and payment status
      const ordersWithRetailer = (data || []).map((order: any) => ({
        id: order.id,
        order_date: order.order_date,
        delivery_date: order.delivery_date,
        delivery_status: order.delivery_status,
        retailer_id: order.retailer_id,
        retailer_name: order.retailers?.name || 'Unknown Retailer',
        beat_id: order.retailers?.beat_id,
        beat_name: order.retailers?.beat_name || 'No Beat',
        territory_id: order.retailers?.territory_id,
        total_amount: order.total_amount,
        // Payment info for delivery agent
        is_credit_order: order.is_credit_order,
        payment_method: order.payment_method,
        credit_paid_amount: order.credit_paid_amount,
        credit_pending_amount: order.credit_pending_amount,
        items: order.items || []
      }));

      return ordersWithRetailer as OrderForPacking[];
    } catch (error) {
      console.error('Error fetching orders for packing:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create packing list from selected orders
  const createPackingList = useCallback(async (
    deliveryDate: string,
    distributorId: string | null,
    orderIds: string[],
    orders: OrderForPacking[]
  ) => {
    setLoading(true);
    try {
      // Calculate totals
      const totalOrders = orderIds.length;
      const totalValue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const aggregatedItems = aggregateOrderItems(orders);
      const totalItems = aggregatedItems.reduce((sum, item) => sum + item.quantity, 0);

      // Create packing list
      const { data: packingList, error: createError } = await supabase
        .from('packing_lists')
        .insert({
          delivery_date: deliveryDate,
          distributor_id: distributorId,
          total_orders: totalOrders,
          total_items: totalItems,
          total_value: totalValue,
          status: 'draft'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create packing list items
      const itemsToInsert = aggregatedItems.map(item => ({
        packing_list_id: packingList.id,
        product_id: item.product_id,
        product_name: item.product_name,
        unit: item.unit,
        ordered_qty: item.quantity,
        picked_qty: 0,
        short_qty: 0
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('packing_list_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Update orders with packing list reference and delivery date
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          packing_list_id: packingList.id,
          delivery_date: deliveryDate,
          delivery_status: 'in_packing_list'
        })
        .in('id', orderIds);

      if (updateError) throw updateError;

      // Reserve stock only if distributor exists
      if (distributorId) {
        const reservationItems = aggregatedItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }));

        const reservationResult = await reserveStockForPackingList(
          distributorId,
          packingList.id,
          reservationItems
        );

        if (reservationResult.shortItems && reservationResult.shortItems.length > 0) {
          toast({
            title: "Warning",
            description: `${reservationResult.shortItems.length} items have insufficient stock`,
            variant: "destructive"
          });
        }
      }

      toast({
        title: "Success",
        description: `Packing list ${packingList.packing_list_number} created with ${totalOrders} orders`
      });

      return packingList as PackingList;
    } catch (error) {
      console.error('Error creating packing list:', error);
      toast({
        title: "Error",
        description: "Failed to create packing list",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Update packing list status
  const updatePackingListStatus = useCallback(async (
    packingListId: string,
    newStatus: 'draft' | 'packed' | 'dispatched' | 'completed'
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('packing_lists')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', packingListId);

      if (error) throw error;

      // Update related orders status
      let orderStatus = 'in_packing_list';
      if (newStatus === 'dispatched') orderStatus = 'dispatched';
      if (newStatus === 'completed') orderStatus = 'delivered';

      await supabase
        .from('orders')
        .update({ delivery_status: orderStatus })
        .eq('packing_list_id', packingListId);

      toast({
        title: "Success",
        description: `Packing list status updated to ${newStatus}`
      });

      return true;
    } catch (error) {
      console.error('Error updating packing list status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Update picked quantities
  const updatePickedQuantity = useCallback(async (
    itemId: string,
    pickedQty: number,
    shortQty: number
  ) => {
    try {
      const { error } = await supabase
        .from('packing_list_items')
        .update({
          picked_qty: pickedQty,
          short_qty: shortQty
        })
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating picked quantity:', error);
      return false;
    }
  }, []);

  // Assign agent/van to packing list
  const createAssignment = useCallback(async (
    packingListId: string,
    agentId: string,
    vanId: string | null,
    beatIds: string[],
    orderCount: number,
    totalLoadQty: number,
    totalLoadValue: number
  ) => {
    try {
      const { data, error } = await supabase
        .from('packing_list_assignments')
        .insert({
          packing_list_id: packingListId,
          agent_id: agentId,
          van_id: vanId,
          beat_ids: beatIds,
          order_count: orderCount,
          total_load_qty: totalLoadQty,
          total_load_value: totalLoadValue,
          status: 'assigned'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent assigned successfully"
      });

      return data as PackingListAssignment;
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to assign agent",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Delete packing list (only draft)
  const deletePackingList = useCallback(async (packingListId: string, distributorId: string | null) => {
    setLoading(true);
    try {
      // Get items for releasing stock
      const { data: items } = await supabase
        .from('packing_list_items')
        .select('product_id, ordered_qty')
        .eq('packing_list_id', packingListId);

      // Release reserved stock only if distributor exists
      if (distributorId && items && items.length > 0) {
        await releaseReservedStock(
          distributorId,
          packingListId,
          items.map(i => ({ product_id: i.product_id, quantity: i.ordered_qty }))
        );
      }

      // Clear packing list reference from orders
      await supabase
        .from('orders')
        .update({
          packing_list_id: null,
          delivery_date: null,
          delivery_status: 'pending'
        })
        .eq('packing_list_id', packingListId);

      // Delete packing list (cascade deletes items and assignments)
      const { error } = await supabase
        .from('packing_lists')
        .delete()
        .eq('id', packingListId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Packing list deleted"
      });

      return true;
    } catch (error) {
      console.error('Error deleting packing list:', error);
      toast({
        title: "Error",
        description: "Failed to delete packing list",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    fetchPackingLists,
    fetchPackingListDetail,
    fetchOrdersForPacking,
    createPackingList,
    updatePackingListStatus,
    updatePickedQuantity,
    createAssignment,
    deletePackingList
  };
}
