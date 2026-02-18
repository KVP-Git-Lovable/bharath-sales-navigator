

## Show Karnataka District HDI Data as Info Boxes

When the user selects **KARNATAKA** as the state and picks a district, display the corresponding HDI (Human Development Index) data from the uploaded CSV as small summary boxes above the PIN code table.

### Data Overview
The CSV contains 31 Karnataka districts with 4 metrics each:
- **Health Index** (e.g., 0.777)
- **Education Index** (e.g., 0.515)  
- **Standard of Living Index** (e.g., 0.497)
- **HDI** (e.g., 0.583)

### Implementation Steps

**Step 1: Store the CSV data as a static constant**

Create a new file `src/data/karnatakaHDI.ts` containing the district-level HDI data as a typed Record, mapping district names to their index values. This avoids runtime file loading.

**Step 2: Update PincodeMasterLookup.tsx**

When `selectedState === 'KARNATAKA'` and a district is selected:
- Look up the selected district name in the HDI data (case-insensitive matching, since the pincode_master table may store district names in uppercase like "BAGALKOT" while the CSV has "Bagalkot")
- Render 4 small colored boxes in a grid above the PIN code table showing:
  - Health Index (green-toned box)
  - Education Index (blue-toned box)
  - Standard of Living Index (amber-toned box)
  - HDI (purple-toned box)

Each box will display the metric name as a label and the value prominently.

### Technical Details

**New file: `src/data/karnatakaHDI.ts`**
```typescript
export interface DistrictHDI {
  healthIndex: number;
  educationIndex: number;
  standardOfLivingIndex: number;
  hdi: number;
}

export const karnatakaDistrictHDI: Record<string, DistrictHDI> = {
  "bagalkot": { healthIndex: 0.777, educationIndex: 0.515, standardOfLivingIndex: 0.497, hdi: 0.583 },
  "ballari": { healthIndex: 0.58, educationIndex: 0.422, standardOfLivingIndex: 0.524, hdi: 0.501 },
  // ... all 31 districts, keyed by lowercase name
};
```

**Modified file: `src/components/admin/PincodeMasterLookup.tsx`**

Insert a new section between the district dropdown and the pincodes list (after line 141, before line 143):

```tsx
{selectedState === 'KARNATAKA' && selectedDistrict && (() => {
  const hdiData = karnatakaDistrictHDI[selectedDistrict.toLowerCase()];
  if (!hdiData) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-center">
        <p className="text-[10px] text-green-600 font-medium uppercase">Health Index</p>
        <p className="text-lg font-bold text-green-700 dark:text-green-400">{hdiData.healthIndex}</p>
      </div>
      <div className="rounded-lg bg-blue-50 ... p-3 text-center">
        <p className="text-[10px] ...">Education Index</p>
        <p className="text-lg font-bold ...">{hdiData.educationIndex}</p>
      </div>
      <div className="rounded-lg bg-amber-50 ... p-3 text-center">
        <p className="text-[10px] ...">Standard of Living</p>
        <p className="text-lg font-bold ...">{hdiData.standardOfLivingIndex}</p>
      </div>
      <div className="rounded-lg bg-purple-50 ... p-3 text-center">
        <p className="text-[10px] ...">HDI</p>
        <p className="text-lg font-bold ...">{hdiData.hdi}</p>
      </div>
    </div>
  );
})()}
```

### District Name Matching

The pincode_master table likely stores district names in uppercase (e.g., "BAGALKOT"), while the CSV uses title case ("Bagalkot"). The lookup will normalize both to lowercase for matching. This handles any casing differences automatically.

### Summary
- 1 new file (`src/data/karnatakaHDI.ts`) -- static data, no API calls needed
- 1 modified file (`src/components/admin/PincodeMasterLookup.tsx`) -- add HDI boxes UI
- Only shows when state is KARNATAKA and a district is selected
- 4 color-coded metric boxes in a 2x2 grid

