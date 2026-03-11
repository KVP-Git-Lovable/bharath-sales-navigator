

# Fix ₹ Symbol in PDF — Embed Unicode Font

## Problem
jsPDF's default Helvetica font lacks the ₹ glyph. The current workaround uses "Rs." which is not ideal.

## Solution
Fetch **Noto Sans Regular** `.ttf` at PDF generation time from Google Fonts CDN, convert to base64 in-browser, and register it with jsPDF. This avoids bundling a large base64 font file in the source code.

## Changes — `src/components/analytics/SupervisorReport.tsx`

### Inside `handleDownloadPDF` (after creating the `doc` instance, ~line 1514):

1. **Fetch font from CDN** — use `fetch()` to download `NotoSans-Regular.ttf` from Google Fonts static CDN
2. **Convert to base64** — use `ArrayBuffer` → base64 conversion
3. **Register with jsPDF** — `doc.addFileToVFS()`, `doc.addFont()`, `doc.setFont('NotoSans')`
4. **Revert `fmtCurrency`** back to using `₹` symbol (line 1521)
5. **Replace all `doc.setFont('helvetica', ...)` calls** inside `handleDownloadPDF` with `doc.setFont('NotoSans', ...)`

### Font URL
```
https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf
```
Or the static variant: `https://fonts.gstatic.com/s/notosans/v36/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.ttf`

### Key code pattern
```ts
// Fetch and register Noto Sans font for ₹ support
const fontUrl = 'https://fonts.gstatic.com/s/notosans/v36/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.ttf';
const fontResponse = await fetch(fontUrl);
const fontBuffer = await fontResponse.arrayBuffer();
const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontBuffer)));
doc.addFileToVFS('NotoSans-Regular.ttf', fontBase64);
doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
// Also register bold variant or fake it
doc.setFont('NotoSans', 'normal');
```

### Bold handling
Since we only fetch one weight, bold text will use the same font file. We register it twice:
```ts
doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'bold'); // same file, jsPDF will use it for bold calls
```
This means "bold" won't look visually bolder, but all text renders correctly. Alternatively, we can fetch the bold variant too (second fetch).

**Recommended**: Fetch both regular and bold variants for proper visual weight.

## Scope
- 1 file modified: `SupervisorReport.tsx`
- ~15 lines added (font loading), ~20 lines updated (helvetica → NotoSans)
- No new dependencies

