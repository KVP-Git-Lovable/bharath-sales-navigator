

## Problem

In the **Security & Access Control → Field Permission** tab (and Action/Widget tabs), entries for **Retailer External Database** are completely missing from the hierarchical permissions definition. **Pincode Master** has field entries (`field_admin_pincode_code`, `field_admin_pincode_area`) but they are limited — only 2 fields, 2 actions, and 2 widgets.

The visibility of these two modules in Admin Controls is already gated by `ADMIN_MODULE_PERMISSION_MAP` (`admin_pincode_master` → `/admin/pincode-master`, `admin_retailer_ext_db` → `/admin/retailer-external-db`), so once the field-level permissions are defined and seeded, the existing enforcement pipeline will work.

## Changes

### 1. Add Retailer External Database entries to `hierarchicalPermissions.ts`

In the `admin_control` module definition, add field/action/widget entries for Retailer External Database alongside the existing Pincode Master entries:

**Fields** (in `fields` array, after the Pincode Master fields):
- `field_admin_retailer_ext_state` — Retailer Ext DB - State
- `field_admin_retailer_ext_city` — Retailer Ext DB - City
- `field_admin_retailer_ext_company` — Retailer Ext DB - Company
- `field_admin_retailer_ext_category` — Retailer Ext DB - Category

**Actions** (in `actions` array, after the Pincode Master actions):
- `action_admin_retailer_ext_search` — Retailer Ext DB - Search
- `action_admin_retailer_ext_export` — Retailer Ext DB - Export

**Widgets** (in `widgets` array, after the Pincode Master widgets):
- `widget_admin_retailer_ext_list` — Retailer Ext DB - List
- `widget_admin_retailer_ext_detail` — Retailer Ext DB - Detail

### 2. Expand Pincode Master entries (optional but recommended)

Add a few more granular fields to Pincode Master for completeness:
- `field_admin_pincode_district` — Pincode Master - District
- `field_admin_pincode_state` — Pincode Master - State

### 3. Database migration — seed the new permission keys

Create a migration that inserts these new permission keys into `profile_object_permissions` for the **System Administrator** profile with full CRUD access (`can_create`, `can_read`, `can_update`, `can_delete` = true), using the same dynamic lookup pattern (`WHERE name = 'System Administrator'`).

### Files to modify
- `src/components/security/hierarchicalPermissions.ts` — add ~10 new entries across fields/actions/widgets arrays
- New Supabase migration — seed the new keys for System Administrator profile

