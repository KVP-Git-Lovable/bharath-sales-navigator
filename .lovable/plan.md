

# Fix: Invoice Matching in Return Stock Form

## Problem
In Step 2 of "Return Stock" ("Link Items to Invoices"), the system shows "No matching invoice found" even when an invoice exists. The matching requires exact `variant_id` match, which fails when `order_items` doesn't store `variant_id` or a different variant of the same product was ordered.

## Plan

### File: `src/components/ReturnStockForm.tsx` (lines 181-205)

**Change 1 — Broaden match to product_id only:**
Remove the `variant_id` check from the `matchedItem` finder (lines 181-186). Match solely on `product_id`:
```ts
const matchedItem = orderItems.find((oi: any) => {
  return oi.product_id === item.productId;
});
```

**Change 2 — Add fallback: show all retailer invoices:**
After the product-matching loop for each item, if `optionsMap[key]` is still empty, populate it with ALL past invoices for that retailer as manual-selection fallbacks. Each fallback entry will have `matched_quantity: 0` and `matched_rate: 0` to indicate it's a manual link. The UI already handles displaying invoice options, so no rendering changes needed — the user will simply see available invoices instead of "No matching invoice found."

**No database changes required.**

