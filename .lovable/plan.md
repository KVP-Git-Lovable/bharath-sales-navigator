

# Plan: Create `pincode_master` Table and Import CSV Data

## Overview
Create a new database table `pincode_master` to store India's PIN code and territory master data from the uploaded CSV file (165,627 records). This will serve as a reference lookup table for validating and enriching address data across the application.

## CSV Data Analysis

| Column | Sample Data | Database Type |
|--------|-------------|---------------|
| `officename` | "Kothimir B.O", "Papanpet B.O" | `TEXT` |
| `Territory_PO` | "Kothimir", "Papanpet" | `TEXT` |
| `pincode` | 504273, 504299 | `TEXT` (preserve leading zeros) |
| `district` | "KUMURAM BHEEM ASIFABAD" | `TEXT` |
| `statename` | "TELANGANA", "WEST BENGAL" | `TEXT` |
| `latitude` | 19.3638689, "NA" | `NUMERIC(10,7)` nullable |
| `longitude` | 79.5376658, "NA" | `NUMERIC(10,7)` nullable |

**Data Notes:**
- Total records: 165,627 rows
- Some coordinates have "NA" values (will be stored as NULL)
- PIN codes should be stored as TEXT to preserve any leading zeros
- Covers all Indian states and union territories

## Implementation Plan

### Step 1: Create Database Migration
Create a new migration file to define the `pincode_master` table:

```sql
CREATE TABLE public.pincode_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    officename TEXT NOT NULL,
    territory_po TEXT,
    pincode TEXT NOT NULL,
    district TEXT,
    statename TEXT,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for common lookups
CREATE INDEX idx_pincode_master_pincode ON public.pincode_master(pincode);
CREATE INDEX idx_pincode_master_district ON public.pincode_master(district);
CREATE INDEX idx_pincode_master_statename ON public.pincode_master(statename);

-- Enable RLS
ALTER TABLE public.pincode_master ENABLE ROW LEVEL SECURITY;

-- Read-only policy for all authenticated users (reference data)
CREATE POLICY "Anyone can read pincode_master"
    ON public.pincode_master FOR SELECT
    TO authenticated
    USING (true);

-- Admin-only write policy
CREATE POLICY "Admins can manage pincode_master"
    ON public.pincode_master FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
```

### Step 2: Create Edge Function for Bulk Import
Due to the large dataset (165K+ rows), create an edge function `import-pincode-master` that:
1. Accepts CSV data in chunks
2. Parses and validates each row
3. Handles "NA" values for latitude/longitude
4. Uses batch inserts for performance

### Step 3: Create Admin Import UI Component
Add a component in the Admin Controls section to:
1. Upload the CSV file
2. Parse with the existing XLSX library
3. Send data to the edge function in batches (1000 rows per batch)
4. Show progress and completion status

### Step 4: Update TypeScript Types
The Supabase types will auto-generate after migration. The expected interface:

```typescript
interface PincodeMaster {
  id: string;
  officename: string;
  territory_po: string | null;
  pincode: string;
  district: string | null;
  statename: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | Create | New table schema with indexes and RLS |
| `supabase/functions/import-pincode-master/index.ts` | Create | Edge function for bulk data import |
| `src/components/admin/PincodeMasterImport.tsx` | Create | Admin UI for CSV upload and import |
| `src/pages/AdminControls.tsx` | Modify | Add Pincode Master import section |

## Data Flow Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      Pincode Master Import Flow                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐ │
│   │   CSV File   │───>│  Admin UI    │───>│  Edge Function       │ │
│   │  (165K rows) │    │  (Chunking)  │    │  (Batch Insert)      │ │
│   └──────────────┘    └──────────────┘    └──────────────────────┘ │
│                                                  │                  │
│                                                  ▼                  │
│                                           ┌──────────────┐         │
│                                           │ pincode_     │         │
│                                           │ master table │         │
│                                           └──────────────┘         │
│                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Technical Details

### Edge Function Logic
```typescript
// Handle batch processing
const BATCH_SIZE = 500;

// Parse coordinates, handling "NA" values
const parseCoordinate = (val: string): number | null => {
  if (!val || val === 'NA' || val === 'na') return null;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
};

// Batch insert for performance
for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  await supabase.from('pincode_master').insert(batch);
}
```

### RLS Policies Rationale
- **Read access for all authenticated users**: This is reference data needed by sales users, retailers lookup, and territory management
- **Write access only for admins**: Prevents accidental modifications to master data

#Don't integrate with any module. Just upload to database and keep

