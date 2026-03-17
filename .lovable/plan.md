

## Plan: Robust Login on Slow Networks & Prevent Auto-Logout

### Problem Analysis

1. **"Failed to fetch" on slow network/WiFi switch**: The current `signIn` function catches network errors, but doesn't retry. Users on slow connections or switching WiFi get a one-shot failure.

2. **Auto-logout risk**: The `onAuthStateChange` listener can trigger state clearing if a token refresh fails on a slow network. Supabase's `autoRefreshToken` may fail silently, causing the session to appear expired.

### Changes

#### 1. Add login retry with timeout in `src/hooks/useAuth.tsx`

In the `signIn` function, wrap the `supabase.auth.signInWithPassword` call with a retry mechanism (up to 2 retries with increasing delay: 2s, 4s). Also add an `AbortController`-style timeout of 15 seconds per attempt so slow networks don't hang indefinitely.

```
Attempt 1 → fail (network) → wait 2s → Attempt 2 → fail → wait 4s → Attempt 3 → fail → show error
```

#### 2. Prevent auto-logout on token refresh failure in `src/hooks/useAuth.tsx`

In the `onAuthStateChange` callback, when session becomes `null` but we have a cached user, **don't immediately clear state**. Instead:
- Check if the user is offline (via `navigator.onLine`)
- If offline or network is unstable, preserve the cached auth state and don't set `user` to `null`
- Only clear auth state on explicit `SIGNED_OUT` event (which only fires on manual sign-out)

Current code clears cached auth whenever `session?.user` is falsy:
```typescript
} else {
  clearCachedAuth();  // This causes auto-logout on token refresh failure
}
```

Change to only clear on explicit `SIGNED_OUT`:
```typescript
if (event === 'SIGNED_OUT') {
  clearCachedAuth();
  setUser(null);
  // ...clear everything
}
```

#### 3. Add session recovery attempt in `src/hooks/useAuth.tsx`

When `getSession()` fails (network error), fall back to cached auth state instead of leaving the user logged out. The current `.catch` sets `loading = false` but doesn't restore cached state.

#### 4. Improve Supabase client resilience in `src/integrations/supabase/client.ts`

Add `detectSessionInUrl: true` and keep existing config. No changes needed to `autoRefreshToken: true` since it's already set.

### Files to Modify

- **`src/hooks/useAuth.tsx`** — Retry logic in `signIn`, protect `onAuthStateChange` from clearing state on non-explicit logout, fallback to cache on `getSession` failure
- **`src/integrations/supabase/client.ts`** — Minor: add `detectSessionInUrl: true` for robustness

### What This Fixes

- Users on slow WiFi will get automatic retries instead of immediate failure
- Token refresh failures on unstable networks won't log users out
- Only manual sign-out (`signOut()` call) will clear the session
- Cached auth state is preserved as a safety net during connectivity gaps

