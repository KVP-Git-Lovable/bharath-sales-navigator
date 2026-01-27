
# Distributor Company Profile Feature Implementation Plan

## Current State Analysis

### Existing Infrastructure
1. **Document Settings System** (`src/utils/documentHeaderSource.ts`): Already supports switching between "Company" and "Distributor" as the header source for invoices/challans
2. **Company Settings** (`src/components/invoice/CompanySettings.tsx`): Complete company profile form with logo, bank details, UPI QR, terms & conditions
3. **Distributor Portal Profile** (`src/pages/distributor-portal/DistributorProfile.tsx`): Basic business profile (contact info, SWOT) - missing invoice-related fields
4. **Distributor Detail** (`src/pages/DistributorDetail.tsx`): Has 7 tabs (Overview, Primary, Secondary, Network, Portal, Pricing, FY Plan) - missing Company Profile tab
5. **Invoice Generator** (`src/utils/invoiceGenerator.ts`): Uses company data for headers, but `getDistributorHeaderData()` in `documentHeaderSource.ts` attempts to read from `retailers` table (incorrect - distributors are in `distributors` table)

### Gap Analysis
- **Database**: `distributors` table lacks invoice-related columns (bank_name, bank_account, ifsc, account_holder_name, logo_url, qr_code_url, qr_upi, terms_conditions, state)
- **UI**: No Company Profile tab in Distributor Master detail view
- **Distributor Portal**: Missing invoice settings in the Business Profile
- **Data Flow**: `getDistributorHeaderData()` queries wrong table (`retailers` instead of `distributors`)

---

## Implementation Plan

### Step 1: Database Schema Update
Add invoice-related columns to the `distributors` table:

```sql
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS bank_account text;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS ifsc text;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS account_holder_name text;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS qr_code_url text;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS qr_upi text;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS terms_conditions text;
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS state text;
```

---

### Step 2: Create Distributor Company Profile Component
Create `src/components/distributor/DistributorCompanyProfile.tsx` - a reusable component mirroring `CompanySettings.tsx` structure:

**Features:**
- Logo upload with Supabase storage
- Company details (name is read-only, GST, state)
- Bank details (bank name, account, IFSC, account holder)
- UPI details (UPI ID, QR code upload)
- Terms & conditions text area

**Props:**
- `distributorId: string`
- `readOnly?: boolean` (for admin viewing distributor-entered data)

---

### Step 3: Add Company Profile Tab to Distributor Master
Update `src/pages/DistributorDetail.tsx`:

**Changes:**
- Add 8th tab: "Company Profile" after "FY Plan"
- Update grid layout from `sm:grid-cols-7` to `sm:grid-cols-8`
- Add TabsContent with the new `DistributorCompanyProfile` component (readOnly mode for admin view)

```text
Tab order: Overview | Primary | Secondary | Network | Portal | Pricing | FY Plan | Company Profile
```

---

### Step 4: Enhance Distributor Portal with Company Profile Settings
Update `src/pages/distributor-portal/DistributorProfile.tsx`:

**Changes:**
- Add new tab "Invoice Settings" alongside existing tabs (Details, Business Info, SWOT)
- Include same fields as admin Company Profile:
  - Logo upload
  - Bank details
  - UPI QR code
  - Terms & conditions
- This allows distributors to manage their own invoice header data

---

### Step 5: Fix Document Header Source Logic
Update `src/utils/documentHeaderSource.ts`:

**Current Bug:** `getDistributorHeaderData()` queries `retailers` table
**Fix:** Query `distributors` table instead

```typescript
// Change from:
const { data: distributor } = await supabase
  .from('retailers')
  .select('*')
  .eq('id', retailer.distributor_id)
  .single();

// To:
const { data: distributor } = await supabase
  .from('distributors')
  .select('*')
  .eq('id', retailer.distributor_id)
  .single();
```

Also update field mappings:
- `distributor.gst_number` stays the same
- Add new fields: `bank_name`, `bank_account`, `ifsc`, `account_holder_name`, `logo_url`, `qr_code_url`, `qr_upi`, `terms_conditions`, `state`

---

### Step 6: Update Invoice Generator Integration
The invoice generator (`src/utils/invoiceGenerator.ts`) already receives `company` data. To support distributor headers:

**Changes to invoice generation flow:**
1. When generating invoice, check Document Settings
2. If source = "distributor", call `getDocumentHeaderData('invoices', retailerId)` 
3. Use returned data as `company` parameter for invoice generation

This requires updating places that call `generateTemplate4Invoice()` to:
- Fetch retailer's distributor mapping
- Get appropriate header data based on settings

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| Database migration | Create | Add 9 columns to `distributors` table |
| `src/components/distributor/DistributorCompanyProfile.tsx` | Create | New reusable company profile form |
| `src/pages/DistributorDetail.tsx` | Modify | Add 8th "Company Profile" tab |
| `src/pages/distributor-portal/DistributorProfile.tsx` | Modify | Add "Invoice Settings" tab |
| `src/utils/documentHeaderSource.ts` | Modify | Fix to query `distributors` table, map new fields |
| `src/pages/distributor-portal/DMSLayout.tsx` | Modify (optional) | Add "Company Profile" as separate nav item if preferred |

---

## Data Flow After Implementation

```text
1. Admin configures Document Settings:
   - Enables "Distributor Details"
   - Sets Invoices source to "Distributor"

2. Distributor fills Company Profile (via Portal or admin enters in Master)

3. Admin/User assigns distributor to retailer (retailers.distributor_id)

4. Invoice generation:
   a. System checks Document Settings → Invoices = "Distributor"
   b. Looks up retailer → finds distributor_id
   c. Fetches distributor's company profile from distributors table
   d. Uses distributor's logo, bank details, terms in invoice header
   e. Falls back to company details if no distributor or fields missing
```

---

## Technical Details

### Storage Bucket
Logo and QR uploads will use existing `company-assets` bucket with paths:
- `distributor-logos/{distributorId}-{timestamp}.{ext}`
- `distributor-qr-codes/{distributorId}-{timestamp}.{ext}`

### Validation
- GST format validation (optional)
- Bank account number (numeric validation)
- IFSC code format (11 characters, starts with 4 letters)

### Security
- Distributor Portal users can only edit their own distributor's profile
- Admins can view all distributor profiles in read-only mode from Distributor Master

---

## Definition of Done

1. Distributors table has all invoice-related columns
2. "Company Profile" tab visible in Distributor Master with all settings
3. Distributor Portal has "Invoice Settings" tab where distributors can update their profile
4. When Document Settings has Invoices = "Distributor", invoices show distributor's:
   - Logo
   - Company name and address
   - GST number
   - Bank details
   - QR code
   - Terms & conditions
5. Falls back to company data when distributor profile is incomplete
