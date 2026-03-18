

## Fix: Add Diagnostic Logging to Permission Query

### Problem
`useProfilePermissions.ts` silently returns empty arrays on errors (lines 105, 112), hiding failures that cause the "No Permissions Assigned" screen even when DB data is correct.

### Changes

**File: `src/hooks/useProfilePermissions.ts`**

Add error logging at the two silent-failure points:

```typescript
// Line 105 area
if (profileError) {
  console.error('[Permissions] Failed to fetch user profile:', profileError);
  return [];
}
if (!profilePerms?.profile_id) {
  console.warn('[Permissions] No profile_id found for user:', user.id);
  return [];
}

// Line 112 area  
if (permsError) {
  console.error('[Permissions] Failed to fetch permissions:', permsError);
  return [];
}

// After successful fetch (before return)
console.info('[Permissions] Loaded', result.length, 'permissions for profile', profilePerms.profile_id);
```

This is a single-file change — adds 4 log statements to surface any runtime failures in the console.

