

## Fix: Dashboard Sections Still Visible Despite Permissions Not Selected

### Root Cause

There are two problems:

1. **Unreliable "has security profile" detection**: The current code uses `permissions.length > 0` to determine if a user has a security profile assigned. This fails when:
   - Permissions are still loading (returns empty array initially)
   - The profile exists but has limited permissions configured
   
   The fix: Use `securityProfileName` from `useAuth()` instead, which is a direct check of whether the user has a security profile assigned via `user_profiles` table. This is the same approach used in `useFeatureFlags.ts` and `useAdminAccess.ts`.

2. **Target section bundled inside TodaysBeatCard**: The `TodaysBeatCard` contains a target progress section (period selector, target vs actual, gap indicator) that should only show when the user has `target_` permissions. Currently there is no independent check for this.

### Changes

#### 1. `src/pages/Index.tsx` - Fix hasSecurityProfile detection

Replace:
```
const hasSecurityProfile = permissions.length > 0;
```
With:
```
const { securityProfileName } = useAuth();
const hasSecurityProfile = !!securityProfileName;
```

This uses the already-available `securityProfileName` (which is fetched via `user_profiles -> security_profiles` join) as the reliable indicator. Since `useAuth()` is already imported and destructured, we just need to add `securityProfileName` to the destructuring.

Also add a `showTarget` flag:
```
const showTarget = canShow('target_');
```

And pass it to `TodaysBeatCard`:
```
<TodaysBeatCard ... showTarget={showTarget} />
```

#### 2. `src/components/home/TodaysBeatCard.tsx` - Conditionally render target section

- Add `showTarget?: boolean` prop (default `true` for backward compatibility)
- Wrap the entire "Target Progress Section" (period selectors, target display, progress bar, gap indicator) in `{showTarget && (...)}` so it only renders when the user has target permissions
- The visit stats (Planned, Productive, Remaining, New Added, Potential, Points) and Visit/Summary buttons remain visible as they belong to the `visit_` module

### Summary

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Use `securityProfileName` for profile detection; pass `showTarget` prop |
| `src/components/home/TodaysBeatCard.tsx` | Accept `showTarget` prop; hide target section when false |

