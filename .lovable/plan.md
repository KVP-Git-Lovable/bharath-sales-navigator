

# Plan: Data-Driven PDF Export for Analytics & Insights

## Problem
The current "Download PDF" in the Analytics module uses `html2canvas` to screenshot the UI. This means:
- Only visible/scrolled content is captured
- Data is limited to what's rendered on screen (e.g. Top 5 filter, scroll-limited tables)
- Requires UI interaction (clicking users/beats) to see detail data
- Quality degrades with large content

## Solution
Replace the screenshot-based approach with a **jsPDF + jspdf-autotable** data-driven PDF that fetches and includes the full dataset from backend APIs, respecting applied filters.

## Technical Changes

### File: `src/components/analytics/SupervisorReport.tsx`

**1. Replace `handleDownloadPDF` function (lines 1489-1583)**

Remove all `html2canvas` logic. Replace with a new function that:

- Uses `jsPDF` + `autoTable` (already installed as dependencies)
- Removes the `reportContentRef` and `html2canvas` import (no longer needed)
- Fetches full data from backend APIs using the same queries the components use, but without UI limits

**2. New PDF generation logic:**

The new `handleDownloadPDF` will:

a. **Header**: Report title, date range, selected user filter info

b. **Section 1 — Business Summary**: Total Order Value, Total Quantity (KG), Total Beats, Retailers, Orders, Revenue, Pending Payments (from `businessSummary` state — already loaded)

c. **Section 2 — Order Summary by User** (full table, all users): Uses `summaryData` state (already contains all users, not just top/bottom 5). Table columns: Rank, User Name, Total KG, Total Order Value

d. **Section 3 — Revenue by SKU**: Fetch full SKU data using same RPC `get_product_revenue_performance` for all selected users. Table columns: Product, Unit, Qty Sold, Revenue

e. **Section 4 — Attendance & Market Hours**: Fetch attendance data for all selected users in date range. Table columns: User, Avg Working Hours, Avg Retailer Hours, Days

f. **Section 5 — Productivity Summary**: Fetch visits data for all selected users. Table columns: User, Planned, Productive, Unproductive, Pending, Productivity %

g. **Section 6 — AI Insights**: Use `aiInsights` memo (already computed). Simple text rows.

**3. Data fetching approach:**

- Sections b, c, g: Use already-loaded state (`businessSummary`, `summaryData`, `aiInsights`)
- Sections d, e, f: Fetch fresh data within the PDF handler using the same Supabase queries the child components use (copy the query logic). This ensures full dataset regardless of what's visible on screen.
- All queries respect `selectedUserIds` and `dateRange` filters

**4. Clean up:**
- Remove `reportContentRef` usage
- Remove `html2canvas` dynamic import
- Keep `downloadingPDF` state for loading indicator

### No other files changed
The child components (`RevenueBySKUSection`, `AttendanceMarketHoursSection`, `ProductivitySummarySection`) remain unchanged — they still render the interactive UI. The PDF generation is self-contained in the parent.

## PDF Layout
- A4 portrait, margins 20pt
- Each section starts with a bold heading
- Tables use `autoTable` with alternating row colors
- Summary metrics displayed as a key-value grid at the top
- Page numbers in footer

