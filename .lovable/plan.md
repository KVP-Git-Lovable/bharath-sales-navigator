

## Fix: Admin Modules Not Showing Due to Prefix Mismatch

### Root Cause

The `AdminControls` page filters modules using `permittedAdminPaths`. This set is built by checking if any permission object name **starts with** the module key from `ADMIN_MODULE_PERMISSION_MAP`. However, most module keys don't match the actual permission object prefixes in the database.

For example:
- Module key `admin_security_access` expects objects starting with `admin_security_access...`
- But actual objects are named `admin_security_profiles`, `admin_profile_permissions` -- they don't start with `admin_security_access`

**Result**: 15 of 25 modules fail the prefix check and are hidden. Only 6 are rescued by existing `ADMIN_MODULE_SUB_PREFIXES` entries, leaving **9 modules invisible**.

Additionally, 4 admin cards have paths not listed in `ADMIN_MODULE_PERMISSION_MAP` at all:
- `/admin#users` (User Management)
- `/admin#settings` (System Settings)
- `/admin/pincode-master` (Pincode Master)
- `/admin/tax-master` (Tax Master)

### Modules Currently Missing (and why)

| Module | Key | Actual DB prefix | Status |
|--------|-----|-------------------|--------|
| GPS Track Mgmt | `admin_gps_track_mgmt` | `admin_gps_` | Hidden |
| Retail Management | `admin_retail_mgmt` | `admin_retailer_` | Hidden |
| Van Sales | `admin_van_sales` | `admin_van_` | Hidden |
| Security and Access | `admin_security_access` | `admin_security_`, `admin_profile_` | Hidden |
| Feature Management | `admin_feature_mgmt` | `admin_feature_` | Hidden |
| Retailer Loyalty | `admin_retailer_loyalty` | `admin_loyalty_` | Hidden |
| Company Profile | `admin_company_profile` | `admin_company_`, `admin_bank_`, `admin_header_` | Hidden |
| Invoice Management | `admin_invoice_mgmt` | `admin_invoice_` | Hidden |
| Credit Management | `admin_credit_mgmt` | `admin_credit_` | Hidden |
| Notification Setup | `admin_notification_setup` | `admin_notification_` | Hidden |
| Distributor Portal | `admin_distributor_portal` | `admin_portal_` | Hidden |
| Target Management | `admin_target_vs_actual` | `admin_target_` | Hidden |
| User Management | `/admin#users` | Not mapped | Hidden |
| System Settings | `/admin#settings` | Not mapped | Hidden |
| Pincode Master | `/admin/pincode-master` | Not mapped | Hidden |
| Tax Master | `/admin/tax-master` | Not mapped | Hidden |

### Fix (Single File Change)

**File: `src/hooks/useProfilePermissions.ts`**

Add missing sub-prefix mappings to `ADMIN_MODULE_SUB_PREFIXES` and add missing path mappings to `ADMIN_MODULE_PERMISSION_MAP`:

```text
// Add to ADMIN_MODULE_PERMISSION_MAP:
'admin_user_mgmt': '/admin#users',
'admin_system_settings': '/admin#settings',
'admin_pincode_master': '/admin/pincode-master',
'admin_tax_master': '/admin/tax-master',

// Add to ADMIN_MODULE_SUB_PREFIXES:
'admin_gps_track_mgmt': ['admin_gps_'],
'admin_retail_mgmt': ['admin_retailer_'],
'admin_van_sales': ['admin_van_'],
'admin_security_access': ['admin_security_', 'admin_profile_'],
'admin_feature_mgmt': ['admin_feature_'],
'admin_retailer_loyalty': ['admin_loyalty_'],
'admin_company_profile': ['admin_company_', 'admin_bank_', 'admin_header_'],
'admin_invoice_mgmt': ['admin_invoice_'],
'admin_credit_mgmt': ['admin_credit_'],
'admin_notification_setup': ['admin_notification_'],
'admin_distributor_portal': ['admin_portal_'],
'admin_target_vs_actual': ['admin_target_'],
'admin_hierarchy_targets': ['admin_hierarchy_'],
'admin_user_mgmt': ['admin_user_'],
'admin_pincode_master': ['admin_pincode_'],  // if objects exist
'admin_tax_master': ['tax_master_'],
```

**Database migration**: Seed any missing permission objects (pincode master, system settings) for the System Administrator profile.

No other files need changes. The `AdminControls.tsx` page already reads from `permittedAdminPaths` which will automatically include the newly matched paths.

