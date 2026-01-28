
# Order Creation Guide Manual - PDF Generator Implementation Plan

## Overview
Create a comprehensive, professionally designed PDF manual that guides end users through the complete order creation process in the Field Sales Navigator application. This manual will be accessible from the app and can be downloaded for offline reference.

## Manual Content Structure

### 1. Cover Page
- Title: "Field Sales Order Entry Guide"
- Subtitle: "Complete User Manual for Sales Representatives"
- Company logo placeholder
- Version and date

### 2. Table of Contents
- Quick navigation to all sections

### 3. Getting Started
- **Logging In**: How to access the app
- **Marking Attendance**: Requirement before order entry (if enabled)
- **Understanding the Dashboard**: Navigation basics

### 4. Accessing Order Entry
- **From My Visits**: Clicking on a retailer card
- **Phone Orders**: How to place phone orders
- **Order Entry URL Parameters**: Understanding visit context

### 5. Order Entry Screen Overview
- **Header Section**: Retailer name, connection status, location tracking
- **Mode Selection Tabs**: Table View, Grid View, Returns, No Order, Competition
- **AI Tools**: Voice Order Assistant, Smart Basket, AI Stock Capture
- **Cart Summary**: Total items and value display

### 6. Table View Order Entry (Default Mode)
- **Product Search**: Using the searchable dropdown
- **Selecting Products**: Choosing base products and variants
- **Entering Quantities**: KG vs Grams conversion
- **Understanding Rates**: How pricing is displayed
- **Adding Rows**: Creating multiple product entries
- **Removing Items**: Deleting unwanted rows
- **Scheme Indicators**: Recognizing available offers

### 7. Grid View Order Entry
- **Category Navigation**: Filtering by product category
- **Product Cards**: Understanding product display
- **Quick Add**: Increment/decrement buttons
- **Variant Selection**: Expanding product variants
- **Focused Products**: Star indicators for priority items

### 8. Understanding Schemes & Offers
- **Scheme Types**: BOGO, percentage discounts, quantity-based
- **Viewing Scheme Details**: Clicking the gift icon
- **Auto-Applied Schemes**: How schemes apply automatically
- **Applied Schemes Summary**: Viewing active discounts

### 9. AI-Powered Features
- **Voice Order Assistant**: Speaking your order
- **Smart Basket**: AI-recommended products based on history
- **AI Stock Capture**: Taking photos to record closing stock

### 10. Return Stock Entry
- **Accessing Returns Mode**: Clicking "Returns" button
- **Recording Return Items**: Product, quantity, reason
- **Submitting Returns**: Completing the return entry

### 11. No Order Entry (Unproductive Visit)
- **Reasons Available**:
  - Over Stocked
  - Owner Not Available
  - Store Closed
  - Permanently Closed
  - Other (custom reason)
- **Submitting No Order**: Completing the visit

### 12. Competition Data Entry
- **Recording Competitor Information**: Adding competition data
- **Photos and Notes**: Capturing competitive intelligence

### 13. Viewing and Managing Cart
- **Cart Button**: Accessing the cart page
- **Cart Summary**: Review of all items
- **Modifying Quantities**: Adjusting order amounts
- **Removing Items**: Deleting products from cart
- **Discount Display**: Understanding applied discounts

### 14. Payment Options
- **Full Payment**: Clearing all dues
- **Partial Payment**: Making a portion of payment
- **Credit**: Recording order on credit
- **Payment Methods**:
  - Cash
  - Cheque (with photo capture)
  - UPI (with transaction ID and photo)
  - NEFT (with photo capture)

### 15. Invoice Preview
- **Preview Button**: Viewing invoice before submission
- **Invoice Details**: Understanding the invoice layout
- **Company vs Distributor Headers**: How source is selected

### 16. Submitting the Order
- **Place Order Button**: Final submission
- **Confirmation Message**: Success feedback
- **Offline Submission**: How orders save when offline

### 17. Working Offline
- **Offline Indicator**: Recognizing offline mode
- **What Works Offline**: Products, orders, visits
- **Auto-Sync**: When connection restores
- **Sync Status**: Monitoring pending syncs

### 18. Troubleshooting
- **Order Not Saving**: Common solutions
- **Products Not Loading**: Cache refresh steps
- **Payment Photo Not Uploading**: Offline handling
- **GPS/Location Issues**: Permission settings

### 19. Quick Reference Card
- **Keyboard Shortcuts** (if applicable)
- **Common Actions Summary**
- **Support Contact Information**

---

## Technical Implementation

### New File: `src/utils/orderGuideManualGenerator.ts`

**Purpose**: Generate a multi-page PDF manual with professional formatting

**Key Functions**:
- `generateOrderGuideManualPDF()`: Main function to create and download the PDF
- Helper functions for consistent styling (headers, bullets, numbered lists, screenshots placeholders)

**Dependencies**:
- `jspdf` (already installed)
- `date-fns` (already installed for date formatting)

### PDF Design Specifications:
- **Page Size**: A4 (210 x 297 mm)
- **Margins**: 20mm all sides
- **Primary Color**: Amber (#F59E0B) - matching app theme
- **Secondary Color**: Dark slate for text
- **Font**: Helvetica (built-in)
- **Header Style**: Amber colored section headers with underlines
- **Content Style**: Clear numbered steps with adequate spacing

### Page Structure:
1. Cover page with dark background
2. Table of contents with page numbers
3. Content sections with consistent formatting
4. Step-by-step instructions with numbered lists
5. Tips and notes in highlighted boxes
6. Footer with page numbers

### New Component: `src/components/OrderGuideManualButton.tsx`

**Purpose**: Button component to trigger PDF generation

**Placement Options**:
- Settings page under "Help & Support"
- Order Entry page (help icon)
- My Visits page (help menu)

### Integration Points:
1. **Settings Page**: Add "Download Order Guide" option
2. **Order Entry Page**: Add help icon that downloads the manual
3. **Help & Documentation Section**: If exists, add link there

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/utils/orderGuideManualGenerator.ts` | Create | PDF generation logic with all content |
| `src/components/OrderGuideManualButton.tsx` | Create | Reusable button component |
| `src/pages/OrderEntry.tsx` | Modify | Add help icon to download guide |

---

## Content Details

### Section Examples

**Example: Table View Order Entry Steps**
1. Tap on the product search dropdown
2. Type product name or scroll to find it
3. Select the product from the list
4. If product has variants, a variant dropdown appears
5. Choose the desired variant (e.g., "500g Pack")
6. Enter quantity in the Quantity field
7. Select unit (KG or Grams) from the dropdown
8. Total is calculated automatically
9. Repeat for additional products
10. Click "Add to Cart" to proceed

**Example: Payment Flow**
1. On Cart page, review all items and totals
2. Select Payment Type:
   - Full Payment: Clears current order + any previous pending
   - Partial Payment: Enter amount being paid now
   - Credit: Full amount added to retailer's pending
3. If Full or Partial, select Payment Method
4. For Cheque/UPI/NEFT: Capture proof photo
5. For UPI: Enter last 4 digits of transaction ID
6. Click "Place Order" to submit

---

## Estimated Implementation Effort

- PDF generator utility: ~400-500 lines
- Button component: ~30 lines
- Integration changes: ~10 lines
- Total: ~550 lines of new code

## Notes

- Manual is generated client-side (no server dependency)
- Works offline once app is loaded
- PDF is ~15-20 pages when generated
- File size: ~100-200KB (text-only, no embedded images)
- Can be extended to include screenshots as base64 images in future
