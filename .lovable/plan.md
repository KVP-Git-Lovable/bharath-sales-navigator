

# Order Creation Manual with Screenshots and Visual Annotations

## Overview

Create an enhanced PDF manual generator that includes actual screenshots of each step in the order creation flow, with visual annotations (arrows, highlights, numbered callouts) pointing to buttons, fields, and dropdowns.

## Implementation Approach

We will extend the existing `orderGuideManualGenerator.ts` utility to include:
1. Pre-captured screenshot images encoded as base64
2. Visual annotation overlays (arrows, circles, numbered callouts)
3. Enhanced layout with image-text combinations

## Technical Details

### Strategy: Pre-Captured Annotated Screenshots

Since generating live screenshots with annotations at runtime is complex, we will:
1. **Create a dedicated screenshots folder** with annotated images
2. **Pre-design the annotated screenshots** using a design tool or HTML canvas
3. **Embed these as base64 in the PDF generator** using jsPDF's image capabilities

### Files to Create/Modify

#### 1. New Screenshot Assets (Pre-Annotated)
Create annotated screenshot images for each step:

```text
public/manual-screenshots/
├── 01-login-screen.png          # Login form with arrows to email, password, button
├── 02-dashboard-home.png        # Dashboard with arrow to "My Visits"
├── 03-my-visits-page.png        # Beat list with arrow to retailer card
├── 04-order-entry-header.png    # Header showing retailer name, tabs
├── 05-table-view-form.png       # Table order form with numbered callouts
├── 06-grid-view-products.png    # Grid view with product cards
├── 07-scheme-icon-popup.png     # Scheme details modal
├── 08-voice-order-mic.png       # Voice order interface
├── 09-smart-basket.png          # AI recommendations
├── 10-returns-form.png          # Return stock entry
├── 11-no-order-reasons.png      # No order selection
├── 12-cart-summary.png          # Cart with all items
├── 13-payment-options.png       # Payment type selection
├── 14-invoice-preview.png       # Invoice preview screen
├── 15-order-confirmation.png    # Success message
└── 16-offline-indicator.png     # Offline mode badge
```

#### 2. Enhanced PDF Generator
Modify `src/utils/orderGuideManualGenerator.ts`:

```typescript
// New function to add annotated screenshot to PDF
const addScreenshot = async (
  doc: jsPDF, 
  imageData: string, 
  caption: string,
  yPos: number
): number => {
  const imgWidth = CONTENT_WIDTH * 0.8; // 80% of content width
  const imgHeight = imgWidth * 1.5;     // Mobile aspect ratio
  
  checkPageBreak(imgHeight + 20);
  
  // Center the image
  const xPos = MARGIN + (CONTENT_WIDTH - imgWidth) / 2;
  
  // Add image with border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(xPos - 2, yPos - 2, imgWidth + 4, imgHeight + 4);
  doc.addImage(imageData, 'PNG', xPos, yPos, imgWidth, imgHeight);
  
  // Add caption below image
  yPos += imgHeight + 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(caption, PAGE_WIDTH / 2, yPos, { align: 'center' });
  
  return yPos + 10;
};
```

#### 3. Screenshot Annotation Component (For Generating Screenshots)
Create `src/components/ManualScreenshotGenerator.tsx` - an admin tool to capture and annotate screenshots:

```typescript
// Component that renders each screen with SVG overlays for arrows/circles
// Export as PNG using html2canvas
// This is a one-time tool to generate the static images
```

### Visual Annotation Elements

Each screenshot will include:

| Element | Visual | Purpose |
|---------|--------|---------|
| **Numbered Callout** | Orange circle with number | Sequential step indicator |
| **Arrow Pointer** | Curved arrow | Points to specific UI element |
| **Highlight Box** | Dotted rectangle | Highlights input fields |
| **Text Label** | Small caption | Explains the element |

### PDF Structure with Screenshots

```text
COVER PAGE
├── Title, Version, Date

TABLE OF CONTENTS
├── Linked sections with page numbers

SECTION 1: GETTING STARTED
├── Text: Introduction
├── Screenshot: Login Screen
│   └── Callouts: (1) Email field, (2) Password field, (3) Sign In button
├── Text: Step-by-step instructions

SECTION 2: NAVIGATING TO ORDER ENTRY
├── Screenshot: Dashboard
│   └── Arrow pointing to "My Visits" nav item
├── Screenshot: My Visits Page
│   └── Arrow pointing to retailer card "Take Order" action
├── Text: Explanation

SECTION 3: ORDER ENTRY SCREEN
├── Screenshot: Order Entry Header
│   └── Callouts: Retailer name, connection status, tabs
├── Text: Mode selection explanation

SECTION 4: TABLE VIEW ORDER ENTRY
├── Screenshot: Table Order Form (Full)
│   └── Numbered callouts:
│       (1) Product dropdown
│       (2) Variant dropdown
│       (3) Quantity field
│       (4) Unit selector
│       (5) Rate display
│       (6) Total calculation
│       (7) Add row button
│       (8) Add to Cart button
├── Text: Field-by-field explanation

SECTION 5: GRID VIEW ORDER ENTRY
├── Screenshot: Grid View
│   └── Callouts: Category tabs, product cards, +/- buttons
├── Text: Quick add workflow

... (Sections 6-17 follow same pattern)
```

### Implementation Steps

1. **Phase 1: Create Screenshot Capture Tool**
   - Build a hidden admin component that renders each screen state
   - Add SVG overlay for annotations (arrows, circles, labels)
   - Export each annotated view as PNG using html2canvas

2. **Phase 2: Generate Annotated Screenshots**
   - Navigate through the app manually
   - Capture each screen with annotations
   - Save to `public/manual-screenshots/` folder

3. **Phase 3: Update PDF Generator**
   - Modify `orderGuideManualGenerator.ts`
   - Add image embedding function using jsPDF
   - Restructure sections to include images before/after text
   - Adjust page breaks to accommodate images

4. **Phase 4: Optimize and Test**
   - Compress images for smaller PDF size
   - Test PDF generation on mobile devices
   - Verify all screenshots render correctly

### Alternative Approach: Dynamic SVG Annotations

Instead of pre-captured images, we could generate annotation overlays dynamically:

```typescript
// Draw annotation directly in PDF
const drawAnnotatedArea = (doc, x, y, width, height, number, label) => {
  // Draw highlight rectangle
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(1);
  doc.rect(x, y, width, height);
  
  // Draw number circle
  doc.setFillColor(245, 158, 11);
  doc.circle(x + width + 5, y, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(String(number), x + width + 5, y + 1.5, { align: 'center' });
  
  // Draw label
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text(label, x + width + 12, y + 1);
};
```

### Dependencies

- **jsPDF** (already installed) - PDF generation
- **html2canvas** (already installed) - Screenshot capture
- No additional dependencies required

### Estimated Effort

| Task | Effort |
|------|--------|
| Screenshot capture tool | 2-3 hours |
| Annotate 16 screenshots | 2-3 hours |
| Update PDF generator | 2-3 hours |
| Testing and optimization | 1-2 hours |
| **Total** | **7-11 hours** |

### Sample Output Structure

The final PDF will be approximately 25-30 pages with:
- Cover page
- Table of contents
- 17 sections with screenshots
- Each section: Screenshot + Text explanation
- Quick reference card at the end

