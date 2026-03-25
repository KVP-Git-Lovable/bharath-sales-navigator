

# Add Cancelled Orders Tab to Operations Dashboard

## Overview
Add a new "Cancelled Orders" tab in the Operations Dashboard (`/operations`) that shows all cancelled order details with full reversal audit trail from the `order_cancellation_log` table.

## Plan

### File: `src/pages/Operations.tsx`

**1. Add new tab trigger** (around line 989)
- Expand grid from `grid-cols-6` to `grid-cols-7`
- Add `<TabsTrigger value="cancelled">Cancelled Orders</TabsTrigger>`

**2. Add state and fetch function**
- Add `cancelledOrders` state array
- Create `fetchCancelledOrders()` that queries:
  - `order_cancellation_log` joined with `orders` (for order details like retailer_id, total_amount, order_date, user_id)
  - Map retailer names and user names from existing data/queries
  - Sort by `cancelled_at` descending
  - Apply existing date filter and search

**3. Add tab content panel**
- Table columns: Order ID (truncated), Retailer, Cancelled By (user), Reason, Cancelled At, Order Amount, Reversal Summary (credit reversed, points removed, invoice cancelled, visit reverted, loyalty points removed)
- Each reversal summary field parsed from the `reversal_summary` JSON column
- Show badges for what was reversed (e.g., green badge "Credit Reversed ₹X", amber badge "Points -X")
- Include CSV download using existing `downloadCSV` utility

**4. Wire up refresh** (line 975-979)
- Add `if (activeTab === 'cancelled') fetchCancelledOrders();` to the refresh handler

### No database changes needed
The `order_cancellation_log` table already has all necessary data including `reversal_summary` JSON with credit, gamification, loyalty, invoice, and visit reversal details.

