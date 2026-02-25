

## Plan: Client-Side Image Compression for Storage Uploads

### Problem
Images and files uploaded to `invoices`, `employee-photos`, `attendance-photos`, `visit-photos`, and `retailer-photos` buckets are not compressed. The user wants all uploads compressed by 50% with a maximum file size of 600KB.

### Approach
Create a shared utility function `compressImageFile` that compresses any image (File or Blob) using an HTML Canvas before upload. Then integrate it at every upload point for the 5 target buckets. For PDFs (invoices bucket), compression won't apply since Canvas only handles images — PDFs will be left as-is.

### Technical Details

#### 1. New Utility: `src/utils/imageCompression.ts`

A single reusable function that:
- Takes a `Blob` or `File` input
- Draws it onto a Canvas at 50% reduced dimensions (width/height scaled by ~0.7 each, yielding ~50% pixel reduction)
- Exports as JPEG with iteratively lowered quality until under 600KB
- Returns the compressed Blob
- Skips non-image files (e.g., PDFs) and returns them unchanged

```text
compressImageForUpload(file: Blob | File, options?)
  → If not image type, return as-is
  → Load into Image element
  → Scale dimensions down (max 1200px wide)
  → Draw to canvas
  → Export JPEG starting at quality 0.7, reduce until ≤ 600KB
  → Return compressed Blob
```

#### 2. Integration Points (8 files, ~12 upload calls)

Each file below has upload calls that will be wrapped with the compression utility before the `supabase.storage.upload()` call:

| File | Bucket | Upload Type |
|------|--------|-------------|
| `src/components/ProfilePictureUpload.tsx` | employee-photos | File input |
| `src/components/ProfileSetupModal.tsx` | employee-photos | Camera blob |
| `src/components/profile/CompactProfilePhoto.tsx` | employee-photos | File input |
| `src/components/BaselinePhotoManagement.tsx` | employee-photos | File input |
| `src/components/CameraCapture.tsx` | (used for attendance/profile) | Camera capture blob — reduce JPEG quality to 0.5 and cap canvas size |
| `src/components/VisitCard.tsx` | visit-photos | Camera blob |
| `src/pages/AddRetailer.tsx` | retailer-photos | File + Camera |
| `src/pages/RetailManagement.tsx` | retailer-photos | Camera blob |
| `src/components/AddRetailerInlineToBeat.tsx` | retailer-photos | File + Camera |
| `src/pages/Cart.tsx` | invoices | PDF — skip (not an image) |
| `src/components/VisitInvoicePDFGenerator.tsx` | invoices | PDF — skip |

#### 3. Changes Summary

- **Create** `src/utils/imageCompression.ts` — the shared compression utility
- **Edit 9 files** — add `import { compressImageForUpload } from '@/utils/imageCompression'` and wrap blobs/files through it before every `.upload()` call to the 5 target buckets
- **CameraCapture.tsx** — reduce default JPEG quality from 0.95 to 0.5 and cap canvas dimensions at 1200px to produce smaller blobs at source

#### 4. Compression Strategy

```text
1. If file is not image/* → return unchanged (handles PDFs)
2. Load image into HTMLImageElement
3. Calculate scaled dimensions:
   - Max width: 1200px, max height: 1200px
   - Maintain aspect ratio
4. Draw to offscreen canvas at scaled size
5. Export as JPEG starting at quality 0.6
6. If result > 600KB, retry at quality 0.4, then 0.3
7. Return compressed blob (guaranteed ≤ 600KB for typical photos)
```

No database changes required — this is purely a client-side optimization.

