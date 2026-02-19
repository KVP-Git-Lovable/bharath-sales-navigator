

## Fix: Missing "Retailers" Button on My Visits Page

### Root Cause

A simple typo in the permission prefix check. The code uses `'visit_retailers'` (plural) but the database permissions use `'visit_retailer_'` (singular).

**Database permissions found for this user:**
- `visit_retailer_list`
- `visit_retailer_check_in`
- `visit_retailer_order_entry`
- `visit_retailer_no_order`
- `visit_retailer_create_visit`

**Code check (line 217):**
```
const showRetailers = canShowButton('visit_retailers');
// hasModuleAccess looks for permissions starting with 'visit_retailers' — finds NONE
```

### Fix

**File: `src/pages/MyVisits.tsx` (line 217)**

Change:
```
const showRetailers = canShowButton('visit_retailers');
```
To:
```
const showRetailers = canShowButton('visit_retailer');
```

This single-character fix (`visit_retailers` to `visit_retailer`) will restore the Retailers button.

### Important Note

The build is currently broken due to invalid JSON in `package-lock.json` (merge conflict markers). You must delete that file manually so it can regenerate before the fix can be verified in preview.

