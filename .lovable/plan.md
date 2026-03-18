

## Fix: Permission System — DB Seed, Save Conflict, Cache Invalidation & Empty State

### Root Causes Identified

1. **ObjectPermissions.tsx save fails silently** — upserts with `onConflict: 'profile_id,object_name'` but the DB unique constraint is `(profile_id, object_name, permission_type)`. Missing `permission_type` in the upsert payload causes errors or duplicate rows.

2. **System Administrator has 268 `feature`-type rows but 0 hierarchical keys** — No `module_*`, `field_homepage_*`, `widget_homepage_*`, `action_homepage_*` rows exist. The dashboard checks these prefixes and finds nothing.

3. **Cache not invalidated on save** — Both `ObjectPermissions` and `RolePermissionsTab` invalidate their own query keys but NOT `['profile-permissions', userId]` (the runtime hook). Plus the 30-min `staleTime` prevents refetch. Users must hard-refresh to see changes.

4. **No empty-state UX** — When all `show*` flags are false, the dashboard renders a blank content area with no explanation.

### Implementation Plan

**Task 1: Fix ObjectPermissions.tsx save — include `permission_type` in upsert**

Update the `saveMutation` to include `permission_type: 'feature'` for all legacy permission items, and use the correct 3-column conflict key:
```typescript
const updates = Object.entries(changes).map(([objectName, perms]) => ({
  profile_id: selectedProfileId,
  object_name: objectName,
  permission_type: 'feature',
  ...perms
}));
// onConflict: 'profile_id,object_name,permission_type'
```

Also update `handleGrantAll` and `handleRevokeAll` to include `permission_type`.

**Task 2: Seed ALL permission keys for System Administrator profile**

Write a SQL INSERT that populates `profile_object_permissions` for the System Administrator profile (`3385dd99-c4f7-455b-94d7-c7b5105565ce`) with:
- All hierarchical keys from `hierarchicalPermissions.ts`: `module_*`, `field_*`, `action_*`, `widget_*` (with correct `permission_type`)
- All homepage-specific keys: `field_homepage_*`, `action_homepage_*`, `widget_homepage_*`
- All legacy feature keys from `permissionModules.ts` (already partially present)
- All with `can_read/can_create/can_edit/can_delete = true`

This will be done via the Supabase insert tool using `ON CONFLICT ... DO UPDATE` to avoid duplicates.

**Task 3: Fix cache invalidation — force runtime permission refresh after save**

In both `ObjectPermissions.tsx` and `RolePermissionsTab.tsx` `onSuccess` handlers:
- Also invalidate `['profile-permissions']` (the runtime query key)
- Clear localStorage cached permissions via `clearCachedPermissions()`

In `useProfilePermissions.ts`:
- Export a `clearCachedPermissions` helper (or reuse existing)
- Reduce `staleTime` or add manual invalidation path

**Task 4: Add empty-state fallback in Index.tsx**

When all `show*` flags are false, render a card explaining "No permissions assigned to your profile. Contact your administrator."

### Files to Change
- `src/components/security/ObjectPermissions.tsx` — fix upsert conflict key + permission_type
- `src/components/security/RolePermissionsTab.tsx` — add runtime cache invalidation
- `src/hooks/useProfilePermissions.ts` — export cache clear helper
- `src/pages/Index.tsx` — add empty-state card
- DB: insert ~500+ permission rows for System Administrator profile

