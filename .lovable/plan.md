

## Root Cause: Service Worker Caching Supabase Auth Requests

**The Problem:**
In `src/service-worker.ts` (lines 170-184), there is a catch-all route that caches **all** requests to `*.supabase.co`:

```typescript
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({
    cacheName: `api-cache-${RUNTIME_CACHE_VERSION}`,
    networkTimeoutSeconds: 3, // <-- Falls back to cache after 3 seconds
    ...
  }),
);
```

This includes Supabase **auth endpoints** (`/auth/v1/token`, `/auth/v1/signup`, etc.). Here's what happens:

1. User logs in successfully -- the auth token response gets cached by the Service Worker
2. User logs out -- `signOut({ scope: 'local' })` clears local state but the **Service Worker cache still holds the old auth response**
3. User tries to log in again -- if the network is even slightly slow (>3 seconds), the Service Worker serves the **stale cached auth response** instead of the real one
4. The stale/invalid token causes "Login Failed"
5. On a different Wi-Fi network, the Service Worker cache may not trigger the same way (different latency characteristics, or cache miss), so login works

## Fix

**File: `src/service-worker.ts`**

Update the Supabase API caching route (line 172) to **exclude auth endpoints** from being cached. Auth requests (login, token refresh, signup, etc.) should always go directly to the network and never be served from cache.

Change the route matcher from:
```typescript
({ url }) => url.hostname.endsWith('.supabase.co')
```
to:
```typescript
({ url }) =>
  url.hostname.endsWith('.supabase.co') &&
  !url.pathname.startsWith('/auth/')
```

This is a one-line change that ensures:
- Auth requests (login, logout, token refresh) always hit the network directly -- no caching
- Other Supabase API requests (data queries, storage) continue to benefit from the NetworkFirst cache for offline support
- The issue of stale auth responses being served after logout is completely eliminated

