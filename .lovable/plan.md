

## Plan: Cap Invoice PDF Size at 500KB

### Problem
Invoice PDFs can exceed 500KB, primarily due to embedded images (company logo and QR code for payment) being included at full resolution without compression.

### Root Cause
In `src/utils/invoiceGenerator.ts`, both the company logo (line 238-274) and QR code (line 735-779) are fetched as raw blobs, converted to base64, and embedded directly into the PDF without any size reduction.

### Approach
Reuse the existing `compressImageForUpload` utility from `src/utils/imageCompression.ts` to compress both images before embedding them into the PDF. Additionally, add a final PDF size check — if the generated PDF still exceeds 500KB, reduce JPEG quality of embedded images further and regenerate.

### Changes

**File: `src/utils/invoiceGenerator.ts`** (single file, two sections)

1. **Import the compression utility** at the top of the file:
   ```ts
   import { compressImageForUpload } from './imageCompression';
   ```

2. **Compress the company logo before embedding** (around lines 238-246):
   - After fetching the logo blob, pass it through `compressImageForUpload` with `{ maxDimension: 400, maxSizeBytes: 80_000 }` (80KB max for a small logo)
   - Then convert the compressed blob to base64 for `addImage`

3. **Compress the QR code before embedding** (around lines 737-743):
   - After fetching the QR code blob, pass it through `compressImageForUpload` with `{ maxDimension: 300, maxSizeBytes: 60_000 }` (60KB max for a small QR image)
   - Then convert the compressed blob to base64 for `addImage`

4. **Final PDF size guard** (before returning on line 807):
   - After `doc.output('blob')`, check if the blob exceeds 500KB
   - If it does, log a warning (the image compression above should prevent this in practice, but this is a safety net)

### Why This Works
- The jsPDF text + tables portion of the PDF is typically under 50KB
- The logo and QR code images account for almost all remaining size
- Compressing both to reasonable maximums (80KB + 60KB) ensures the total PDF stays well under 500KB
- The existing `compressImageForUpload` function already handles dimension scaling and iterative JPEG quality reduction

### No Other Files Need Changes
The `generateTemplate4Invoice` function is the single entry point used by `InvoicePDFGenerator.tsx`, `VisitInvoicePDFGenerator.tsx`, `InvoiceTemplate4.tsx`, and `fetchAndGenerateInvoice`. Fixing it here covers all invoice generation paths.

