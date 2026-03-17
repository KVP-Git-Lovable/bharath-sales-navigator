

## Redesign: Returns Tab with Streamlined Credit Note Flow

### Current Issues
The Returns tab has a confusing layout: the "Add Product" button is at the top but the form is always visible below, the flow feels disconnected, and there's no clear step-by-step guidance for generating a credit note.

### Redesigned Flow (3-Step Wizard)

The form will be restructured into a clear **3-step process** within the same component:

**Step 1 — Add Return Items**
- Clean header showing retailer name and a progress indicator (Step 1 of 3)
- Product search (existing combobox), Unit dropdown (default Kg), Quantity, Reason, Other reason input
- Inline "Add Item" button below the fields
- Added items shown in a compact card list (not a table) with swipe-to-delete or trash icon
- Running summary badge: "3 items | ₹2,450"
- "Next" button at bottom to proceed

**Step 2 — Review & Confirm**
- Summary card showing all items grouped by reason
- Tax breakdown: Sub-total, SGST 2.5%, CGST 2.5%, Grand Total
- Reason summary with notes
- "Back" and "Generate Credit Note" buttons

**Step 3 — Done**
- Success animation/icon
- Credit Note number displayed
- "Download PDF" button and "New Return" button

### Key UX Improvements
- **Step indicator** at top (dots or numbered badges) so the user always knows where they are
- **Compact item cards** instead of a wide table (better on mobile — current viewport is ~1021px)
- **Single action path**: no more confusing "Save Return" vs "Generate Credits" — the flow always leads to credit note generation (return GRN is saved automatically behind the scenes)
- **Better form layout**: 2-column grid on desktop, stacked on mobile, with the "Add Item" button inline

### Technical Changes
- **File**: `src/components/ReturnStockForm.tsx` — full rewrite of the JSX/UI with a `step` state (1/2/3)
- Remove the separate "Save Return" button — `handleGenerateCreditNote` already saves the return GRN
- Keep all existing data logic (product loading, credit note generation, DB saves) intact
- Reuse existing `CreditNoteReview` patterns from `src/components/credit-note/CreditNoteReview.tsx` for the review step
- Fixed bottom bar simplified to contextual action per step

### No DB Changes Required
All tables (`credit_notes`, `credit_note_items`, `van_return_grn`, `van_return_grn_items`) already exist with proper schema.

