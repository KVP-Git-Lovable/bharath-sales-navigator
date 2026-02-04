

# Fix Order Unit: 800 KG → 800 Grams for रामदेव किराणा

## Problem Summary

Vishnu accidentally entered **800 KG** instead of **800 grams** when placing an order for retailer "रामदेव किराणा". The system's unit conversion logic converted this to 800,000 grams, resulting in a grossly inflated order value of ₹2,59,997 instead of approximately ₹260.

---

## Current vs Correct Values

| Field | Wrong (Current) | Correct |
|-------|-----------------|---------|
| Quantity | 800,000 grams | **800 grams** |
| Unit | Grams | Grams (no change) |
| Rate | ₹0.31/gram | ₹0.31/gram (no change) |
| Item Total | ₹2,47,616.00 | **₹248.00** |
| Order Total | ₹2,59,997.00 | **~₹260.00** |

---

## Where This Data Appears in the Application

The order data is displayed in these locations:

| Module | What's Shown | Will Auto-Update? |
|--------|--------------|-------------------|
| My Visits → Retailer Card | Order value, items | Yes (reads from DB) |
| Operations → Orders Tab | Order list with amounts | Yes |
| Today Summary | Order totals | Yes |
| Invoice PDF | Item details with qty/rate | Yes (regenerate if needed) |
| Analytics/Reports | KG sold metrics | Yes |
| Retailer Profile | Last order value | Needs manual update |

---

## Fix Implementation

### Step 1: Update Order Item

Update the `order_items` record to fix the quantity:

```sql
UPDATE order_items
SET 
  quantity = 800,
  total = 800 * 0.31  -- = 248.00
WHERE id = '60bf98ea-5072-4ea7-8b17-e1b4ec0590e8'
  AND order_id = 'a9ece262-c822-4971-bb60-c6e27315ee54';
```

### Step 2: Update Order Header

Recalculate the order totals:

```sql
UPDATE orders
SET 
  subtotal = 248.00,
  total_amount = 248.00 + (259997.00 - 247616.00), -- Keep any discount/tax adjustments
  updated_at = NOW()
WHERE id = 'a9ece262-c822-4971-bb60-c6e27315ee54';
```

The discount amount was ₹12,381 (259997 - 247616). After correction:
- New subtotal: ₹248.00
- New total: ₹248.00 + ₹12,381 = ₹12,629.00

**Wait** - this seems wrong. Let me recalculate:

Looking at the original order:
- Subtotal: ₹247,616.00
- Total: ₹259,997.00
- Difference: ₹12,381 (this appears to be GST/tax, not discount)

After correction:
- New Subtotal: ₹248.00
- New Total (with same tax ratio): ₹248 × (259997/247616) ≈ ₹260.40

So the corrected SQL would be:

```sql
UPDATE orders
SET 
  subtotal = 248.00,
  total_amount = 260.40,
  updated_at = NOW()
WHERE id = 'a9ece262-c822-4971-bb60-c6e27315ee54';
```

### Step 3: Update Retailer Analytics

The `last_order_value` on the retailer needs to be updated:

```sql
UPDATE retailers
SET 
  last_order_value = 260.40,
  updated_at = NOW()
WHERE id = 'feac223d-58e3-4927-8577-dd8e4cb9302c';
```

---

## Verification After Fix

After the database updates, verify by:

1. **My Visits** → Navigate to Hariram's visits → View order for रामदेव किराणा
2. **Operations** → Orders tab → Find INV2026-342
3. **Analytics** → Check that KG totals are corrected (should show 0.8 KG instead of 800 KG)

---

## Alternative: Use Edit Order Dialog

Instead of direct SQL, you can use the existing **Edit Order** feature:

1. Go to **Operations** page
2. Find order INV2026-342 in the Orders tab
3. Click the **Edit** button
4. Change quantity from 800,000 to 800
5. Save changes

The `EditOrderDialog` component (already exists at `src/components/EditOrderDialog.tsx`) handles:
- Updating order items
- Recalculating subtotal and total
- Syncing to database

However, this won't automatically update the `retailers.last_order_value` field, so a manual SQL update for that field would still be needed.

---

## Files Involved (No Code Changes Needed)

The fix is purely a **data correction** - no code changes are required. The existing `EditOrderDialog.tsx` component can be used to edit the order, or direct SQL updates can be executed.

| File | Purpose | Change Needed? |
|------|---------|----------------|
| `EditOrderDialog.tsx` | Edit order UI | No - already works |
| `Operations.tsx` | Shows edit button | No |
| All display components | Read from DB | No - auto-updates |

---

## Recommended Approach

**Option A: Use UI (Recommended for transparency)**
1. Navigate to Operations → Orders
2. Find and edit order INV2026-342
3. Manually change quantity to 800 grams
4. Execute SQL to fix retailer's `last_order_value`

**Option B: Direct SQL (Faster)**
Execute the three SQL statements above directly in Supabase SQL Editor.

---

## Summary

This is a **data correction** issue, not a code bug. The incorrect value (800 KG instead of 800 grams) was entered by the user during order placement. The fix involves:

1. Correcting `order_items.quantity` from 800,000 to 800
2. Recalculating `orders.subtotal` and `orders.total_amount`
3. Updating `retailers.last_order_value`

All application views will automatically reflect the corrected values after the database is updated.

