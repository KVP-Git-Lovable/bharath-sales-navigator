

# Fix: KG Not Displaying in Today's Summary & Target Module

## Root Cause

**`order_items` table has RLS enabled but zero policies defined.** This is the same class of bug we just fixed for `profiles` and `profile_object_permissions`.

When TodaySummary or the Target module queries `orders` with the join `order_items(*)`, Supabase applies RLS to `order_items` separately. Since there are no SELECT policies, the join returns **empty arrays** for every order. This makes:
- `convertToKg()` loop over zero items → **Total KG Sold = 0 KG**
- `useUserTargetProgress` quantity calculation → **Actual = 0**

## Fix — Single Migration

Add a SELECT policy on `order_items` that allows authenticated users to read items belonging to their own orders:

```sql
-- order_items has no user_id column; access is through the parent order
CREATE POLICY "Users can read own order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Admins can read all order items
CREATE POLICY "Admins can read all order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (public.is_system_admin(auth.uid()));
```

Note: The `orders` table already has proper RLS (`user_id = auth.uid()`), so this inner query is safe and won't recurse — `orders` RLS doesn't reference `order_items`.

## Impact

| Area | Before | After |
|---|---|---|
| Today's Summary → Total KG Sold | Always "0 KG" | Shows actual KG from order items |
| Target vs Actual (Quantity basis) | Always 0 | Shows actual quantity in KG |
| Product breakdown dialogs | Empty | Populated |
| No frontend changes needed | — | — |

