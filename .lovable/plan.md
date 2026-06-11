## Summary
Remove the dangerous "Delete All Products" button and its backing logic from the Product Management admin screen. Also clean up the already-removed `productMigration` utility reference.

## Verified Changes

### Change 1 — productMigration cleanup (already done)
- `src/utils/productMigration.ts` does not exist in the codebase.
- No import of `migrateProducts` exists in `src/components/ProductManagement.tsx`.
- No action needed.

### Change 2 — Remove "Delete All Products" feature from ProductManagement.tsx

1. **Remove type union member** (line 96)
   Remove `'all-products'` from:
   ```ts
   type: 'product' | 'category' | 'variant' | 'all-products' | null;
   ```
   Result: `type: 'product' | 'category' | 'variant' | null;`

2. **Remove `executeDeleteAllProducts` function** (lines 161–190)
   Deletes the entire async function that wipes `van_live_inventory`, `van_inward_grn_items`, `van_closing_stock_items`, `van_return_grn_items`, `van_order_fulfillment`, `product_schemes`, `product_variants`, and finally `products`.

3. **Remove `all-products` branch in `handleConfirmAction`** (lines 200–202)
   Removes:
   ```ts
   } else if (deleteConfirm.type === 'all-products') {
     executeDeleteAllProducts();
   ```

4. **Remove "Delete All Products" button** (lines 771–777)
   Removes the destructive red button block inside the products tab header.

5. **Remove dialog text for `all-products`** (line 1525)
   Removes the conditional suffix:
   ```tsx
   {deleteConfirm.type === 'all-products' && ' including all related data (van inventory, schemes, variants)'}.
   ```

## Why this matters
This single button could wipe the entire product catalog (including variants, schemes, and van inventory) with one click. Removing it eliminates a catastrophic accidental-deletion vector. No other code in the repo references `executeDeleteAllProducts`, `all-products`, or the removed button.

## Rollback
All changes are in one file (`src/components/ProductManagement.tsx`). Revert via git if needed.