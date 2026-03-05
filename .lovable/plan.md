

## Add Maharashtra HDI & Literacy Data to Pincode Master

### Overview
When "MAHARASHTRA" is selected as state and a district is chosen, display HDI and Literacy Rate info boxes — similar to the existing Karnataka HDI display.

### Changes

**1. New file: `src/data/maharashtraHDI.ts`**
- Create a new data file with a `MaharashtraDistrictHDI` interface containing `hdi` and `literacyRate` fields
- Export `maharashtraDistrictHDI` as a `Record<string, MaharashtraDistrictHDI>` with all 36 districts from the uploaded file, keyed by lowercase district name
- Include alternate spellings (e.g., "aurangabad" and "sambhaji nagar", "osmanabad" and "dharashiv")

**2. Edit: `src/components/admin/PincodeMasterLookup.tsx`**
- Import the new `maharashtraDistrictHDI` data
- Add a new conditional block after the Karnataka HDI section: when `selectedState === 'MAHARASHTRA'` and a district is selected, look up the district data and show two info boxes:
  - **HDI** (purple themed, same as Karnataka)
  - **Literacy Rate %** (blue themed)
- Include source attribution text

### File Summary

| File | Action |
|------|--------|
| `src/data/maharashtraHDI.ts` | **New** — HDI + Literacy data for 36 Maharashtra districts |
| `src/components/admin/PincodeMasterLookup.tsx` | **Edit** — add Maharashtra HDI display block |

