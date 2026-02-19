

## Fix: Company Logo Not Displaying (Private Bucket - Signed URL Approach)

### Root Cause

The `company-assets` storage bucket is **private**, but the code stores and uses raw "public" URLs (generated via `getPublicUrl()`). These URLs return 403 for private buckets. The Navbar, InvoiceGenerator, and VanStockManagement all use these raw URLs directly without signing.

### Approach

Sign URLs at the data layer (`useCompanyData`) so all downstream consumers automatically get working URLs. Also patch the two PDF generators that fetch logos independently.

### Changes

**File 1: `src/hooks/useCompanyData.ts`**

- Import `getSignedStorageUrl` from `@/utils/storageUtils`
- After fetching company data, sign the logo URL before storing in state and cache
- This fixes the Navbar and any other consumer of `useCompanyData()`

```text
// After line 73 (where newHeaderLogo is computed):
const newHeaderLogo = data.header_logo_url || data.logo_url || null;

// ADD: resolve to signed URL
const resolvedLogo = newHeaderLogo
  ? await getSignedStorageUrl(newHeaderLogo)
  : null;

// Use resolvedLogo instead of newHeaderLogo for state + cache
setHeaderLogo(resolvedLogo);
```

The localStorage cache will store signed URLs (valid ~1 hour). On next app load, the cached signed URL renders immediately; if expired, `fetchCompany()` runs and refreshes it.

**File 2: `src/components/InvoiceGenerator.tsx` (line 103)**

Sign the URL before fetching for PDF generation:

```text
// Before:
const response = await fetch(company.logo_url);

// After:
import { getSignedStorageUrl } from "@/utils/storageUtils";
const signedLogoUrl = await getSignedStorageUrl(company.logo_url);
const response = await fetch(signedLogoUrl);
```

**File 3: `src/components/VanStockManagement.tsx` (line 1310)**

Same pattern for PDF logo fetch:

```text
// Before:
const logoResponse = await fetch(company.logo_url);

// After:
import { getSignedStorageUrl } from "@/utils/storageUtils";
const signedLogoUrl = await getSignedStorageUrl(company.logo_url);
const logoResponse = await fetch(signedLogoUrl);
```

### Why This Works for Multi-Tenant

- Bucket stays **private** -- no unauthorized cross-tenant access
- Signed URLs are short-lived (1 hour) and cached in-memory by `storageUtils.ts`
- RLS policies on `storage.objects` enforce per-tenant access
- No public exposure of any asset
- Works automatically for all future clients

### Impact Summary

| Consumer | Current | After Fix |
|----------|---------|-----------|
| Navbar header logo | Broken (raw URL, 403) | Works (signed via `useCompanyData`) |
| HeaderBrandingSettings preview | Already works (`useSignedUrl`) | No change |
| InvoiceGenerator PDF logo | Broken (raw fetch, 403) | Works (signed before fetch) |
| VanStockManagement PDF logo | Broken (raw fetch, 403) | Works (signed before fetch) |

### Files to Change

1. `src/hooks/useCompanyData.ts` -- sign logo URL before returning
2. `src/components/InvoiceGenerator.tsx` -- sign before PDF fetch
3. `src/components/VanStockManagement.tsx` -- sign before PDF fetch

No database migration needed. No bucket visibility change.
