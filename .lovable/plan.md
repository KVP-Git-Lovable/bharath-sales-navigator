## Problem

In the cart (Order Entry):
- **Subtotal**: ₹10,190.50 (sum of `original_rate × qty` — before any discount)
- **Discount**: -₹200.00 (sum of per-unit savings + any order-level discount)
- **Total**: ₹10,490 (after discount + GST)

In the generated **Invoice PDF**:
- **SUB-TOTAL**: Rs.9,790.50 (already net of per-unit AND order-level discount)
- **DISCOUNT**: -Rs.200.00 (shown again)
- **Total**: Rs.10,490 (correct, because `orderTotal` is used directly)

So the **subtotal is being computed post-discount** while the discount line is still printed below it — the values don't reconcile with the cart, even though the final total matches.

The user wants the invoice to mirror the cart exactly:

```text
SUB-TOTAL    Rs.10,190.50   ← before any discount (rate × qty)
DISCOUNT     -Rs.200.00     ← single combined discount line
SGST (2.5%)  Rs.249.76
CGST (2.5%)  Rs.249.76
TOTAL        Rs.10,490
```

## Root cause

In `src/utils/invoiceGenerator.ts` (`generateTemplate4Invoice`, ~lines 600–680):

- `itemSubtotal` is summed from each item's stored `taxable_amount` (or `_storedTotal`), which already has the per-unit / item-level discount baked in.
- The `SUB-TOTAL` row prints `itemSubtotal` (post-discount).
- The `DISCOUNT` row only prints the order-level `orderDiscount`, ignoring per-unit savings that were already absorbed into `taxable_amount`.

Net effect: subtotal looks "too low" and the printed discount looks "too small" to bridge it back to the cart's numbers.

## Fix (presentation-only, in `src/utils/invoiceGenerator.ts`)

1. **Compute a true pre-discount subtotal** from the line items:
   - `originalSubtotal = Σ ( (item.original_rate ?? item.rate) × displayQty )`
   - Use the same display-qty conversion already done in `normalizeItemForDisplay` so grams→KG conversions stay consistent with the printed line rows.
   - Falls back to current `itemSubtotal` if `original_rate` is missing.

2. **Compute combined discount**:
   - `perUnitSavings = max(0, originalSubtotal − itemSubtotal)` (the part baked into line `taxable_amount`)
   - `combinedDiscount = perUnitSavings + appliedOrderDiscount`
   - Show the DISCOUNT row only if `combinedDiscount > 0`.

3. **Update the totals box rendering** (~lines 651–691):
   - `SUB-TOTAL` value → `originalSubtotal`
   - `DISCOUNT` value → `-combinedDiscount`
   - `SGST` / `CGST` → unchanged (still computed off the discounted taxable base, so GST math stays correct)
   - `TOTAL` bar → unchanged (still uses `orderTotal` when present)

4. **Update "Amount in Words"** → unchanged, still derived from final `total`.

5. Sanity-check the same logic is not duplicated elsewhere; `InvoiceTemplate1/2/3.tsx` are not used by the live PDF flow (`InvoicePDFGenerator` and `fetchAndGenerateInvoice` both go through `generateTemplate4Invoice`), so they don't need changes for this fix.

## Files to touch

- `src/utils/invoiceGenerator.ts` — only the totals computation + totals-box rendering inside `generateTemplate4Invoice`.

## Not changed

- `cartItems` / `order_items` schema — no DB migration.
- GST calculation base — still the discounted taxable amount, so tax compliance stays intact.
- `orderTotal` source-of-truth for the final total bar.
- Cart UI, scheme engine, other invoice templates.

## Verification

After the change, regenerate the same order's invoice and confirm:
- `SUB-TOTAL` matches cart `Subtotal` (₹10,190.50 in the screenshot)
- `DISCOUNT` equals cart `Discount` (-₹200.00)
- `Total: Rs.10,490` unchanged
- An order with **no** discounts hides the DISCOUNT row and shows `SUB-TOTAL` = sum of line totals (no regression).
