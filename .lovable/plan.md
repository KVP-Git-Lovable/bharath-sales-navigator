
# Private Storage Buckets — Migration Status

## ✅ Completed

### Infrastructure
- `src/utils/storageUtils.ts` — `getSignedStorageUrl()`, `parseStorageUrl()`, URL caching
- `src/hooks/useSignedUrl.ts` — `useSignedUrl()` and `useSignedUrls()` React hooks
- `src/components/ui/signed-image.tsx` — `<SignedAvatarImage>` and `<SignedImage>` drop-in replacements

### Fixed Files (upload + display)
- `src/pages/Attendance.tsx` — face verification now uses signed URLs for both baseline & attendance photos
- `src/components/AttendanceDetailModal.tsx` — baseline + attendance photo display via `useSignedUrl`
- `src/components/profile/CompactProfilePhoto.tsx` — signed URL for avatar display
- `src/components/BaselinePhotoManagement.tsx` — signed URL for avatar display
- `src/components/ProfileSetupModal.tsx` — signed URL for avatar display
- `src/components/ProfilePictureUpload.tsx` — signed URL for avatar display
- `src/components/invoice/HeaderBrandingSettings.tsx` — signed URL for logo display
- `src/components/invoice/CompanySettings.tsx` — signed URL for logo + QR display
- `src/components/distributor/DistributorCompanyProfile.tsx` — signed URL for logo + QR display
- `src/components/CompetitionDataForm.tsx` — stores paths instead of public URLs for photos/voice notes

## 🔲 Remaining — Profile Picture Display (~12 files)

These files render `profile_picture_url` directly in `<AvatarImage src={...}>` or `<img src={...}>`.
Replace `<AvatarImage>` with `<SignedAvatarImage>` from `@/components/ui/signed-image` (or use `useSignedUrl` hook).

- `src/pages/Employee360.tsx` (3 avatar usages)
- `src/pages/Operations.tsx` (1 img usage)
- `src/pages/EmployeeOnboarding.tsx` (1 img usage)
- `src/pages/admin/HierarchyTargets.tsx` (1 avatar usage)
- `src/pages/Index.tsx` (sidebar avatar)
- `src/components/profile/InstagramSocialFeed.tsx` (1 avatar usage)
- `src/components/profile/FollowersFollowingCard.tsx` (1 avatar usage)
- `src/components/profile/social/FollowersFollowingModal.tsx` (1 avatar usage)
- `src/components/profile/social/TeamMemberProfileModal.tsx` (1 avatar usage)
- `src/components/security/UserObjectPermissions.tsx` (2 avatar usages)
- `src/components/admin/target-config/ApplyToUsersStep.tsx` (2 avatar usages)
- `src/components/admin/AssignTargetsTab.tsx` (1 avatar usage)
- `src/components/admin/AllocationSummaryTable.tsx` (1 avatar usage)

### Pattern to apply in each file:
```tsx
// Replace:
import { AvatarImage } from "@/components/ui/avatar";
<AvatarImage src={user.profile_picture_url} />

// With:
import { SignedAvatarImage } from "@/components/ui/signed-image";
<SignedAvatarImage src={user.profile_picture_url} />
```

## 🔲 Remaining — Other Buckets

- `src/pages/AddRetailer.tsx` — `retailer-photos` bucket (getPublicUrl)
- `src/components/ImageMeasurement.tsx` — `branding-photos` bucket
- `src/pages/EmployeeOnboarding.tsx` — `employee-docs` bucket
- `src/pages/DeliveryRun.tsx` — `delivery-proofs` bucket
- `src/pages/Cart.tsx` — `expense-bills`, `invoices` buckets
- `src/components/VisitInvoicePDFGenerator.tsx` — `invoices` bucket
- `src/components/RetailerDetailModal.tsx` — `invoices` bucket
- `src/components/ProductManagement.tsx` — `product-photos` bucket
- `src/components/invoice/InvoiceTemplateSelector.tsx` — `invoice-templates` bucket
- `src/components/profile/about/OnboardingChecklistSection.tsx` — `user-attachments` bucket

These additional buckets may also need fixing if they are made private.
