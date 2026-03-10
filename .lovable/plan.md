

# Plan: Data-Driven PDF Export for Analytics

## Overview
Replace the `html2canvas` screenshot-based PDF with a structured, data-driven PDF using `jsPDF` + `jspdf-autotable`. The new PDF will include complete datasets regardless of UI scroll/filter state.

## What Changes

### File: `src/components/analytics/SupervisorReport.tsx`

**1. Remove html2canvas approach**
- Remove `reportContentRef` (line 65) and its `ref={reportContentRef}` usage in JSX
- Remove `html2canvas` dynamic import
- Keep `downloadingPDF` state and the Download button

**2. Replace `handleDownloadPDF` (lines 1489-1583) with data-driven generation**

The new function will:

a. **Use already-loaded state** for sections that are pre-fetched:
   - `businessSummary` — total beats, retailers, orders, revenue, pending, order value, quantity
   - `summaryData` — all users' order value + KG rankings
   - `skuDataForSummary` — SKU revenue data (loaded via `onDataLoaded` callback)
   - `productivityDataForSummary` — productivity per user (loaded via `onDataLoaded` callback)
   - `aiInsights` — computed memo

b. **Fetch fresh data** for sections not stored in parent state:
   - **Attendance & Market Hours**: Query `attendance` + `retailer_visit_logs` tables for all `selectedUserIds` in `dateRange` (same logic as `AttendanceMarketHoursSection.fetchData`)
   - Uses the same aggregation pattern: group by user, calculate avg working hours and avg retailer hours

c. **Build PDF sections** using `jsPDF` + `autoTable`:
   1. **Header** — Report title, date range, filter info
   2. **Business Summary** — Key-value grid (6 metrics)
   3. **Order Summary by User** — Full table from `summaryData` (Rank, Name, KG, Order Value)
   4. **Revenue by SKU** — Table from `skuDataForSummary` (Product, Unit, Qty, Revenue) with KG conversion
   5. **Productivity Summary** — Table from `productivityDataForSummary` (User, Productive, Total, %)
   6. **Attendance & Market Hours** — Table from fresh fetch (User, Avg Working Hrs, Avg Retailer Hrs, Days)
   7. **AI Insights** — Text list from `aiInsights` memo
   8. **Footer** — Page numbers on each page

**3. Formatting details:**
- A4 portrait, 20pt margins
- Indian number formatting (en-IN) for currency
- KG conversion for gram quantities
- Alternating row colors in tables
- Auto page breaks via `autoTable`

### No other files changed
Child components remain untouched. The PDF generation is fully self-contained in the parent's `handleDownloadPDF`.

## Scope
- 1 file modified: `SupervisorReport.tsx`
- ~150 lines replaced (the `handleDownloadPDF` function + cleanup of `reportContentRef`)
- Dependencies `jspdf` and `jspdf-autotable` are already installed

