

## Root Cause Analysis: Analytics Data Not Displaying Properly

### Problem
The Analytics page shows ₹0.00 Lac / 0 Orders when "All Users" is selected, even though the database has 139 confirmed orders worth ₹193,282 for the current week.

### Root Causes Identified

**1. Missing Admin RLS Policy on `orders` Table (Primary Issue)**

The `orders` table only has a self-only SELECT policy: `user_id = auth.uid()`. There is no system admin policy to allow administrators to view all orders. When "All Users" is selected, the query drops the user filter, but RLS still restricts results to the current user's own orders only.

- `order_items` already has an admin read policy (`is_system_admin(auth.uid())`) — but `orders` does