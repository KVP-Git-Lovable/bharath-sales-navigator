

# Plan: Add "View Retailers for this PIN" Button to Pincode Master

## What We're Building
Each pincode row in the results list will get a clickable button between the PIN Code and Territory Name columns. Clicking it queries the `retailer_external_db` table for matching retailers and displays them in an expandable section below the row.

## Changes

### 1. Update `src/components/admin/PincodeMasterLookup.tsx`

**Layout change per row**: Convert the current 2-column layout (PIN Code | Territory Name) to a 3-column layout (PIN Code | Button | Territory Name). The header row will also get a middle column.

**Add state**: Track which pincode row is expanded (`expandedPincode: string | null`) and the fetched retailers + loading state.

**Add retailer fetch logic**: When the button is clicked, query `retailer_external_db` table filtering by `pincode` matching the clicked row's pincode. Store results in state.

**Add expandable retailer list**: Below the clicked row, render a collapsible section showing matching retailers (company name, address, city, mobile, category) in a compact list/table. Show a "No retailers found" message if empty.

**Button design**: Small outline button or icon button with text "View Retailers" using a `Store` or `Users` icon from lucide-react, sized to fit within the row without disrupting the layout.

### 2. No Database Changes Required
The `retailer_external_db` table already exists with a `pincode` column. We just query it directly with `.eq('pincode', selectedPincode)`.

