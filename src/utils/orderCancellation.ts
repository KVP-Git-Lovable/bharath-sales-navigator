import { supabase } from "@/integrations/supabase/client";
import { visitStatusCache } from "@/lib/visitStatusCache";
import { removeOrderFromSnapshot } from "@/lib/myVisitsSnapshot";

/**
 * Order Cancellation Utility
 * 
 * Handles complete reversal of an order including:
 * - Order and invoice status updates
 * - Visit status reversion
 * - Credit amount reversals
 * - Gamification points removal
 * - Retailer analytics updates
 */

export interface CancelOrderResult {
  success: boolean;
  error?: string;
  reversedData: {
    visitReverted: boolean;
    creditReversed: number;
    pointsRemoved: number;
    invoiceCancelled: boolean;
    loyaltyPointsRemoved: number;
  };
}

export interface OrderDetails {
  id: string;
  user_id: string;
  retailer_id: string;
  visit_id: string | null;
  order_date: string;
  created_at: string;
  total_amount: number;
  is_credit_order: boolean;
  credit_pending_amount: number;
  credit_paid_amount: number;
  status: string;
  delivery_status: string | null;
}

/**
 * Fetch order with all related data needed for cancellation
 */
async function fetchOrderWithDetails(orderId: string): Promise<OrderDetails | null> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, retailer_id, visit_id, order_date, created_at, total_amount, is_credit_order, credit_pending_amount, credit_paid_amount, status, delivery_status')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    console.error('[CancelOrder] Failed to fetch order:', error);
    return null;
  }

  return order;
}

/**
 * Validate that order can be cancelled
 */
function validateCancellable(order: OrderDetails): { valid: boolean; reason?: string } {
  if (order.status === 'cancelled') {
    return { valid: false, reason: 'Order is already cancelled' };
  }

  if (order.status === 'delivered' || order.delivery_status === 'delivered') {
    return { valid: false, reason: 'Cannot cancel a delivered order. Please use the return process instead.' };
  }

  if (order.status !== 'confirmed' && order.status !== 'pending') {
    return { valid: false, reason: `Cannot cancel order with status: ${order.status}` };
  }

  return { valid: true };
}

/**
 * Update order status to cancelled
 */
async function updateOrderStatus(
  orderId: string,
  reason: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      cancelled_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    console.error('[CancelOrder] Failed to update order status:', error);
    return false;
  }

  return true;
}

/**
 * Update invoice status to cancelled
 */
async function updateInvoiceStatus(orderId: string): Promise<boolean> {
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('order_id', orderId);

  if (error) {
    console.error('[CancelOrder] Failed to update invoice status:', error);
    return false;
  }

  return true;
}

/**
 * Check if a visit has remaining confirmed orders (excluding the one being cancelled)
 */
async function hasRemainingConfirmedOrders(visitId: string, excludeOrderId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('visit_id', visitId)
    .neq('id', excludeOrderId)
    .eq('status', 'confirmed');

  if (error) {
    console.error('[CancelOrder] Failed to check remaining orders:', error);
    return true; // err on the side of caution — don't revert
  }

  return (count || 0) > 0;
}

/**
 * Revert visit status from productive to planned (only if no remaining confirmed orders)
 */
