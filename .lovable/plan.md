

# Harden Storage Bucket Policies: company-assets & visit-photos

## Current State (Vulnerable)

Both buckets have overly permissive policies that were likely overwritten after the original secure migrations:

### company-assets -- Any authenticated user can write
| Operation | Current Policy | Risk |
|-----------|---------------|------|
| SELECT | Anyone (public role) | Acceptable for logos/branding |
| INSERT | Any authenticated user | **Any user can upload files** |
| UPDATE | Any authenticated user | **Any user can overwrite logos** |
| DELETE | Any authenticated user | **Any user can delete company assets** |

### visit-photos -- Any authenticated user can delete any photo
| Operation | Current Policy | Risk |
|-----------|---------------|------|
| SELECT | Any authenticated user | Acceptable (should be owner+admin but low risk) |
| INSERT | Any authenticated user | Should be owner-folder only |
| UPDATE | Any authenticated user | Should be owner-folder only |
| DELETE | Any authenticated user | **Any user can delete anyone's visit photos** |

---

## Fix

### company-assets: Restrict INSERT, UPDATE, DELETE to admin role only

Drop the 3 permissive write policies and replace them with admin-only policies using the existing `has_role()` function. The SELECT policy stays as-is (logos need to be viewable).

### visit-photos: Restrict DELETE to owner OR admin

Drop all 4 permissive policies and replace them with properly scoped ones:
- **SELECT**: Owner folder OR admin
- **INSERT**: Owner folder only
- **UPDATE**: Owner folder only
- **DELETE**: Owner folder OR admin

Folder ownership is enforced by checking `auth.uid()::text = (storage.foldername(name))[1]`, which matches the existing upload pattern where files are stored under `{user_id}/filename`.

---

## Technical Details -- SQL Migration

```sql
-- ========================================
-- COMPANY-ASSETS: Admin-only writes
-- ========================================

-- Drop permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;

-- Replace with admin-only
CREATE POLICY "Admins can upload company assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update company assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete company assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- ========================================
-- VISIT-PHOTOS: Owner + Admin scoping
-- ========================================

-- Drop permissive policies
DROP POLICY IF EXISTS "Users can view visit photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload visit photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update visit photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete visit photos" ON storage.objects;

-- SELECT: Owner folder OR admin
CREATE POLICY "Owner or admin can view visit photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'visit-photos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- INSERT: Owner folder only
CREATE POLICY "Owner can upload visit photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'visit-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE: Owner folder only
CREATE POLICY "Owner can update visit photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'visit-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE: Owner folder OR admin
CREATE POLICY "Owner or admin can delete visit photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'visit-photos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
```

## App Impact

- **company-assets**: Non-admin users (e.g., distributors) who currently upload logos via `DistributorCompanyProfile.tsx` or `CompanySettings.tsx` will get permission errors. If distributors need to upload their own logos, we can add a "moderator" check or a distributor-specific policy.
- **visit-photos**: No app-side changes needed. Upload and display flows already use the `{user_id}/` folder pattern. Only DELETE is relaxed to include admins.

## Consideration

If distributor users (non-admin) need to upload logos to `company-assets`, we would need to either:
1. Add a subfolder pattern (e.g., `distributor-logos/{distributor_id}/`) with a distributor-ownership policy
2. Or grant moderator role write access

This can be addressed as a follow-up if needed.
