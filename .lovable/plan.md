
# Fix Deep Link Redirect After Login

## Problem Summary

When accessing `https://quickapp.ai/analytics` directly:
1. The user is redirected to the login page
2. **But the address bar shows `/dashboard` instead of `/auth`**
3. After login, the user lands on Dashboard instead of Analytics

This indicates a more fundamental issue with the redirect flow.

## Root Cause Analysis

The current implementation uses `sessionStorage` to pass the redirect URL, but this approach has a critical flaw:

```text
┌─────────────────────────────────────────────────────────────────┐
│                     ISSUE: ADDRESS BAR SHOWS /dashboard         │
├─────────────────────────────────────────────────────────────────┤
│  User visits /analytics                                         │
│       ↓                                                         │
│  ProtectedRoute renders → loading=true → shows spinner          │
│       ↓                                                         │
│  Auth check completes → no user → should go to /auth            │
│       ↓                                                         │
│  But user reports seeing /dashboard in address bar!             │
│                                                                 │
│  POSSIBLE CAUSES:                                               │
│  1. Published site doesn't have latest code                     │
│  2. Cached auth data bypassing ProtectedRoute temporarily       │
│  3. Race condition in auth state loading                        │
└─────────────────────────────────────────────────────────────────┘
```

## Solution: URL Query Parameter Approach

To make the redirect more robust, we will use a **URL query parameter** instead of (or in addition to) sessionStorage. This approach:

- Survives page reloads and navigation
- Is visible in the URL for debugging
- Works even if sessionStorage is cleared

```text
┌─────────────────────────────────────────────────────────────────┐
│                       NEW ROBUST FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│  User visits /analytics                                         │
│       ↓                                                         │
│  ProtectedRoute: Not logged in                                  │
│       → Navigate to /auth?redirect=%2Fanalytics                 │
│       ↓                                                         │
│  User sees /auth?redirect=%2Fanalytics in address bar           │
│       ↓                                                         │
│  User logs in successfully                                      │
│       ↓                                                         │
│  signIn(): Check URL params → redirect query param found        │
│       → Also check sessionStorage as fallback                   │
│       → Redirect to /analytics                                  │
│       ↓                                                         │
│  User lands on /analytics ✓                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Update ProtectedRoute.tsx

Pass the redirect URL as a query parameter:

```typescript
// Before: Navigate to /auth only
return <Navigate to="/auth" replace />;

// After: Include redirect URL in query parameter
const currentPath = window.location.pathname + window.location.search;
if (currentPath !== '/' && currentPath !== '/auth') {
  sessionStorage.setItem('auth_redirect_url', currentPath);
  const encodedPath = encodeURIComponent(currentPath);
  return <Navigate to={`/auth?redirect=${encodedPath}`} replace />;
}
return <Navigate to="/auth" replace />;
```

### 2. Update RoleBasedAuthPage.tsx

Read the redirect URL from query params:

```typescript
import { useSearchParams } from 'react-router-dom';

// Inside component:
const [searchParams] = useSearchParams();

if (user) {
  // Priority: URL param > sessionStorage > default
  const redirectParam = searchParams.get('redirect');
  const sessionRedirect = sessionStorage.getItem('auth_redirect_url');
  sessionStorage.removeItem('auth_redirect_url');
  
  const targetUrl = redirectParam || sessionRedirect || '/dashboard';
  return <Navigate to={targetUrl} replace />;
}
```

### 3. Update useAuth.tsx (signIn function)

Read redirect URL from current page's query params:

```typescript
// Inside signIn function, after successful auth:
const urlParams = new URLSearchParams(window.location.search);
const redirectParam = urlParams.get('redirect');
const sessionRedirect = sessionStorage.getItem('auth_redirect_url');
sessionStorage.removeItem('auth_redirect_url');

const targetUrl = redirectParam || sessionRedirect || '/dashboard';
window.location.href = targetUrl;
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/auth/ProtectedRoute.tsx` | Add redirect query parameter to /auth navigation |
| `src/components/auth/RoleBasedAuthPage.tsx` | Read redirect from URL params with fallback |
| `src/hooks/useAuth.tsx` | Read redirect from URL params in signIn function |

## Technical Notes

- **URL encoding**: The redirect path is URL-encoded to handle special characters and query strings (e.g., `/analytics?tab=products` becomes `%2Fanalytics%3Ftab%3Dproducts`)
- **Priority order**: URL param takes precedence over sessionStorage to ensure the visible URL is authoritative
- **Backward compatibility**: sessionStorage is kept as a fallback for edge cases
- **Security**: Only relative paths starting with `/` should be accepted to prevent open redirect vulnerabilities

## Testing After Implementation

1. Open incognito/private browser window
2. Navigate directly to `https://quickapp.ai/analytics`
3. Verify address bar shows `/auth?redirect=%2Fanalytics`
4. Log in with valid credentials
5. Verify you land on `/analytics` after login

**Important**: After implementing, the changes need to be **published** to the live site for them to take effect on quickapp.ai.
