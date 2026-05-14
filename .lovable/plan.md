## Goal
Make variant products save and appear as real variants again when orders are placed from the app/mobile flow, while keeping base-product orders working as they do now.

## What I found
- The database sync function now supports both new and legacy variant payloads.
- But the table-order flow is still inconsistent before save:
  - `TableOrderForm` stores cart rows using a composite cart id like `baseProductId_variant_variantId` in `syncRowsToCart`.
  - Other logic in the same component still treats variant items as `id = variant.id` and `product_id = variant.id`.
- `Cart.tsx` only reconstructs `product_id` + `variant_id` correctly when the incoming cart item id is in the composite format.
- That means some variant orders are still reaching save logic as plain product ids or ambiguous ids, so `variant_id` ends up null and the order item behaves like a base product.

## Plan
1. Normalize variant IDs at the source in `TableOrderForm`
   - Update all variant-related item builders in `TableOrderForm` to use one single format consistently:
     - cart/display id: `baseProductId_variant_variantId`
     - `product_id`: base product id
     - `variant_id`: variant id
   - Remove mixed logic that still uses `variant.id` alone as the item id.

2. Make cart/order payload building resilient
   - Harden `Cart.tsx` so it prefers explicit `product_id` and `variant_id` when they exist, and only falls back to parsing the composite id.
   - This prevents future regressions if one upstream flow changes shape slightly.

3. Verify all order-entry paths use the same variant contract
   - Check the main order-entry/table flow and scheme modal flow so variants are passed forward using the same structure.
   - Keep base products untouched.

4. Validate against current DB behavior
   - Re-check recent order-item rows after the code fix to confirm new variant orders store `variant_id` instead of null.
   - Confirm base products still save normally.

## Technical details
Files most likely to change:
- `src/components/TableOrderForm.tsx`
- `src/pages/Cart.tsx`
- potentially `src/components/OrderEntrySchemesModal.tsx` if it also emits the old shape

Expected final payload contract:
```text
Base product:
  id = <productId>
  product_id = <productId>
  variant_id = null

Variant product:
  id = <productId>_variant_<variantId>
  product_id = <productId>
  variant_id = <variantId>
```

## Expected result
After implementation, a newly placed variant order should:
- save an `order_items` row with both `product_id` and `variant_id`
- show the correct variant product on the order item page
- continue working for base products and older mobile payloads