

## Fix: Modules Showing for Users With No Permissions

### Root Cause

The bug is in the permission bypass logic. Currently, both `useFeatureFlags.ts` (line 136) and `RoutePermissionGuard.tsx` (line 34) have this check:

```
if (permissions.length === 0) return true; // show all
```

This was intended to handle users with **no security profile assigned** (backward compatibility). However, it also matches users who **have a profile assigned but zero permissions configured** -- like Vikhyath (Sales Manager profile, 0 permissions). Both cases produce an empty permissions array, so all modules become visible.

### The Fix

Use `securityProfileName` (already available from `useAuth`) to distinguish:
- **No profile assigned** (`securityProfileName` is null) -- show all (backward compat)
- **Profile assigned but 0 permissions** -- hide everything (correctly enforce restrictions)

### Files to Change

**1. `src/hooks/useFeatureFlags.ts`** (line 135-136)

Change from:
```
if (permissions.length === 0) return true;
```
To:
```
if (!securityProfileName) return true;  // No profile assigned = show all
if (permissions.length === 0) return false; // Profile assigned, no permissions = hide
```

**2. `src/components/auth/RoutePermissionGuard.tsx`** (line 33-34)

Same logic change -- add `useAuth` import and check `securityProfileName`:
- If `securityProfileName` is null, bypass (show all)
- If profile is assigned but `permissions.length === 0`, redirect to dashboard

### What This Means for Users

| Scenario | Before (Bug) | After (Fixed) |
|----------|-------------|---------------|
| System Administrator | All visible | All visible (no change) |
| No security profile assigned | All visible | All visible (no change) |
| Profile assigned + permissions configured | Correct filtering | Correct filtering (no change) |
| Profile assigned + 0 permissions (Vikhyath) | All visible (BUG) | Nothing visible (FIXED) |

