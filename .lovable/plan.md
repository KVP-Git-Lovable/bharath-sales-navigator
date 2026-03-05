

## Retailer External Database — Implementation Plan

### Overview
Add a new admin module "Retailer External Database" that stores ~9,500 grocery retailer records from the uploaded Excel file. Users select State, then City, and see a table of matching retailers with their name, address, mobile, email, PIN code, and category.

### Database Design

**1. Create table `retailer_external_db`**
```sql
CREATE TABLE retailer_external_db (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_name text NOT NULL,
  address text,
  city text NOT NULL,
  pincode text,
  state text NOT NULL,
  mobile text,
  email text,
  website text,
  category text
);

-- Indexes for fast state→city→records lookup
CREATE INDEX idx_retailer_ext_state ON retailer_external_db (state);
CREATE INDEX idx_retailer_ext_state_city ON retailer_external_db (state, city);

-- RLS: authenticated users can read
ALTER TABLE retailer_external_db ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read" ON retailer_external_db
  FOR SELECT TO authenticated USING (true);
```

**2. DB functions for dropdowns (avoids fetching all rows)**
```sql
CREATE FUNCTION get_retailer_ext_states() RETURNS TABLE(state text) ...
CREATE FUNCTION get_retailer_ext_cities(selected_state text) RETURNS TABLE(city text) ...
```

**3. Data import**
Insert all ~9,576 rows from the Excel file using the insert tool (batched). Data will be cleaned: trim whitespace, normalize state/city casing to title case.

### Frontend Changes

**4. Admin module entry in `AdminControls.tsx`**
- Add a new card: "Retailer External Database" with path `/admin/retailer-external-db`, icon `Database`, color `orange`.

**5. Permission mapping in `useProfilePermissions.ts`**
- Add `'admin_retailer_ext_db': '/admin/retailer-external-db'` to `ADMIN_MODULE_PERMISSION_MAP`.
- Add sub-prefix entry.

**6. New page: `src/pages/admin/RetailerExternalDBPage.tsx`**
- Standard admin page with back button, admin access check.
- Renders the lookup component.

**7. New component: `src/components/admin/RetailerExternalDBLookup.tsx`**
- Two dropdowns: Select State → Select City (city populates only after state is selected, same pattern as PincodeMasterLookup).
- When city is selected, fetch matching retailers from `retailer_external_db` table.
- Display results in a responsive table/card layout showing: Company Name, Address, Mobile, Email, PIN Code, Category.
- Pagination or virtual scroll for cities with many entries.

**8. Route in `App.tsx`**
- Add protected route for `/admin/retailer-external-db`.

### Data Notes
- ~9,576 records across states like Rajasthan, Maharashtra, Gujarat, Telangana, Karnataka, Delhi, UP, MP, etc.
- Columns mapped: COMPANY NAME → company_name, ADD → address, CITY → city, PIN → pincode, STATE → state, MOBILE No. → mobile, EMAIL → email, WEB → website, DETAILS → category.
- Using `bigint` identity PK and text columns (no uuid overhead for reference data).
- Composite index on (state, city) ensures fast filtered queries.

### Files to create/edit
| File | Action |
|------|--------|
| DB migration | Create table, indexes, RLS, functions |
| DB insert | Batch insert ~9,576 rows |
| `src/pages/admin/RetailerExternalDBPage.tsx` | Create |
| `src/components/admin/RetailerExternalDBLookup.tsx` | Create |
| `src/pages/AdminControls.tsx` | Add module card |
| `src/hooks/useProfilePermissions.ts` | Add permission mapping |
| `src/App.tsx` | Add route + import |

