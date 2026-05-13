## Goal
Make both **View Invoice** and **Download Invoice** work reliably on `/operations` without the current `jspdf` import error.

## What I’ll change
1. **Unify the invoice actions on Operations**
   - Replace the remaining old `OrderInvoiceButton` usage in the order details dialog with the same shared invoice action path already used in the Invoice column.
   - Ensure both view and download go through one cached loader so there is no split behavior on the same page.

2. **Fix the stale module-loading failure**
   - Harden the invoice generation path so a stale Vite/PWA module reference cannot keep requesting the old `jspdf` chunk.
   - Add a safe recovery path for invoice-related module load failures instead of leaving the dialog stuck/failing.

3. **Adjust PWA/dev caching behavior for preview stability**
   - Review the current service worker registration/configuration and stop preview/dev from holding onto stale optimized dependency URLs.
   - Keep production caching behavior intact as much as possible while preventing this invoice error from recurring after refresh/deploy.

4. **Validate the invoice UX end-to-end**
   - Confirm the Invoice column view button renders the PDF.
   - Confirm the download button downloads the PDF.
   - Confirm the order details dialog uses the same working path.
   - Confirm repeated clicks use cached invoice data and do not trigger full-page UI refreshes.

## Files to update
- `src/pages/Operations.tsx`
- `src/components/invoice/OrderInvoiceButton.tsx`
- `src/components/invoice/InvoicePreviewDialog.tsx`
- `src/utils/invoiceGenerator.ts`
- `src/main.tsx` and/or `src/service-worker.ts` if the stale module request is coming from preview PWA caching

## Technical details
- Current issue appears to be a combination of:
  - a **leftover old invoice button path** still used inside the order details dialog, and
  - **version skew / stale cached module loading** for `jspdf` (`Failed to fetch dynamically imported module ... /node_modules/.vite/deps/jspdf.js`).
- The fix will make all Operations invoice actions use one shared invoice generation pipeline and add protection against stale module/cache failures.

## Validation
- Reproduce on `/operations`.
- Test **View Invoice** and **Download Invoice** from both the table row and order details dialog.
- Verify no `jspdf` dynamic import error remains in console.
- Verify the page does not flash or fully refresh during invoice actions.