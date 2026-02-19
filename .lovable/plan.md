

## Fix: Company Logo Not Showing in Header

### Root Cause

The `useCompanyData` hook (line 91-98) only fetches company data from the database if **no localStorage cache exists**. Once cached, the data is never refreshed — there is no cache expiration. If the logo was added/changed after the first cache was written, the stale cache (with `headerLogo: null`) persists indefinitely.

```text
Current flow:
  Cache exists? --YES--> Use cached data forever (stale logo!)
               --NO---> Fetch from DB, cache result
```

### Fix

**File: `src/hooks/useCompanyData.ts`**

Change the strategy to: always use cache for instant render (no flicker), but also fetch fresh data in the background every time. This is a "stale-while-revalidate" approach.

**Lines 91-98** - Remove the conditional that skips the network fetch:

```typescript
// Before:
useEffect(() => {
  const cached = getCachedBranding();
  if (!cached) {
    fetchCompany();
  } else {
    setIsLoading(false);
  }
  // ...event listener
}, [fetchCompany]);

// After:
useEffect(() => {
  // Always fetch fresh data in background (cache is used for initial render)
  fetchCompany();
  // ...event listener
}, [fetchCompany]);
```

This way:
- The initial render still uses the cached values (no flicker) since state is initialized from cache on line 48-52
- Fresh data is always fetched in the background and updates both state and cache
- Logo changes will appear on next page load or navigation

### No other files need changes

The Navbar already renders the logo correctly when `companyLogo` has a value. The issue is purely that the cached value is stale.
