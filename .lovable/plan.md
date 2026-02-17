
# Compress Images Before Upload to retailer-photos and visit-photos

## Overview

Create a shared `compressImageFile()` utility that compresses any image (File or Blob) by 50% quality before uploading to Supabase Storage. Apply it at all 5 upload points across 4 files.

## New Utility: `src/utils/imageCompression.ts`

A single reusable function that:
1. Takes a `File` or `Blob` input
2. Draws it onto an HTML Canvas
3. Re-exports as JPEG at 50% quality (`canvas.toBlob(..., 'image/jpeg', 0.5)`)
4. Also caps resolution at 1920px max dimension to further reduce size
5. Returns a compressed `Blob`

```text
Input (3MB photo) --> Canvas resize (max 1920px) --> JPEG @ 50% quality --> Output (~300-500KB)
```

## Files to Modify

### 1. src/pages/AddRetailer.tsx -- 2 upload points

**Line ~516 (camera capture upload):** Compress `file` before uploading to `retailer-photos`.

**Line ~640 (board scan upload):** Compress `blob` before uploading to `retailer-photos`. Note: this already uses `compressImage()` for AI scanning, but the blob uploaded to storage is re-derived from that -- we'll compress it again at upload-quality level.

### 2. src/components/AddRetailerInlineToBeat.tsx -- 1 upload point

**Line ~269 (camera capture upload):** Compress `file` before uploading to `retailer-photos`.

### 3. src/pages/RetailManagement.tsx -- 1 upload point

**Line ~264 (photo capture upload):** Compress `blob` before uploading to `retailer-photos`.

### 4. src/components/VisitCard.tsx -- 1 upload point

**Line ~1668 (check-in/check-out photo):** Compress `photoBlob` before uploading to `visit-photos`.

## Pattern at Each Upload Point

Before:
```typescript
await supabase.storage.from('retailer-photos').upload(fileName, file, { ... });
```

After:
```typescript
import { compressImageFile } from '@/utils/imageCompression';

const compressedFile = await compressImageFile(file);
await supabase.storage.from('retailer-photos').upload(fileName, compressedFile, { ... });
```

## Technical Details

### compressImageFile utility

```typescript
export async function compressImageFile(
  input: File | Blob,
  quality: number = 0.5,
  maxDimension: number = 1920
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate scaled dimensions
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(input);
  });
}
```

### Parameters
- **quality = 0.5**: 50% JPEG quality as requested
- **maxDimension = 1920**: Caps width/height to prevent unnecessarily large images from phone cameras (often 4000px+)

## Application Impact

- **Visual quality**: At 50% JPEG quality + 1920px max, photos remain clear enough for retailer identification and visit verification
- **Storage savings**: Typical phone photos (3-8MB) will compress to 200-600KB -- roughly 80-90% size reduction
- **Performance**: Compression takes ~100-300ms per image on modern devices, which is negligible compared to the upload time saved
- **No breaking changes**: All existing functionality remains identical; only the file size of stored images changes