async function revertVisitStatus(visitId: string, excludeOrderId: string): Promise<boolean> {
  const hasRemaining = await hasRemainingConfirmedOrders(visitId, excludeOrderId);
  if (hasRemaining) {
    console.log('[CancelOrder] Visit still has confirmed orders, keeping productive');
    return false;
  }

  const { error } = await supabase
    .from('visits')
    .update({
      status: 'planned',
      no_order_reason: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', visitId)
    .eq('status', 'productive');

  if (error) {
    console.error('[CancelOrder] Failed to revert visit status:', error);
    return false;
  }

  return true;
}

/**
 * Reverse retailer credit amount
 */
async function reverseRetailerCredit(
  retailerId: string,
  creditPendingAmount: number
): Promise<boolean> {
  // Get current retailer data
  const { data: retailer, error: fetchError } = await supabase
    .from('retailers')
    .select('pending_amount')
    .eq('id', retailerId)
    .single();

  if (fetchError || !retailer) {
    console.error('[CancelOrder] Failed to fetch retailer:', fetchError);
    return false;
  }

  const currentPending = Number(retailer.pending_amount) || 0;
  const newPending = Math.max(0, currentPending - creditPendingAmount);

  const { error } = await supabase
    .from('retailers')
    .update({
      pending_amount: newPending,
      updated_at: new Date().toISOString()
    })
    .eq('id', retailerId);

  if (error) {
    console.error('[CancelOrder] Failed to reverse retailer credit:', error);
    return false;
  }

  console.log(`[CancelOrder] Reversed credit: ${creditPendingAmount} (${currentPending} -> ${newPending})`);
  return true;
}

/**
 * Recalculate retailer's last order date and value
 */
async function recalculateRetailerLastOrder(retailerId: string): Promise<void> {
  // Find the most recent confirmed order (excluding cancelled ones)
  const { data: lastOrder, error } = await supabase
    .from('orders')
    .select('order_date, total_amount')
    .eq('retailer_id', retailerId)
    .eq('status', 'confirmed')
    .order('order_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[CancelOrder] Failed to find last order:', error);
    return;
  }

  // Update retailer with new last order data (or null if no orders remain)
  const { error: updateError } = await supabase
    .from('retailers')
    .update({
      last_order_date: lastOrder?.order_date || null,
      last_order_value: lastOrder?.total_amount || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', retailerId);

  if (updateError) {
    console.error('[CancelOrder] Failed to update retailer last order:', updateError);
  }
}

/**
 * Remove gamification points earned for this order
 */
async function removeGamificationPoints(
  retailerId: string,
  orderDate: string,
  userId: string
): Promise<number> {
  // Find and delete ALL points for this retailer on this date (both 'order' and 'visit' reference_types)
  const { data: points, error: fetchError } = await supabase
    .from('gamification_points')
    .select('id, points')
    .eq('user_id', userId)
    .eq('reference_id', retailerId)
    .gte('earned_at', `${orderDate}T00:00:00`)
    .lt('earned_at', `${orderDate}T23:59:59`);

  if (fetchError || !points || points.length === 0) {
    return 0;
  }

  const totalPoints = points.reduce((sum, p) => sum + p.points, 0);
  const pointIds = points.map(p => p.id);

  const { error: deleteError } = await supabase
    .from('gamification_points')
    .delete()
    .in('id', pointIds);

  if (deleteError) {
    console.error('[CancelOrder] Failed to delete gamification points:', deleteError);
    return 0;
  }

  console.log(`[CancelOrder] Removed ${totalPoints} gamification points (order + visit types)`);
  return totalPoints;
}

/**
 * Reverse retailer consecutive order sequence tracking
 */
async function reverseRetailerSequence(
  userId: string,
  retailerId: string
): Promise<void> {
  const { data: seq, error: fetchError } = await supabase
    .from('gamification_retailer_sequences')
    .select('id, consecutive_orders')
    .eq('user_id', userId)
    .eq('retailer_id', retailerId)
    .maybeSingle();

  if (fetchError || !seq) return;

  if ((seq.consecutive_orders || 0) <= 1) {
    await supabase.from('gamification_retailer_sequences').delete().eq('id', seq.id);
    console.log('[CancelOrder] Deleted retailer sequence record');
  } else {
    await supabase
      .from('gamification_retailer_sequences')
      .update({ consecutive_orders: seq.consecutive_orders - 1 })
      .eq('id', seq.id);
    console.log(`[CancelOrder] Decremented retailer sequence to ${seq.consecutive_orders - 1}`);
  }
}

/**
 * Reverse daily tracking counts for gamification
 */
async function reverseDailyTracking(
  userId: string,
  orderDate: string
): Promise<void> {
  const { data: tracks, error: fetchError } = await supabase
    .from('gamification_daily_tracking')
    .select('id, count, action_id')
    .eq('user_id', userId)
    .eq('tracking_date', orderDate);

  if (fetchError || !tracks || tracks.length === 0) return;

  for (const track of tracks) {
    if ((track.count || 0) <= 1) {
      await supabase.from('gamification_daily_tracking').delete().eq('id', track.id);
    } else {
      await supabase
        .from('gamification_daily_tracking')
        .update({ count: track.count - 1 })
        .eq('id', track.id);
    }
  }
  console.log(`[CancelOrder] Reversed ${tracks.length} daily tracking records`);
}

/**
 * Remove loyalty points earned for this order
 * retailer_loyalty_points uses reference_id to link to orders
 */
async function removeLoyaltyPoints(orderId: string): Promise<number> {
  const { data: points, error: fetchError } = await supabase
    .from('retailer_loyalty_points')
    .select('id, points')
    .eq('reference_type', 'order')
    .eq('reference_id', orderId);

  if (fetchError || !points || points.length === 0) {
    return 0;
  }

  const totalPoints = points.reduce((sum, p) => sum + Number(p.points || 0), 0);
  const pointIds = points.map(p => p.id);

  const { error: deleteError } = await supabase
    .from('retailer_loyalty_points')
    .delete()
    .in('id', pointIds);

  if (deleteError) {
    console.error('[CancelOrder] Failed to delete loyalty points:', deleteError);
    return 0;
  }

  console.log(`[CancelOrder] Removed ${totalPoints} loyalty points`);
  return totalPoints;
}

/**
 * Clear local caches to reflect the cancellation
 */
async function clearLocalCaches(
  retailerId: string,
  userId: string,
  orderDate: string,
  orderId: string,
  visitReverted: boolean
): Promise<void> {
  // Invalidate visit status cache
  await visitStatusCache.invalidate(retailerId, userId, orderDate);
  
  // Remove order from snapshot
  await removeOrderFromSnapshot(userId, orderDate, orderId);
  
  // Dispatch event for UI updates
  window.dispatchEvent(new CustomEvent('orderCancelled', {
    detail: { retailerId, orderId, orderDate }
  }));
  
  // Dispatch visitStatusChanged for visit card updates
  window.dispatchEvent(new CustomEvent('visitStatusChanged', {
    detail: { 
      retailerId, 
      status: visitReverted ? 'planned' : 'productive',
      orderValue: 0 
    }
  }));

  // Dispatch pointsEarned so gamification UI (breakdown, leaderboard) refreshes instantly
  window.dispatchEvent(new CustomEvent('pointsEarned', {
    detail: { source: 'orderCancellation', retailerId, orderId }
  }));

  // Dispatch a global data refresh event so all tabs/views pick up the latest data
  window.dispatchEvent(new CustomEvent('globalDataRefresh', {
    detail: { source: 'orderCancellation', retailerId, orderId, orderDate }
  }));
}

/**
 * Main cancel order function
 * Orchestrates all cancellation steps
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  cancelledByUserId: string
): Promise<CancelOrderResult> {
  console.log('[CancelOrder] Starting cancellation for order:', orderId);

  const result: CancelOrderResult = {
    success: false,
    reversedData: {
      visitReverted: false,
      creditReversed: 0,
      pointsRemoved: 0,
      invoiceCancelled: false,
      loyaltyPointsRemoved: 0
    }
  };

  try {
    // 1. Fetch order with details
    const order = await fetchOrderWithDetails(orderId);
    if (!order) {
      result.error = 'Order not found';
      return result;
    }

    // 2. Validate cancellable
    const validation = validateCancellable(order);
    if (!validation.valid) {
      result.error = validation.reason;
      return result;
    }

    // 3. Update order status to cancelled
    const orderUpdated = await updateOrderStatus(orderId, reason, cancelledByUserId);
    if (!orderUpdated) {
      result.error = 'Failed to update order status';
      return result;
    }

    // 4. Update invoice status
    const invoiceUpdated = await updateInvoiceStatus(orderId);
    result.reversedData.invoiceCancelled = invoiceUpdated;

    // 5. Revert visit status if visit exists
    if (order.visit_id) {
      const visitReverted = await revertVisitStatus(order.visit_id, orderId);
      result.reversedData.visitReverted = visitReverted;
    }

    // 6. Reverse credit if it was a credit order
    if (order.is_credit_order && order.credit_pending_amount > 0) {
      const creditReversed = await reverseRetailerCredit(
        order.retailer_id,
        order.credit_pending_amount
      );
      if (creditReversed) {
        result.reversedData.creditReversed = order.credit_pending_amount;
      }
    }

    // 7. Recalculate retailer's last order
    await recalculateRetailerLastOrder(order.retailer_id);

    // 8. Remove gamification points (use created_at date, not order_date, since points are earned when order is placed)
    const pointsEarnedDate = order.created_at.split('T')[0];
    const pointsRemoved = await removeGamificationPoints(
      order.retailer_id,
      pointsEarnedDate,
      order.user_id
    );
    result.reversedData.pointsRemoved = pointsRemoved;

    // 9. Remove loyalty points
    const loyaltyPointsRemoved = await removeLoyaltyPoints(orderId);
    result.reversedData.loyaltyPointsRemoved = loyaltyPointsRemoved;

    // 10. Reverse retailer sequence tracking
    await reverseRetailerSequence(order.user_id, order.retailer_id);

    // 11. Reverse daily tracking counts
    await reverseDailyTracking(order.user_id, pointsEarnedDate);

    // 12. Clear local caches
    await clearLocalCaches(
      order.retailer_id,
      order.user_id,
      order.order_date,
      orderId,
      result.reversedData.visitReverted
    );

    result.success = true;
    console.log('[CancelOrder] Cancellation completed successfully:', result.reversedData);
    return result;

  } catch (error: any) {
    console.error('[CancelOrder] Unexpected error:', error);
    result.error = error.message || 'An unexpected error occurred';
    return result;
  }
}

/**
 * Check if an order can be cancelled (for UI display)
 */
export async function canCancelOrder(orderId: string): Promise<{ canCancel: boolean; reason?: string }> {
  const order = await fetchOrderWithDetails(orderId);
  if (!order) {
    return { canCancel: false, reason: 'Order not found' };
  }

  const validation = validateCancellable(order);
  return { canCancel: validation.valid, reason: validation.reason };
}
