

## Invoice & Retailer Photo Compression

### 1. Invoice PDF Size Reduction (Target: ≤ 50 KB)

**Root cause**: Logo and QR code are embedded as full-resolution base64 images without compression.

**Changes to `src/utils/invoiceGenerator.ts`**:
- Change constructor to `new jsPDF({ compress: true })` (line 234) — enables stream compression for all content
- Add a helper `compressImageForPDF(blobOrUrl, maxDim, quality)` that fetches an image, draws it on a canvas at reduced dimensions, and returns a JPEG base64 data URL
- Before embedding the **logo** (lines 246-277): compress to max **150px**, JPEG quality **0.3**
- Before embedding the **QR code** (lines 745-775): compress to max **100px**, JPEG quality **0.3**
- After `doc.output('blob')`, add a size guard: if blob > 50 KB, log a warning (re-generation at lower quality is optional since aggressive initial compression should suffice)

**New helper** (added at top of the file):
```ts
async function compressImageForPDF(
  input: string | Blob, maxDim: number, quality: number
): Promise<string> {
  // Fetch if URL string, create Image, draw to canvas at maxDim, 
  // export as JPEG base64 data URL
}
```

### 2. Retailer Photos Compression (Target: 25% of original)

**Changes to `src/utils/imageCompression.ts`**:
- Add `compressToTargetSize(input, targetRatio, maxDimension)` — iteratively reduces JPEG quality from 0.5 down to 0.1 (step 0.1) until output ≤ `targetRatio × originalSize`, with floor quality of 0.1

**Upload point changes** (replace `compressImageFile(file/blob)` with `compressToTargetSize(file/blob, 0.25, 1200)`):

| File | Line(s) | Current call |
|------|---------|-------------|
| `src/pages/AddRetailer.tsx` | 516, 642 | `compressImageFile(file)` / `compressImageFile(blob)` |
| `src/components/AddRetailerInlineToBeat.tsx` | 269 | `compressImageFile(file)` |
| `src/pages/RetailManagement.tsx` | 263 | `compressImageFile(blob)` |

### Files Modified

| File | What changes |
|------|-------------|
| `src/utils/invoiceGenerator.ts` | `compress: true` in jsPDF; add `compressImageForPDF` helper; compress logo & QR before embedding; post-generation size guard |
| `src/utils/imageCompression.ts` | Add `compressToTargetSize()` with iterative quality reduction |
| `src/pages/AddRetailer.tsx` | Use `compressToTargetSize(file, 0.25, 1200)` at 2 upload points |
| `src/components/AddRetailerInlineToBeat.tsx` | Same replacement at 1 upload point |
| `src/pages/RetailManagement.tsx` | Same replacement at 1 upload point |

