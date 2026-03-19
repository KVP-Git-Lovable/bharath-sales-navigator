

## Plan: Fix Distributor Portal Admin Check to Use Security Profiles

### Problem
The "Login as User" button in Distributor Master and the impersonation handler in `DistributorLogin.tsx` both query the `user_roles` table for `role = 'admin'`. But your project migrated admin detection to `security_profiles` (via `is_system` flag) — the `user_roles` table no longer contains `admin` entries. Ajay is an administrator via the security profile system, but the old check doesn't see that.

### Fix
Replace the direct `user_roles` query in two files with a check against `security_profiles` via `user_profiles`, matching how the rest of the app determines admin status.

### Files to change

**1. `src/components/distributor/DistributorPortalUsers.tsx` (~line 285-294)**
Replace the `user_roles` query with:
```typescript
const { data: adminCheck } = await supabase
  .from('user_profiles')
  .select('security_profiles!inner(is_system)')
  .eq('user_id', adminSession.user.id)
  .maybeSingle();

if (!adminCheck?.security_profiles?.is_system) {
  toast.error("Only admins can login as users");
  ...
}
```

**2. `src/pages/distributor-portal/DistributorLogin.tsx` (~line 42-52)**
Same replacement — swap the `user_roles` query for the `user_profiles` → `security_profiles(is_system)` check.

### Why this works
- Matches how `is_system_admin()` and `has_role()` DB functions already work
- No database changes needed — purely a frontend fix
- Ajay (and any user with a `is_system = true` security profile) will be recognized as admin

