

## Bundle Optimization: Fix Mixed-Import Warnings and Reduce Initial Bundle

This plan eliminates all 7 Vite mixed-import warnings and reduces the initial JS bundle (~21.5 MB) by standardizing import patterns across the codebase. It is split into 3 phases, each independently shippable.

---

### Phase 1: Core Modules -- Convert to Static-Only Imports (eliminates 5 warnings)

These are small, essential modules already in the main bundle. The dynamic `import()` calls are pointless (Vite can't split them anyway) and cause warnings. Convert them all to static `import` at the top of the file.

| Module | File with dynamic import | Change |
|--------|------------------------|--------|
| `offlineStorage` | `src/main.tsx` (line 57) | Static import at top |
| `offlineStorage` | `src/components/VanStockManagement.tsx` (lines 315, 405) | Static import at top |
| `offlineStorage` | `src/pages/Cart.tsx` (line 542) | Static import at top |
| `offlineStorage` | `src/pages/OrderEntry.tsx` (lines 315, 488) | Static import at top |
| `crashlytics` | `src/main.tsx` (line 77) | Static import at top |
| `fileDownloader` | `src/main.tsx` (line 68) | Static import at top |
| `myVisitsSnapshot` | `src/pages/MyBeats.tsx` (line 950) | Static import at top |
| `permissions` | `src/hooks/useAuth.tsx` (line 416) | Static import at top |
| `permissions` | `src/pages/Attendance.tsx` (line 283) | Static import at top |

**Files modified: 7** (main.tsx, VanStockManagement.tsx, Cart.tsx, OrderEntry.tsx, MyBeats.tsx, useAuth.tsx, Attendance.tsx)

Each dynamic `await import(...)` call is replaced with the module already imported at the top, and the surrounding `try/catch` or async wrapper is simplified. The function logic stays the same.

---

### Phase 2: Heavy Libraries -- Convert to Dynamic-Only Imports (eliminates 2 warnings)

`jspdf` (~150 KB), `jspdf-autotable`, and `xlsx` (~200 KB) are currently statically imported in many files but only used inside button click handlers. Move them to dynamic `import()` inside those handlers so they only load when the user actually clicks "Download PDF" or "Export Excel".

**jspdf + jspdf-autotable** -- Remove static imports, use dynamic in handler:

| File | Change |
|------|--------|
| `src/components/BeatRetailerExport.tsx` | Dynamic import inside export function |
| `src/components/ReportGenerator.tsx` | Dynamic import inside PDF generation |
| `src/components/TimelineView.tsx` | Dynamic import inside export handler |
| `src/components/VanStockManagement.tsx` | Dynamic import inside export handler |
| `src/components/VanStockView.tsx` | Dynamic import inside export handler |
| `src/components/InvoiceGenerator.tsx` | Dynamic import inside generation function |
| `src/components/invoice/InvoiceTemplate1.tsx` | Dynamic import inside download handler |
| `src/components/invoice/InvoiceTemplate2.tsx` | Dynamic import inside download handler |
| `src/components/invoice/InvoiceTemplate3.tsx` | Dynamic import inside download handler |
| `src/components/pm/GanttChart.tsx` | Dynamic import inside export handler |
| `src/pages/TodaySummary.tsx` | Dynamic import inside export handler |
| `src/pages/JointSalesAnalytics.tsx` | Dynamic import inside export handler |
| `src/utils/invoiceGenerator.ts` | Dynamic import inside generation functions |
| `src/utils/implementationPDFGenerator.ts` | Dynamic import inside generation function |
| `src/utils/orderGuideManualGenerator.ts` | Dynamic import inside generation function |
| `src/utils/orderGuideWithScreenshotsPDF.ts` | Dynamic import inside generation function |
| `src/components/analytics/SupervisorReport.tsx` | Already dynamic -- no change needed |

Pattern applied in each file:
```text
BEFORE (top of file):
  import jsPDF from 'jspdf';
  import autoTable from 'jspdf-autotable';

  const exportPDF = () => { const doc = new jsPDF(); ... }

AFTER:
  // No top-level jspdf import

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    ...
  }
```

**xlsx** -- Same pattern for 9 files:

| File | Change |
|------|--------|
| `src/components/BeatRetailerExport.tsx` | Dynamic import inside Excel export |
| `src/components/ReportGenerator.tsx` | Dynamic import inside Excel export |
| `src/components/VanStockManagement.tsx` | Dynamic import inside Excel export |
| `src/components/BeatAllowanceManagement.tsx` | Dynamic import inside export |
| `src/components/BulkImportRetailersModal.tsx` | Dynamic import inside import handler |
| `src/components/ProductivityTracking.tsx` | Dynamic import inside export |
| `src/components/PointsDetailsModal.tsx` | Dynamic import inside export |
| `src/components/competition/CompetitionDataList.tsx` | Dynamic import inside export |
| `src/components/admin/PincodeMasterImport.tsx` | Dynamic import inside import handler |

**invoiceGenerator** -- Convert 5 static imports to dynamic (2 files already use dynamic):

| File | Change |
|------|--------|
| `src/components/RetailerDetailModal.tsx` | Dynamic import inside invoice handler |
| `src/components/VisitInvoicePDFGenerator.tsx` | Dynamic import inside generation handler |
| `src/components/invoice/AllInvoicesList.tsx` | Dynamic import inside download handler |
| `src/components/invoice/InvoiceTemplateSelector.tsx` | Dynamic import inside generation handler |
| `src/components/invoice/InvoicePDFGenerator.tsx` | Dynamic import inside generation handler |

**Files modified in Phase 2: ~25**

---

### Phase 3: Page-Level Lazy Loading in App.tsx

`src/App.tsx` currently statically imports ~160 page components. Split them into:

**Keep static (~20 core workflow pages):** Index, MyVisits, OrderEntry, Cart, MyRetailers, MyBeats, AddRetailer, Attendance, BeatPlanning, CreateBeat, VisitPlanner, VisitDetail, TodaySummary, AddRecords, NotFound, auth pages, CompleteProfile, UserProfile, ResetPassword, ChangePassword.

**Lazy load (~140 remaining pages):** All website/marketing pages, admin pages, analytics, distributor portal, institutional sales, PM module, feature pages, competency, gamification, etc.

```text
// Pattern for lazy pages in App.tsx
const Analytics = lazy(() => import("./pages/Analytics"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
// ... etc

// Wrap all routes in Suspense (already has Suspense in the file)
<Suspense fallback={<LoadingScreen />}>
  <Routes>...</Routes>
</Suspense>
```

**Files modified: 1** (App.tsx)

---

### Summary

| Phase | Files | Warnings Fixed | Bundle Impact |
|-------|-------|----------------|---------------|
| 1: Core static-only | 7 | 5 of 7 | Minimal (modules already in bundle) |
| 2: Heavy dynamic-only | ~25 | 2 of 7 | -350 KB+ from initial load (jspdf + xlsx) |
| 3: Page lazy loading | 1 | 0 | Major: splits ~140 pages into separate chunks |
| **Total** | **~33** | **7 of 7** | **Est. 40-50% smaller initial bundle** |

### Risk Mitigation
- Core offline modules remain static -- offline-first functionality is unaffected
- PDF/Excel export handlers become async -- a brief loading moment on first click (add loading spinner/toast)
- Service Worker precaches lazy chunks via workbox, so APK users still get offline access after first load
- A `<LoadingScreen />` fallback prevents blank screens during lazy page loads

