## Goal
Stop new orders from being saved with `0 items` in the existing app without requiring users to reinstall or rebuild the application.

## What I found
The most likely regression is in the current order item payload:

1. **Variant orders are built incorrectly in `Cart.tsx`**
   - For variant rows, the code now puts the **variant UUID into `product_id`**.
   - But `order_items.product_id` is supposed to reference `products.id`.
   - This can make item insertion fail for variant orders.

2. **Queued/background sync still strips `variant_id`**
   - `useOfflineSync.ts` removes `variant_id` before calling `sync_order_with_items`.
   - But the database now already has a `variant_id` column.
   - So the sync path loses the variant linkage and can still fail or save incomplete item rows.

3. **Free scheme items are risky**
   - Free items can still send `product_id: 'FREE_ITEM'`.
   - The RPC casts `product_id` to `uuid`, so this can break the entire batch insert when a free item is present.

4. **Why this looks intermittent**
   - Live traffic shows many recent orders do have rows in `order_items`.
   - So this is likely not a total system outage.
   - It is more likely affecting orders that include **variants and/or free scheme items**, which matches the current code regression.

## Implementation plan
### 1) Fix the order payload in `Cart.tsx`
- For normal products:
  - send `product_id = base product id`
  - send `variant_id = null`
- For variant products:
  - send `product_id = base product id`
  - send `variant_id = variant id`
- For free items:
  - never send `'FREE_ITEM'` into `product_id`
  - send `null` when there is no real UUID

### 2) Fix offline/background sync in `useOfflineSync.ts`
- Stop stripping `variant_id`
- Keep valid `variant_id` in the RPC payload
- Keep `product_id` nullable when an item does not map to a real product UUID

### 3) Harden the database RPC
Update `public.sync_order_with_items` so it safely inserts:
- `product_id` as nullable UUID
- `variant_id` as nullable UUID
- no failure when a free item has no real product UUID

### 4) Validate against the existing UI read path
- Confirm the screens that show order details (`VisitCard` and related order displays) correctly read `order_items`
- Verify that after the payload fix, orders no longer appear as `0 items`

### 5) Verify with real order scenarios
Test these cases:
- base product only
- variant product
- order with free scheme item
- queued/offline order that later syncs online

## Technical details
Files likely involved:
- `src/pages/Cart.tsx`
- `src/hooks/useOfflineSync.ts`
- new Supabase migration to update `public.sync_order_with_items`

Expected permanent result:
- existing web app users keep using the same app
- installed users do not need a reinstall
- new orders save line items reliably for base products, variants, and free scheme items
- synced offline orders also persist their line items correctly