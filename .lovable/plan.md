
## Problem

In the "AI Insights" section under "Order Details", retailer names are showing as "Unknown" instead of their actual names (as shown in the screenshot: "Unknown, Unknown, Unknown ordered earlier but not in last week").

## Root Cause

In `src/components/analytics/OrderDetailsAIInsights.tsx`:

1. **Line 55-58**: Retailers are fetched with `.eq('user_id', userId)` - only retailers *owned by* this specific user
2. **Line 61-67**: Orders are fetched separately without retailer name information
3. **Line 121-124 & 166**: When building insights, the code tries to find retailer names by matching `order.retailer_id` against the `retailers` array using `retailers.find(r => r.id === id)?.name || 'Unknown'`

**The mismatch**: If any order references a retailer that isn't in the separately-fetched `retailers` array (because it's not directly owned by this user), the name lookup fails and returns "Unknown".

## Solution

Modify the orders query to include retailer name directly via a nested select (Supabase join), eliminating the need for a separate lookup. This ensures every order carries its retailer's name regardless of ownership.

## Technical Changes

### File: `src/components/analytics/OrderDetailsAIInsights.tsx`

**1. Update the orders query to include retailer name (line 61-67)**

```typescript
// Current:
supabase
  .from('orders')
  .select('retailer_id, total_amount, order_date')
  .eq('user_id', userId)
  .eq('status', 'confirmed')
  .gte('order_date', fromDate)
  .lte('order_date', toDate)

// Change to:
supabase
  .from('orders')
  .select('retailer_id, total_amount, order_date, retailers(name)')
  .eq('user_id', userId)
  .eq('status', 'confirmed')
  .gte('order_date', fromDate)
  .lte('order_date', toDate)
```

**2. Update order type handling (after line 86)**

```typescript
// Orders now include: { retailer_id, total_amount, order_date, retailers: { name } }
const orders = (ordersResult.data || []).map(o => ({
  ...o,
  retailer_name: o.retailers?.name || 'Unknown'
}));
```

**3. Update Analysis 3 - Top retailer by value (lines 117-128)**

```typescript
// Use order.retailer_name directly instead of looking up from retailers array
orders.forEach(o => {
  if (!retailerOrders[o.retailer_id]) {
    retailerOrders[o.retailer_id] = { 
      total: 0, 
      name: o.retailer_name  // <-- Use the joined name
    };
  }
  retailerOrders[o.retailer_id].total += Number(o.total_amount || 0);
});
```

**4. Update Analysis 5 - Re-engage retailers (lines 163-166)**

```typescript
// Build a map of retailer_id -> name from orders
const orderRetailerNames: Record<string, string> = {};
orders.forEach(o => {
  if (!orderRetailerNames[o.retailer_id]) {
    orderRetailerNames[o.retailer_id] = o.retailer_name;
  }
});

// Then use this map for declined retailers
const declinedNames = uniqueDeclined
  .slice(0, 3)
  .map(id => orderRetailerNames[id] || 'Unknown');
```

## Summary of Changes

| Location | Change |
|----------|--------|
| Line 61-67 | Add `retailers(name)` to the orders select query |
| Line 86 | Map orders to include `retailer_name` from the joined data |
| Lines 117-128 | Use `o.retailer_name` instead of `retailers.find()` |
| Lines 163-166 | Build name map from orders, use for declined retailer names |

## Expected Result

After this fix:
- "Re-engage These Retailers" will show actual names like "Ajay Prabhu, KVP, Testing3 ordered earlier but not in last week"
- "Top Performing Retailer" will correctly show the retailer name
- All other retailer name references in AI Insights will work correctly
