
# Fix Profile Photo Display and Upload Failures

## Problem Summary

Two distinct bugs found:

1. **Profile photo not showing in sidebar/navbar** -- The Navbar uses a raw storage URL directly, but the `employee-photos` bucket is private, so the URL returns a 403 error.
2. **"Could not upload photo" error on Add Retailer** -- The image compression utility returns a `Blob` (not a `File`). When uploading a `Blob` to Supabase Storage without specifying `contentType`, the upload fails because Supabase can't determine the MIME type.

Both issues are directly related to the recent storage compression changes.

---

## Fix 1: Navbar Profile Photo (src/components/Navbar.tsx)

**Current code (line 251):**
```typescript
<AvatarImage src={userProfile?.profile_picture_url || ""} />
```

**Fix:** Replace `AvatarImage` with `SignedAvatarImage` (already used in 17+ other files) which resolves private storage URLs to temporary signed URLs.

```typescript
import { SignedAvatarImage } from "@/components/ui/signed-image";
// ...
<SignedAvatarImage src={userProfile?.profile_picture_url || ""} />
```

---

## Fix 2: Add `contentType` to All Compressed Uploads

The `compressImageFile()` function returns a raw `Blob`. While `canvas.toBlob()` sets the MIME type internally, Supabase Storage requires an explicit `contentType` option when the input is a `Blob` (not a `File`). Four upload points need this fix:

### File: src/pages/AddRetailer.tsx -- 2 locations

**Location 1 (~line 520):** Camera capture upload
```typescript
.upload(fileName, compressedFile, {
  cacheControl: '3600',
  upsert: false,
  contentType: 'image/jpeg'  // ADD THIS
});
```

**Location 2 (~line 640):** Board scan upload -- same fix, add `contentType: 'image/jpeg'`.

### File: src/components/AddRetailerInlineToBeat.tsx -- 1 location

**Line ~273:** Camera capture upload -- add `contentType: 'image/jpeg'` to the upload options.

### File: src/pages/RetailManagement.tsx -- 1 location

**Line ~268:** Photo capture upload -- add `contentType: 'image/jpeg'` to the upload options.

### Already correct: src/components/VisitCard.tsx

This file already has `contentType: 'image/jpeg'` (line 1671), so no change needed.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Replace `AvatarImage` with `SignedAvatarImage` for profile photo |
| `src/pages/AddRetailer.tsx` | Add `contentType: 'image/jpeg'` to 2 upload calls |
| `src/components/AddRetailerInlineToBeat.tsx` | Add `contentType: 'image/jpeg'` to 1 upload call |
| `src/pages/RetailManagement.tsx` | Add `contentType: 'image/jpeg'` to 1 upload call |

All changes are minimal, targeted fixes with no risk of side effects.
