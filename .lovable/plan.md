

## Analysis: Why retailer-photos compression may not be working

### What I found

**All upload paths DO call `compressImageForUpload`** — there are 4 upload points across 3 files (`AddRetailer.tsx`, `AddRetailerInlineToBeat.tsx`, `RetailManagement.tsx`), and every one invokes the compression utility.

**Root cause: The compression function silently skips files in two scenarios:**

1. **Blob type not set** (`src/utils/imageCompression.ts`, line 63):
   ```
   if (!file.type.startsWith('image/')) return file;
   ```
   When `CameraCapture.tsx` produces a blob via `canvas.toBlob`, the type is set. But when a blob arrives from other paths (e.g., `fetch().blob()` or certain mobile browsers with `<input capture="environment">`), the `type` property can be empty or undefined, causing the function to return the original file uncompressed.

2. **Already under 600KB** (`src/utils/imageCompression.ts`, line 68):
   ```
   if (file.size <= maxSize) return file;
   ```
   The `CameraCapture` component already caps the canvas at 1200px and uses JPEG quality 0.5, so its output is often already under 600KB — this path is fine.

3. **Silent catch block** (`src/utils/imageCompression.ts`, line 88):
   If `loadImage()` or canvas operations fail on mobile (memory limits, CORS), the catch block returns the original file with only a `console.error`, so the user never knows compression was skipped.

### Plan

**File: `src/utils/imageCompression.ts`**
- Add a fallback for the `file.type` check: if type is empty/undefined but the file was passed as a Blob (not a known non-image format), treat it as an image and attempt compression
- Add `console.log` statements at each skip/return point so you can diagnose on-device whether compression ran or was bypassed
- Log the before/after file size clearly

**File: `src/pages/AddRetailer.tsx`** (two upload paths — file input ~line 516 and board scan ~line 641)
- Add a log before and after `compressImageForUpload` showing `file.size`, `file.type`, and the compressed result size
- This will confirm on-device whether the issue is the compression utility or the file input itself

**File: `src/components/AddRetailerInlineToBeat.tsx`** (~line 269)
- Same logging around the `compressImageForUpload` call

**File: `src/pages/RetailManagement.tsx`** (~line 263)
- Same logging around the `compressImageForUpload` call

### Technical detail

The key change in `imageCompression.ts`:

```text
BEFORE:
  if (!file.type.startsWith('image/')) return file;

AFTER:
  const isImage = file.type.startsWith('image/') || !file.type || file.type === '';
  if (!isImage) return file;
  // If type is missing, assume image (camera blobs often lack type)
```

This ensures blobs from camera capture that lack a MIME type are still compressed. A `console.warn` will be added when type is missing so it's traceable.

