

## Improve Invoice Linking UI in Step 2

### Problem
The current Step 2 shows a basic dropdown per product with just the invoice number and date. The user wants to see **which products were in each invoice** so they can make an informed mapping decision — essentially a richer, more transparent invoice selection experience.

### Changes — `src/components/ReturnStockForm.tsx`

**1. Enhance `fetchInvoiceOptions` to include order item details (quantity, rate) per invoice**

Update the query to also fetch `order_items(product_id, variant_id, product_name, quantity, rate)` and store richer data in `invoiceOptions` so each option includes the matched product's original quantity and rate from that invoice.

**2. Redesign the Invoice Linking card in Step 2**

Replace the current flat dropdown-per-product layout with a grouped view:

- **Group return items by available invoices** — show each invoice as an expandable card with its number, date, and the list of return products that match it.
- Each product row within an invoice card shows: product name, original qty purchased, original rate.
- A **radio button or Select** per product lets the user pick which invoice to link that product to.
- If a product appears in multiple invoices, all options are shown with clear labels.
- If no matching invoice exists for a product, show a "No matching invoice" warning inline.

**3. Keep the auto-select default behavior** — most recent matching invoice is pre-selected, but user can change it.

### UI Layout for Step 2 Invoice Section

```text
┌─────────────────────────────────────┐
│ 🔗 Link Items to Invoices          │
├─────────────────────────────────────┤
│ Product: Tata Salt                  │
│ ┌─────────────────────────────────┐ │
│ │ ○ INV2026-105 (12/03/2026)     │ │
│ │   Qty: 10, Rate: ₹22.00       │ │
│ │ ● INV2026-098 (05/03/2026)     │ │
│ │   Qty: 5, Rate: ₹22.00        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Product: Parle-G Biscuit            │
│ ┌─────────────────────────────────┐ │
│ │ ● INV2026-105 (12/03/2026)     │ │
│ │   Qty: 20, Rate: ₹10.00       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Product: Vim Bar                    │
│ ⚠ No matching invoice found        │
└─────────────────────────────────────┘
```

### Data Changes

Expand `invoiceOptions` type to include per-product details:
```typescript
Record<string, { 
  invoice_number: string; 
  order_id: string; 
  created_at: string;
  matched_quantity: number;
  matched_rate: number;
}[]>
```

### Files Changed
- `src/components/ReturnStockForm.tsx` — enhanced fetch + redesigned Step 2 invoice linking UI with radio-style selection showing invoice details per product.

