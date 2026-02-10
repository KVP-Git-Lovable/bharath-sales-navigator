

## Fix: Add Parameter Detail Section to Admin Target Config

### Problem
In the admin "Create Target for FY 2025-26" page (`TargetConfigTab`), selecting a Target Parameter (e.g., Product-wise, Retailer-wise) does not show any corresponding detail section. The component currently only has parameter selection pills and FY Total Targets -- there is no breakdown or detail panel that renders based on the selected parameters.

### What Screenshot 1 Shows (Expected Behavior)
The user-facing `UserFYPlanTarget` component already has a working tabs-based breakdown with:
- Tabs for Products, Retailers, Distributors, Monthly, Territory
- Product categories with quantity/revenue inputs
- Equal divide option
- Total footer

This same type of breakdown section needs to appear in the admin `TargetConfigTab` after selecting target parameters.

### Solution
Add a dynamic parameter detail section to `TargetConfigTab` (below the FY Total Targets section) that renders tabs based on which parameters are enabled. This section will show:

1. **Tabs row** matching enabled parameters (Products, Retailers, Distributors, Monthly, Territory)
2. **Tab content** for each parameter showing the relevant breakdown items fetched from the database (product categories, retailers, distributors, months, territories)
3. **Input fields** for quantity and revenue targets per item
4. **Equal divide toggle** to distribute FY totals equally
5. **Total footer** showing sum of all entries

### Technical Changes

**File: `src/components/admin/TargetConfigTab.tsx`**

1. Add new state for the active parameter tab and breakdown data (product categories, retailers, distributors, months)
2. Add data-fetching effects to load products (with categories), retailers, distributors from Supabase when parameters are enabled
3. Add a new section after FY Total Targets (before Action Buttons) containing:
   - A `Tabs` component filtered to only show tabs for enabled parameters
   - Tab content panels for each parameter type:
     - **Products**: Collapsible product categories with quantity/revenue inputs per category
     - **Retailers**: Retailer list with quantity/revenue inputs
     - **Distributors**: Distributor list with quantity/revenue inputs
     - **Monthly**: 12-month breakdown with quantity/revenue inputs
     - **Territory**: Territory list with quantity/revenue inputs
   - An "Equally divide" checkbox that distributes FY totals across all items
   - A total summary footer per tab

4. This mirrors the pattern already used in `UserFYPlanTarget` (lines 1963-2120) but adapted for the admin config context where the data represents company-wide allocation rather than individual user targets.

### Data Sources
- **Products**: `products` table joined with `product_categories`
- **Retailers**: Not applicable at admin level (skip or show placeholder)
- **Distributors**: `distributors` table
- **Monthly**: Static 12-month FY calendar (April to March)
- **Territory**: `territories` table

### UI Layout
The section will render vertically below the FY Total Targets, using the same `Tabs` + `TabsList` + `TabsContent` pattern from the existing UI library. Each tab content will show a list of items with inline quantity/revenue input fields, matching the style shown in Screenshot 1.
