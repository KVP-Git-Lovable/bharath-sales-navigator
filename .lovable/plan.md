

# Impact Analysis: Making Storage Buckets Private

## Summary

Changing these 6 buckets from public to private **will break multiple features** across the app. The core issue is that the code uses `getPublicUrl()` which only works for public buckets. Private buckets require `createSignedUrl()` to generate temporary access URLs.

Additionally, existing URLs stored in the database (e.g., `profile_picture_url` in the `profiles` table) are public URLs that will no longer be accessible.

---

## Affected Features by Bucket

### 1. employee-photos -- HIGH IMPACT (breaks profile pictures app-wide)

**What breaks:**
- Profile pictures everywhere (sidebar, leaderboard, admin dashboard, employee 360, attendance pages)
- Profile photo upload flow stores a public URL in `profiles.profile_picture_url` -- that URL now returns 403

**Files to fix (upload flow -- switch to signed URLs):**
- `src/components/ProfilePictureUpload.tsx`
- `src/components/profile/CompactProfilePhoto.tsx`
- `src/components/BaselinePhotoManagement.tsx`
- `src/components/ProfileSetupModal.tsx`

**Files to fix (display -- need signed URL generation):**
- Every component that renders `profile_picture_url` from the profiles table (47+ files reference this field)

### 2. attendance-photos -- HIGH IMPACT (breaks attendance and face verification)

**What breaks:**
- Check-in/check-out photo display in admin monitoring
- Face verification during attendance marking (the photo URL sent to the edge function is inaccessible)

**Files to fix:**
- `src/pages/Attendance.tsx` -- uses `getPublicUrl` for face verification
- `src/components/AttendanceDetailModal.tsx` -- displays check-in photo
- `src/components/LiveAttendanceMonitoring.tsx` -- displays check-in photos in monitoring grid

### 3. company-assets -- MEDIUM IMPACT (breaks invoice branding)

**What breaks:**
- Company logo on invoices won't render
- Company signature on invoices won't render
- Distributor company logos won't render

**Files to fix:**
- `src/components/invoice/HeaderBrandingSettings.tsx`
- `src/components/invoice/CompanySettings.tsx`
- `src/components/distributor/DistributorCompanyProfile.tsx`

### 4. visits (storage bucket) -- MEDIUM IMPACT (breaks competition data photos)

**What breaks:**
- Competition product photos and shelf photos uploaded during visits

**Files to fix:**
- `src/components/CompetitionDataForm.tsx`

### 5. visit-photos -- LOW IMPACT (already mostly fixed)

- `Operations.tsx` already uses `createSignedUrl()` -- this will continue working
- Any old URLs stored directly in the database as public URLs will be broken

### 6. avatars -- NO IMPACT

- Not used anywhere in the application code

---

## Required Fix Strategy

### Approach: Create a signed URL utility + update all affected components

**Step 1: Create a utility function** for generating signed URLs from storage paths

```text
src/utils/storageUtils.ts
- getSignedUrl(bucket, path, expiresIn) -- wrapper around createSignedUrl
- Handles both full URLs (extracting path) and relative paths
- Caches signed URLs briefly to avoid excessive API calls
```

**Step 2: Change upload flows** -- Store the file path (not full public URL) in the database, then generate signed URLs on demand when displaying

**Step 3: Update display components** -- Replace direct URL usage with signed URL generation via the utility. This requires converting many components to use async URL resolution with loading states.

**Step 4: Fix face verification** -- Update `Attendance.tsx` to pass a signed URL (or the raw file path) to the face verification edge function, and update the edge function to handle private bucket access.

**Step 5: Handle existing data** -- Write a migration or utility to convert existing full public URLs stored in the database to relative storage paths.

---

## Recommendation

This is a significant change affecting 15+ files and the face verification edge function. The safest approach would be:

1. Keep `employee-photos` and `attendance-photos` public (they are the most widely used and critical for face verification)
2. Make `visits`, `visit-photos`, `company-assets` private with signed URL fixes
3. `avatars` can stay private as it's unused

Alternatively, if all must be private, the full fix involves updating ~15 component files, 1 edge function, creating a signed URL utility, and migrating existing stored URLs.

