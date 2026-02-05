
# Deep Link Redirect After Login

## Problem Summary
When accessing a protected route like `/analytics` while not logged in:
1. The app correctly redirects to the login page
2. But after successful login, the user lands on `/dashboard` instead of returning to `/analytics`

This requires an extra manual step to navigate back to the intended page.

## Root Cause Analysis
The codebase has three locations that contribute to this issue:

| File | Issue |
|------|-------|
| `ProtectedRoute.tsx` | Redirects to `/auth` without saving the original URL |
| `useAuth.tsx` (signIn) | Hardcoded redirect to `/dashboard` after login |
| `RoleBasedAuthPage.tsx` | Hardcoded redirect to `/dashboard` for logged-in users |

## Solution Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                        CURRENT FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│  User visits /analytics                                         │
│       ↓                                                         │
│  ProtectedRoute: Not logged in → Navigate to /auth              │
│       ↓                                                         │
│  User logs in successfully                                      │
│       ↓                                                         │
│  signIn(): window.location.href = '/dashboard' (HARDCODED)      │
│       ↓                                                         │
│  User lands on /dashboard ❌                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        NEW FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│  User visits /analytics                                         │
│       ↓                                                         │
│  ProtectedRoute: Not logged in                                  │
│       → Save "/analytics" in sessionStorage                     │
│       → Navigate to /auth                                       │
│       ↓                                                         │
│  User logs in successfully                                      │
│       ↓                                                         │
│  signIn(): Check sessionStorage for saved URL                   │
│       → Found: redirect to /analytics                           │
│       → Not found: redirect to /dashboard (default)             │
│       ↓                                                         │
│  User lands on /analytics ✓                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Update `ProtectedRoute.tsx`
Save the current pathname before redirecting to auth:

```typescript
// Before redirecting to /auth, save the intended destination
if (!user) {
  // Save the originally requested URL
  const currentPath = window.location.pathname + window.location.search;
  if (currentPath !== '/' && currentPath !== '/auth') {
    sessionStorage.setItem('auth_redirect_url', currentPath);
  }
  
  clearCachedAuth();
  return <Navigate to="/auth" replace />;
}
```

### 2. Update `useAuth.tsx` - signIn function
Retrieve and use the saved URL after successful login:

```typescript
// After successful authentication, check for redirect URL
const redirectUrl = sessionStorage.getItem('auth_redirect_url');
sessionStorage.removeItem('auth_redirect_url'); // Clear after reading

// Use saved URL or fall back to dashboard
window.location.href = redirectUrl || '/dashboard';
```

### 3. Update `RoleBasedAuthPage.tsx`
Also respect the saved redirect when user is already logged in:

```typescript
if (user) {
  const redirectUrl = sessionStorage.getItem('auth_redirect_url');
  sessionStorage.removeItem('auth_redirect_url');
  return <Navigate to={redirectUrl || "/dashboard"} replace />;
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/auth/ProtectedRoute.tsx` | Save current path to sessionStorage before redirecting |
| `src/hooks/useAuth.tsx` | Read saved URL in signIn function and redirect accordingly |
| `src/components/auth/RoleBasedAuthPage.tsx` | Read saved URL when already-logged-in user visits /auth |

## Technical Notes

- **Using sessionStorage instead of localStorage**: sessionStorage is cleared when the browser tab closes, which is appropriate for temporary redirect URLs
- **URL includes search params**: The implementation captures both pathname and query string (e.g., `/analytics?tab=products`)
- **Excludes root and auth paths**: We don't save `/` or `/auth` as redirect URLs to avoid redirect loops
- **Single-use**: The redirect URL is cleared immediately after reading to prevent stale redirects
