

# Fix: KG Display and ₹ Symbol in PDF Report

## Two Bugs Found

### Bug 1: KG Showing as 0.0
The `fmtKG` function (line 1541) divides by 1000, treating the input as grams. But `total_kg` is already in kilograms (calculated at line 448). So 8.5 KG / 1000 = 0.0 KG.

**Fix**: Change `fmtKG` to not divide by 1000, or replace usages with direct formatting: `u.total_kg.toFixed(1) + ' KG'`

### Bug 2: ₹ Symbol Not Rendering in Tables
`jspdf-autotable` does not automatically inherit the document font. Each `autoTable` call needs `font: 'NotoSans'` in its `styles` config. Currently none of the 4+ `autoTable` calls specify the font, so they fall back to Helvetica which lacks ₹.

Additionally, the GitHub raw URL (`raw.githubusercontent.com/google/fonts/main/ofl/notosans/static/...`) may not exist — Google Fonts repo restructured and static TTFs may be at a different path. We should bundle the fonts locally in `public/fonts/` for reliability, or use a verified CDN URL.

**Recommended approach**: Use `fontsource` CDN which hosts verified static TTFs:
```
Regular: https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-400-normal.ttf  
Bold: https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-700-normal.ttf
```

## Changes — `src/components/analytics/SupervisorReport.tsx` only

1. **Line 1541** — Fix `fmtKG`: change from `(grams / 1000).toFixed(1) + ' KG'` to `grams.toFixed(1) + ' KG'` (since input is already KG)

2. **Lines 1518-1519** — Update font URLs to verified CDN:
   ```
   https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-400-normal.ttf
   https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-700-normal.ttf
   ```

3. **All `autoTable` calls** (~4 occurrences) — Add `font: 'NotoSans'` to the `styles` object so tables use the registered font:
   ```ts
   styles: { font: 'NotoSans', fontSize: 8, ... }
   ```

No other files or modules are touched.

