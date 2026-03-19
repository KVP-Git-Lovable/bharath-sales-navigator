

## Fix: ₹ Symbol Missing in PDF Revenue Values

### Root Cause

The Noto Sans font files fetched for PDF generation use the **`latin`** subset (line 1518-1519 in `SupervisorReport.tsx`):
```
noto-sans@latest/latin-400-normal.ttf
noto-sans@latest/latin-700-normal.ttf
```

The Latin subset does **not** include the ₹ (Rupee) symbol (Unicode U+20B9). The symbol is silently dropped during PDF rendering, resulting in values like `2,55,271` instead of `₹2,55,271`.

### Fix

**File: `src/components/analytics/SupervisorReport.tsx` (lines 1518-1519)**

Change the font subset from `latin` to `unicode` (full character set) which includes the ₹ symbol and all currency symbols:

```
Before:
  noto-sans@latest/latin-400-normal.ttf
  noto-sans@latest/latin-700-normal.ttf

After:
  noto-sans@latest/unicode-400-normal.ttf
  noto-sans@latest/unicode-700-normal.ttf
```

This is a two-line change. No other files need modification -- the `fmtCurrency` function already correctly prepends `₹` to all revenue values.

### Also check: `reportExportUtils.ts`

Verify if the new Generate Report export utility has the same font subset issue and fix it if so.

