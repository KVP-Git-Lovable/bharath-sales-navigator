

## Move Credit Note Generation into the Returns Tab

### Current State
- The **ReturnStockForm** (Returns tab in Order Entry) lets users select products, quantities, and reasons for return
- The "Generate Credits" button is a placeholder showing "coming soon"
- The **Credit Note system** exists separately at `/credit-note/create` with its own invoice-based item selection flow

### What Changes

The "Generate Credits" button will generate a credit note PDF directly from the return items already added in the form — no need to navigate elsewhere.

#### 1. Update `ReturnStockForm.tsx` — Add credit note generation logic
- When "Generate Credits" is clicked:
  1. Look up the retailer's past invoices (`orders` table) to find which invoice(s) contained the returned products (for reference invoice numbers)
  2. Save a `credit_notes` record + `credit_note_items` to the database
  3. Call `generateCreditNotePDF()` with the return items data
  4. Download the PDF
- The return items already in the form (product, qty, price, reason) map directly to credit note line items
- GST is calculated at 2.5% SGST + 2.5% CGST (matching existing credit note logic)
- If no matching invoice is found for a product, use "N/A" as reference invoice

#### 2. Update `ReturnStockForm.tsx` — Also save returns on credit note generation
- When generating a credit note, also save the return GRN (same as "Save Return") so both records are created together
- This prevents the user from having to click "Save Return" separately

#### 3. No new files needed
- Reuses existing `generateCreditNotePDF()` from `src/utils/creditNoteGenerator.ts`
- Reuses existing `getNextCreditNoteNumber()` for auto-numbering
- Reuses existing DB tables `credit_notes` and `credit_note_items`

### Files Modified
| File | Change |
|------|--------|
| `src/components/ReturnStockForm.tsx` | Replace placeholder toast with actual credit note generation logic — lookup invoices, save to DB, generate & download PDF |

