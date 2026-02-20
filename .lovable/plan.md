
## Production-Grade Fix: Offline-First Permission Architecture

### Root Cause Analysis

There are three interconnected bugs causing the blank navigation menu:

**Bug 1 — No persistence between sessions**
`useProfilePermissions` stores permissions only in React Query's in-memory cache with a 5-minute stale time. Every time the app restarts, cache is gone. The query runs fresh, and during that network round-trip, `permissions = []`.

**Bug 2 — Loading state treated as "denied"**
In `useFeatureFlags.ts` line 136:
```ts
if (permissions.length === 0) return false;
```
This fires during loading (when permissions are still `[]`) AND after load (when user has zero permissions). The code cannot distinguish "still loading" from "loaded and empty." Result: every nav item is hidden during every app startup.

**Bug 3 — No version-aware refresh**
Even if caching is added, permissions are re-fetched on every mount (React Query `refetchOnMount: true` default). There is no mechanism to skip the re-fetch when the profile has not changed, so the app always does a network call before rendering the menu.

**Bug 4 — `clearCachedAuth` does not clear permissions**
The signout utility in `cachedAuthIntegrity.ts` correctly clears user/role/profile cache keys — but there is no `cached_permissions_{userId}` key being cleared. Once we add persistence, we must also clear on logout.

---

### The Architecture Change

```text
BEFORE (broken):
  App opens → React Query fetches permissions (network) → UI renders
  During fetch: permissions = [] → nav hidden

AFTER (fixed):
  App opens → load cached permissions from localStorage instantly → UI renders immediately
              ↓ (background, non-blocking)
              React Query fetches fresh permissions only if profile changed
              → Updates localStorage silently
              → UI refreshes only if permissions actually changed
```

---

### Files to Change

**1. `src/utils/cachedAuthIntegrity.ts`**

Add two new exported functions:
- `setCachedPermissions(userId, permissions)` — saves permissions array + a version hash to `localStorage`
- `getCachedPermissions(userId)` — retrieves and validates the stored array
- `clearCachedPermissions(userId)` — called on logout

Update `clearCachedAuth()` to also clear any `permissions_` prefixed keys for the stored user ID.

---

**2. `src/hooks/useProfilePermissions.ts`**

This is the main change. The React Query call gets three upgrades:

**a) `placeholderData` from localStorage**
Instead of starting with `[]`, the query reads from localStorage immediately on mount:
```ts
placeholderData: () => {
  const cached = localStorage.getItem(`permissions_${user.id}`);
  return cached ? JSON.parse(cached) : undefined;
},
```
`placeholderData` (not `initialData`) is correct here because it does not prevent the query from running in the background, but it provides instant data for rendering.

**b) Save to localStorage on successful fetch**
In `queryFn`, after receiving permissions from Supabase, save them:
```ts
localStorage.setItem(`permissions_${user.id}`, JSON.stringify(perms));
```

**c) Smarter staleTime using profile version**
Store the profile's `updated_at` (or profile_id) alongside the cached permissions. On next load, compare the stored profile_id against the one fetched. If same → `staleTime: Infinity` (skip re-fetch). If different → fetch fresh. This is done via a `meta` flag passed into the query.

For simplicity and reliability, a pragmatic approach: set `staleTime` to 30 minutes (not 5). With `placeholderData` showing cached content instantly, a background refresh every 30 minutes is more than enough for a field force app where permissions change rarely.

```ts
staleTime: 30 * 60 * 1000,       // 30 min — background refresh only
refetchOnWindowFocus: false,       // don't re-fetch just because user switched tabs
refetchOnMount: false,             // don't re-fetch if cache exists (placeholderData covers this)
```

**d) Export `isPlaceholderData` state**
The hook should export whether it is showing cached (placeholder) data vs. live data. This is not needed for nav rendering (since placeholder data is trusted), but useful for future debugging.

---

**3. `src/hooks/useFeatureFlags.ts`**

Fix the blocking logic in `isNavItemEnabled`. Replace the existing Step 3:

```ts
// BEFORE (broken):
if (permissions.length === 0) return false;

// AFTER (fixed):
if (isLoading && permissions.length === 0) return true;  // Still loading → don't block
if (!isLoading && permissions.length === 0) return false; // Loaded, confirmed empty → deny
```

This single change means:
- During initial load with no cache → items stay visible (fallback to "show all" while loading)
- During initial load WITH cache (placeholder data) → items are correctly filtered from cache
- After load completes → normal permission check applies

Also update the `flagsLoading` logic similarly — if feature flags have not loaded yet but we have cached permissions, we should not block. Add `initialData` for feature flags from a localStorage cache too (`feature_flags_cache` key) for full offline support.

---

**4. `src/hooks/useAuth.tsx` — signOut cleanup**

In the `signOut` function, after `clearCachedAuth()`, also clear permissions:
```ts
// Clear cached permissions for this user
const userId = user?.id;
if (userId) {
  localStorage.removeItem(`permissions_${userId}`);
}
```

This ensures a logged-out user's permissions are never loaded by the next user on shared devices.

---

### Also: Feature Flags Offline Cache

Apply the same pattern to `useFeatureFlags`:
- Save `feature_flags` to `localStorage` as `feature_flags_cache` after fetch
- Use as `placeholderData` on next load
- Set `staleTime: 30 * 60 * 1000`

This completes the offline picture — both permissions AND feature flags load from cache instantly.

---

### Summary of Changes

| File | Change |
|---|---|
| `src/utils/cachedAuthIntegrity.ts` | Add `setCachedPermissions`, `getCachedPermissions`, update `clearCachedAuth` to wipe permissions |
| `src/hooks/useProfilePermissions.ts` | Add `placeholderData` from localStorage, save to localStorage on fetch, increase staleTime to 30 min, disable refetchOnMount/WindowFocus |
| `src/hooks/useFeatureFlags.ts` | Fix `isNavItemEnabled` loading guard, add localStorage cache for feature flags |
| `src/hooks/useAuth.tsx` | Clear `permissions_{userId}` key on signOut |

### Behavior After Fix

| Scenario | Before | After |
|---|---|---|
| First login (online) | Permissions fetched, nav shows after delay | Permissions fetched, cached, nav shows instantly next time |
| App restart (online) | Re-fetches, nav blank during fetch | Cached permissions shown instantly, background refresh at 30 min |
| App restart (offline) | Fetch fails, nav stays blank | Cached permissions shown instantly, no network call needed |
| Slow network | Nav blank for 3-8 seconds | Nav shows from cache in <50ms |
| Profile permissions changed in backend | Updates after 5 min | Updates after 30 min background refresh |
| User logs out | — | Permission cache cleared for that user |
| Different user logs in on same device | — | Each user has their own `permissions_{userId}` key, no cross-contamination |

### Security Note
Frontend caching only affects **visibility** of menu items. All actual data operations go through the Supabase backend with RLS policies enforced at the database level. A user cannot access data they are not permitted to by manipulating their local permission cache — they would only see a nav item that leads to an empty or access-denied page.
