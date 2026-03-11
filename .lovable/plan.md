

# Fix: Use Full Static Noto Sans TTFs from GitHub

## Why it's still broken
The `fonts.gstatic.com` URLs serve **web-optimized subsets** of Noto Sans — these fonts may:
1. Not include the ₹ (U+20B9) glyph at all (subset exclusion)
2. Have simplified/malformed font tables (causing the "bad /BBox" error in Adobe)

These URLs are designed for CSS `@font-face` use in browsers, not for embedding in PDFs via jsPDF.

## Fix
Switch to the **full static TTF files** from Google's official fonts GitHub repository (`/static/` subdirectory), which contain all glyphs and proper font tables:

**File:** `src/components/analytics/SupervisorReport.tsx` — lines 1518-1519 only.

Replace URLs with:
```
Regular: https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/static/NotoSans-Regular.ttf
Bold:    https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/static/NotoSans-Bold.ttf
```

No other changes needed. Everything else (font registration, setFont calls, fmtCurrency) stays the same.

