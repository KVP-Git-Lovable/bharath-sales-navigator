# Why variants are missing for some users

## Diagnosis

- Database is correct: 20 active variants exist, all with `is_active = true`.
- RLS is correct: `product_variants` has `SELECT TO authenticated USING (true)` — every logged-in user can read them.
- Code is correct: `useOfflineOrderEntry.ts` fetches variants with `is_active = true OR null` and merges them into the product list.

So why don't all users see them?

**Root cause = stale IndexedDB cache on user devices.**

Before we added the SELECT policy on `product_variants`, the variant fetch silently returned `[]` for every non-admin user. That empty array got cached into IndexedDB (`STORES.VARIANTS`). The hook is **cache-first**:

1. Loads products + variants from IndexedDB instantly and renders.
2. Only **then** triggers a background re-sync — and only if `isOnline`, only via `requestIdleCallback`, and only once per session (`hasFetchedRef`).

For users on slow/intermittent connections (typical for the Android field app), the background sync often never completes before they navigate away, so the empty variants cache persists across sessions. Result: products show, variants don't.

There is no cache version mechanism, so we cannot detect that the cache was populated under the old broken RLS.

## Fix

Add a one-time cache invalidation tied to a version constant. On app load, if the stored version is older than the current code version, wipe `PRODUCTS`, `VARIANTS`, `SCHEMES` from IndexedDB so the next fetch is forced to pull fresh data from the network (now that RLS allows it).

### Changes

1. **`src/hooks/useOfflineOrderEntry.ts`**
   - Add `const PRODUCT_CACHE_VERSION = 2;`
   - On mount (before first cache read), check `localStorage.getItem('product_cache_version')`. If missing or `< 2`, call `offlineStorage.clear(STORES.PRODUCTS / VARIANTS / SCHEMES)` and set the new version.
   - After clearing, force a network sync immediately instead of returning the empty cache.

2. **`src/utils/offlineOrderUtils.ts`** (`loadProductsFromCache`)
   - Same version check — if cache is stale, return `{ products: [], fromCache: true }` so the caller falls through to network fetch.

3. **Make the background sync more reliable**
   - In `useOfflineOrderEntry.ts`, when cache yields products but **zero variants total**, force an immediate (non-idle) network sync instead of the deferred one. This catches the affected users on their very next visit to Order Entry, even on slow connections.

### Out of scope

- No RLS changes (already correct).
- No DB data changes (variants are already active).
- No UI changes — variants render correctly once data is present.

### Verification

- Log out / reopen the installed app as an affected user → IndexedDB version bumps → variants re-sync → variant rows appear in the Order Entry product dropdown.
- Browser preview (which already shows variants) continues to work — cache version simply bumps once with no visible effect.
- Newly added variants in Product Master continue to flow through the existing 30-second background sync.
