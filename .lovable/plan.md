

## Problem

The System Administrator profile only has **80** permission objects in the database, but the application defines **~200** permission objects in the master list (`permissionModules.ts`). The previous migration used `SELECT DISTINCT object_name FROM profile_object_permissions` to seed permissions -- but since those missing modules were never saved for **any** profile, they were never created.

**Missing module prefixes** (causing hidden nav items and dashboard sections):
- `retailer_` (All Retailers)
- `beat_` (My Beats)
- `target_` (My Target)
- `gamification_` (Leaderboard)
- `scheme_` (Schemes)
- `competition_` (Competition Master)
- `distributor_` (Distributor Master)
- `primary_order_` (Primary Orders)
- `territory_` (Territories)
- `packing_list_` (Packing List)
- `delivery_` (My Deliveries)
- `recycle_` (Recycle Bin)
- `competency_` (Competency)
- Plus many admin sub-features (price book, van sales, feature mgmt, etc.)

## Fix

Create a single database migration that inserts **all** permission objects from the master `PERMISSION_MODULES` list for the System Administrator profile, with all flags set to `true`.

### Technical Details

**File to create:** 1 new migration file

The migration will:
1. Hard-code the complete list of ~200 object names from `permissionModules.ts` (`getAllModulePermissionItems()` output)
2. INSERT all of them for profile_id `3385dd99-c4f7-455b-94d7-c7b5105565ce` (System Administrator)
3. Use `ON CONFLICT (profile_id, object_name) DO UPDATE` to ensure existing rows get updated and new rows get created
4. Set `can_read`, `can_create`, `can_edit`, `can_delete`, `can_view_all`, `can_modify_all` all to `true`

This is a **data-only** fix -- no frontend code changes needed. The permission checks already work correctly; they just need the data to exist.

