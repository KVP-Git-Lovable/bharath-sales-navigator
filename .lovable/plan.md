
Goal: make Step 2 (“Link Items to Invoices”) always show selectable invoice options for the retailer, including the recent invoice for the same product.

What I found (root cause):
- `fetchInvoiceOptions()` currently queries:
  `order_items(product_id, variant_id, product_name, quantity, rate)`
- In your DB, `public.order_items` does **not** have `variant_id`.
- That causes the orders query to fail, so `pastOrders` never populates, and UI falls back to “No matching invoice found”.

Implementation plan (single file):
1) Update `src/components/ReturnStockForm.tsx` in `fetchInvoiceOptions()`
- Change nested select to remove non-existent column:
  `order_items(product_id, product_name, quantity, rate)`
- Capture and handle query error explicitly (do not silently continue).

2) Keep product-level matching broad (already correct)
- Continue matching with:
  `oi.product_id === item.productId`
- Do not require variant match.

3) Make fallback deterministic
- If no product match for an item, populate options with all recent retailer invoices (manual selection path), even when matched quantity/rate are 0.
- Keep dedupe by `invoice_number`.

4) Improve failure visibility
- If fetch fails, show a toast/error message like “Could not load invoice options” so this is diagnosable next time (instead of silently showing empty).

5) Quick safety filter
- Exclude cancelled orders from selectable invoice list (only valid invoice sources should appear).

Validation plan (end-to-end):
- Reproduce with retailer “Shree devi store” and product “KADAK GOLD 250G”.
- Step 2 must show invoice options (e.g., latest INV entries) instead of empty warning.
- Confirm selecting an invoice stores in `selectedInvoices` and generated Credit Note uses that selected invoice number.
- Confirm “manual selection” list still appears for products with no product-level match.

Technical notes:
- No DB migration required.
- Only frontend logic change in `ReturnStockForm.tsx`.
- This specifically addresses why the previous variant-match relaxation alone did not fix the issue.
