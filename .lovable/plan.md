

## Fix: Admin Modules Not Showing for Non-Full-Admin Users

### Root Cause

The admin panel decides which modules to show using `hasModuleAccess(featureName)`, which checks if any user permission's `object_name` **starts with** the parent feature name.

For example, for Expense Management:
- Parent feature name: `admin_expense_mgmt`
- Sub-feature names in DB: `admin_expense_claims_list`, `admin_expense_approvals`, `admin_expense_analytics`, `admin_expense_policy_config`

The sub-features start with `admin_expense_`, **not** `admin_expense_mgmt`. So `startsWith('admin_expense_mgmt')` never matches, and the module is hidden.

This same bug affects multiple modules:
- `admin_expense_mgmt` vs `admin_expense_*`
- `admin_vendor_mgmt` vs `admin_vendor_*`
- `admin_product_mgmt` vs `admin_product_*`
- `admin_feedback_mgmt` vs `admin_feedback_*`
- `admin_territories_distributors` vs `admin_territory_*` / `admin_distributor_*` / `admin_region_*`

### Fix

Update `useProfilePermissions.ts` to add a new mapping from each parent module to the **actual common prefix(es)** of its sub-features. The `permittedAdminModules` logic will check these prefixes instead of the parent name.

#### Changes to `src/hooks/useProfilePermissions.ts`

1. Add a new map that associates each admin module key with its sub-feature prefixes:

```text
ADMIN_MODULE_SUB_PREFIXES = {
  'admin_expense_mgmt': ['admin_expense_'],
  'admin_product_mgmt': ['admin_product_'],
  'admin_vendor_mgmt': ['admin_vendor_'],
  'admin_feedback_mgmt': ['admin_feedback_', 'admin_competition_', 'admin_branding_'],
  'admin_territories_distributors': ['admin_territory_', 'admin_distributor_', 'admin_region_'],
  // modules where parent name IS the prefix (already working) don't need entries
}
```

2. Update the `permittedAdminModules` computation to:
   - First check if the user has any permission starting with the parent name (existing behavior, works for modules like `admin_attendance`, `admin_operations`, etc.)
   - If not, check the sub-prefixes from the new map

This is a targeted fix that only changes one file and does not affect any other permission logic.

### Technical Details

**File**: `src/hooks/useProfilePermissions.ts`

Add the sub-prefix map after `ADMIN_MODULE_PERMISSION_MAP`, then update `permittedAdminModules` to use a new helper that checks both the parent name and the sub-prefixes:

```typescript
const ADMIN_MODULE_SUB_PREFIXES: Record<string, string[]> = {
  'admin_product_mgmt': ['admin_product_'],
  'admin_scheme_master': ['admin_scheme_'],
  'admin_vendor_mgmt': ['admin_vendor_'],
  'admin_territories_distributors': ['admin_territory_', 'admin_distributor_', 'admin_region_'],
  'admin_expense_mgmt': ['admin_expense_'],
  'admin_feedback_mgmt': ['admin_feedback_', 'admin_competition_', 'admin_branding_'],
  // Add others as needed
};
```

Then update `permittedAdminModules`:
```typescript
const permittedAdminModules = Object.keys(ADMIN_MODULE_PERMISSION_MAP).filter(
  featureName => {
    // Check direct prefix match (works for admin_attendance, admin_operations, etc.)
    if (hasModuleAccess(featureName)) return true;
    // Check sub-feature prefixes
    const subPrefixes = ADMIN_MODULE_SUB_PREFIXES[featureName];
    if (subPrefixes) {
      return subPrefixes.some(prefix =>
        permissions.some(p => p.object_name.startsWith(prefix) && p.can_read)
      );
    }
    return false;
  }
);
```

No other files need changes.

