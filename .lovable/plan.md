
# Fix: Cannot Delete Activities in Gamification Management

## Problem Identified

The delete operation fails because of a mismatch between:
1. **Frontend Access Control** (`useAdminAccess` hook) - Grants access if user has `admin` role OR `System Administrator` security profile
2. **Database RLS Policy** - Only allows delete if user has `admin` role (ignores `System Administrator` profile)

**Current RLS Policy on `gamification_actions`:**
```sql
-- Only checks for admin role
has_role(auth.uid(), 'admin'::app_role)
```

**Users affected:** Those with `System Administrator` profile but without explicit `admin` role in `user_roles` table (e.g., Abhishek S, Shravya Amin).

---

## Solution

Update the RLS policies on both `gamification_actions` and `gamification_games` tables to use the existing `is_system_admin()` function, which already handles both conditions:

```sql
-- Existing function that checks BOTH conditions
is_system_admin(_user_id uuid) 
-- Returns true if user has admin role OR System Administrator profile
```

---

## Database Changes Required

### 1. Update `gamification_actions` RLS Policy

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage gamification actions" 
ON public.gamification_actions;

-- Create new policy using is_system_admin function
CREATE POLICY "Admins can manage gamification actions" 
ON public.gamification_actions
FOR ALL
TO authenticated
USING (public.is_system_admin(auth.uid()))
WITH CHECK (public.is_system_admin(auth.uid()));
```

### 2. Update `gamification_games` RLS Policy

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage gamification games" 
ON public.gamification_games;

-- Create new policy using is_system_admin function
CREATE POLICY "Admins can manage gamification games" 
ON public.gamification_games
FOR ALL
TO authenticated
USING (public.is_system_admin(auth.uid()))
WITH CHECK (public.is_system_admin(auth.uid()));
```

---

## Why This Works

The `is_system_admin()` function already exists in your database and is used by other tables:

```sql
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Check if user has admin role
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'::app_role
  )
  OR EXISTS (
    -- Check if user has System Administrator security profile
    SELECT 1 FROM public.user_profiles up
    JOIN public.security_profiles sp ON sp.id = up.profile_id
    WHERE up.user_id = _user_id AND sp.name = 'System Administrator'
  )
$$;
```

This ensures consistency between:
- Page access (via `useAdminAccess` hook)
- Database operations (via RLS policies)

---

## No Code Changes Required

The frontend code in `GamificationManagement.tsx` is correct. The delete function properly calls the Supabase delete operation - it's just being blocked by the RLS policy at the database level.

---

## Summary

| Component | Current | After Fix |
|-----------|---------|-----------|
| Frontend Access | `admin` role OR `System Administrator` profile | No change |
| RLS Policy | Only `admin` role | `admin` role OR `System Administrator` profile |
| Delete Operation | ❌ Fails for some users | ✅ Works for all authorized users |
