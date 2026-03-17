

## Credit Note Generation System

### Current State
- Products have `barcode`, `sku`, `product_number`, and `qr_code` fields
- Product variants also have `barcode`, `sku`, `qr_code`
- Order items link to `product_id` with full pricing/GST data
- Orders have `invoice_number` and `retailer_id`
- Invoice PDF uses jsPDF + autoTable with dark header, green accent, GST breakdown
- The uploaded reference PDF (KVP credit note) shows: company header, CN number, reference invoice#/date, bill-to, items table, GST totals, amount in words

### Database Changes

**New table: `credit_notes`**
- `id`, `credit_note_number` (auto-generated, e.g. CN/25-26/001), `credit_note_date`
- `retailer_id` (FK → retailers), `retailer_name`
- `reason` (enum: unsold_stock, damaged, expired, quality_issue, other)
- `reason_notes` (text)
- `sub_total`, `sgst_total`, `cgst_total`, `total_amount`, `amount_in_words`
- `status` (draft, issued, cancelled)
- `created_by` (FK → auth.users), `created_at`, `updated_at`

**New table: `credit_note_items`**
- `id`, `credit_note_id` (FK → credit_notes)
- `original_order_id` (FK → orders), `original_invoice_number`
- `product_id`, `product_name`, `hsn_code`, `unit`
- `quantity` (return qty), `rate`, `total`
- `sgst_amount`, `cgst_amount`, `taxable_amount`
- `barcode` (stored for traceability)

RLS: authenticated users can insert/select their own; admins can see all.

### UI Components

**1. Credit Note Creation Page** (`/credit-note/create?retailerId=xxx`)
- Step 1: Show all invoices for the selected retailer (from `orders` where `invoice_number` is not null)
- Step 2: For each invoice, show its line items with checkboxes. User selects items to return and enters return quantity (up to original qty)
- Step 3: Items from multiple invoices can be selected together (e.g., two 500g orders returned together)
- Step 4: Select return reason, add notes
- Step 5: Review totals (auto-calculated with GST) → Generate credit note

**2. Barcode/Product Code Scanner**
- Add a barcode scan input at the top of the item selection screen
- When scanned, search `products.barcode`, `product_variants.barcode`, `products.sku`, `products.product_number`
- Auto-highlight matching items across all displayed invoices, showing which invoice(s) contain that product
- This enables quick identification: "scan product → see it was in Invoice #X and #Y"

**3. Credit Note List** (in Invoice Management → new tab "Credit Notes")
- List all credit notes with download/share options
- Filter by retailer, date range, status

### PDF Generation

**`generateCreditNotePDF()`** in `src/utils/creditNoteGenerator.ts`
- Same visual style as current invoice (dark header, green accents, company logo)
- Title changed to **"CREDIT NOTE"** (instead of "INVOICE")
- Header right side: CN#, Credit Date, Reference Invoice#, Invoice Date (matching the uploaded PDF format)
- Items table: NO, PRODUCT, HSN, UNIT, QTY, RATE, AMOUNT
- Totals: Sub Total, SGST, CGST, Total
- Amount in words
- "Reason for Credit" section
- Footer with company signature

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/utils/creditNoteGenerator.ts` | New — PDF generation for credit notes |
| `src/pages/CreditNoteCreate.tsx` | New — multi-invoice item selection UI |
| `src/components/credit-note/RetailerInvoiceList.tsx` | New — shows retailer's invoices with items |
| `src/components/credit-note/BarcodeScanInput.tsx` | New — barcode/product code scanner |
| `src/components/credit-note/CreditNoteReview.tsx` | New — review & generate |
| `src/components/credit-note/CreditNoteList.tsx` | New — list all credit notes |
| `src/pages/InvoiceManagement.tsx` | Modify — add "Credit Notes" tab |
| `src/App.tsx` | Modify — add route `/credit-note/create` |
| Migration SQL | New tables `credit_notes` + `credit_note_items` with RLS |

### Implementation Order
1. Create database tables via migration
2. Build credit note creation page with invoice/item selection
3. Add barcode scan lookup feature
4. Build credit note PDF generator (matching invoice style)
5. Add credit notes list tab to Invoice Management
6. Wire up routes

