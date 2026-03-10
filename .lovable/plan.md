

# Executive Sales Report PDF Redesign

## Overview
Transform the current plain-text PDF export into a professional executive sales report with colored headers, KPI cards, visual charts, and styled insight boxes — all using jsPDF drawing primitives and jspdf-autotable.

## What Changes

### File: `src/components/analytics/SupervisorReport.tsx`
Replace `handleDownloadPDF` (lines 1491-1716) with a redesigned version:

**1. Orientation & Layout**
- Switch to landscape A4 (`new jsPDF('l', 'pt', 'a4')`) for wider tables and charts
- Increase margins to 30pt for breathing room

**2. Color Palette Constants**
```
Primary: [31, 78, 121]   (#1F4E79)
Secondary: [46, 134, 193] (#2E86C1)
Accent: [39, 174, 96]     (#27AE60)
Warning: [243, 156, 18]   (#F39C12)
```

**3. Colored Header Banner**
- Draw a full-width filled rectangle (Primary color, ~60pt tall) at the top
- White text: "Sales Analytics Report" (bold, 22pt)
- Sub-line: date range and filter info in white/light text
- Company branding area

**4. KPI Cards (replaces Business Summary table)**
- Draw 5 rounded rectangles in a row across the page
- Each card: colored top border (2pt accent line), metric label (small gray), value (large bold)
- Cards: Total Revenue, Total Quantity (KG), Orders, Retailers, Pending Payments
- Use `doc.roundedRect()` + `doc.text()` — no table needed

**5. Sales Leaderboard Table Enhancements**
- Add "Rank" column with medal icons (gold/silver/bronze colored circles for top 3)
- Add "Revenue Share %" column: `(user.total_order_value / totalRevenue * 100).toFixed(1)%`
- Top 3 rows get a light highlight background via `willDrawCell` hook
- Sort by order value descending

**6. Revenue by SKU Table Enhancements**
- Sort `skuDataForSummary` by revenue descending before rendering
- Add "% Contribution" column: `(sku.revenue / totalSkuRevenue * 100).toFixed(1)%`
- Keep existing columns + new % column

**7. Visual Charts (drawn with jsPDF primitives)**
- **Revenue Distribution by User (Pie-like):** Draw a horizontal stacked bar showing each user's share with different colors + legend. Pure jsPDF rects — no external charting lib needed in PDF.
- **Top 10 SKU Revenue Bar Chart:** Draw horizontal bars for top 10 SKUs with labels and values. Each bar is a filled rectangle proportional to max revenue.

**8. Productivity Section with Visual Bars**
- After the text columns (User, Productive, Total, %), add a drawn progress bar in the last column
- Use `willDrawCell` hook on the percentage column to draw a filled rect inside the cell proportional to the percentage value (green fill on gray background)

**9. AI Insights as Colored Info Boxes**
- Replace the AI Insights table with individually drawn rounded rectangles
- Left border colored by type: green (opportunity), blue (insight), orange (warning), red (alert)
- Title bold, description in normal weight inside each box
- Spaced vertically with auto page-break checks

**10. Footer**
- Thin line separator + page numbers right-aligned
- "Generated on [date]" left-aligned
- Consistent across all pages

## Technical Approach
- All visual elements use jsPDF drawing primitives (`rect`, `roundedRect`, `setFillColor`, `text`, `line`)
- Charts are simple geometric shapes (horizontal bars, stacked bars) — no canvas/image embedding needed
- `willDrawCell` callback in autoTable for conditional row highlighting and inline progress bars
- Auto page-break logic: check `y + sectionHeight > pageHeight - margin` before each section, call `doc.addPage()` if needed

## Scope
- 1 file modified: `SupervisorReport.tsx` (lines 1491-1716 replaced with ~350 lines)
- No new dependencies needed

