

## Fix: Make `company-assets` Bucket Public

### Why This Is Safe

The `company-assets` bucket contains **only company branding assets** (logos, header images) that are intended to be visible across the entire application. Making this single bucket public:

- Eliminates the need for signed URLs for logos everywhere
- Removes the 1-hour URL expiry problem (cached signed URLs expire, causing broken images)
- Is the standard approach for branding/public assets
- All other buckets (employee-photos, attendance-photos, visit-photos, avatars, visits) remain **private**

### Changes

**1. SQL Migration -- Make `company-assets` bucket public**

```sql
UPDATE storage.buckets SET public = true WHERE id = 'company-assets';
```

This single change fixes the broken header logo immediately because the existing code already generates public URLs via `getPublicUrl()` -- those URLs will now work.

**2. `src/hooks/useCompanyData.ts` -- Remove unnecessary signing logic**

The previous fix added `getSignedStorageUrl` calls for the logo. Since the bucket will be public, revert this to use the raw URL directly (simpler, no expiry issues):

- Remove the `getSignedStorageUrl` and `isStorageUrl` imports
- Use `newHeaderLogo` directly instead of resolving it through signing
- This eliminates a network call and the 1-hour cache expiry problem

**3. `src/components/InvoiceGenerator.tsx` -- Remove signing for logo fetch**

Revert the `getSignedStorageUrl` call added previously. The public URL will work directly with `fetch()`.

**4. `src/components/VanStockManagement.tsx` -- Remove signing for logo fetch**

Same as above -- revert to using the raw public URL for PDF logo generation.

### What Stays Private

| Bucket | Status | Reason |
|--------|--------|--------|
| company-assets | **Public** (change) | Branding logos visible to all users |
| employee-photos | Private | Personal employee data |
| attendance-photos | Private | Sensitive attendance records |
| visit-photos | Private | Field visit evidence |
| avatars | Private | User profile pictures |
| visits | Private | Visit documents |

### Prerequisite

You must first fix the `package-lock.json` file (it has invalid JSON). Delete it and let it regenerate, or manually fix the formatting errors. The build will not work until this is resolved.

### Files to Change

1. SQL migration: `UPDATE storage.buckets SET public = true WHERE id = 'company-assets'`
2. `src/hooks/useCompanyData.ts` -- simplify by removing signing logic
3. `src/components/InvoiceGenerator.tsx` -- remove signing for logo
4. `src/components/VanStockManagement.tsx` -- remove signing for logo

