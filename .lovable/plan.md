

## Fix: Enforce GPS Location for All Retailer Creation + Auto-Capture for Existing Retailers

### Current State

1. **Main Add Retailer form** (`AddRetailer.tsx`): Already validates GPS -- won't save without coordinates. This is working correctly.
2. **Inline Add Retailer form** (`AddRetailerInlineToBeat.tsx`): Does NOT validate GPS -- allows saving without location. This is a gap.
3. **Auto-capture during visits** (`useRetailerVisitTracking.ts`): Already auto-captures the user's GPS as the retailer's location when a retailer has no coordinates and the user checks in. This works during visit tracking.

### What Will Change

**1. Add GPS validation to the Inline Retailer Form (`AddRetailerInlineToBeat.tsx`)**
- Add the same GPS mandatory check that exists in the main form
- Block saving if latitude/longitude are empty
- Show a clear error message: "GPS location is required -- please tap the location button"
- Add a visual validation indicator (red border) on the location section when GPS is missing

**2. Auto-capture retailer GPS during order placement**
- When a user opens the order page for a retailer that has no GPS coordinates, automatically capture the user's current location and save it to the retailer record
- This happens silently in the background -- no extra step for the user
- A small toast notification confirms: "Retailer location updated automatically"
- This supplements the existing auto-capture during visit check-in

**3. No APK changes needed**
- All changes are in the web app code (React), which loads dynamically in the APK's WebView
- The existing APK will automatically pick up these changes

### Files to Modify

- `src/components/AddRetailerInlineToBeat.tsx` -- Add GPS validation to `handleSave()`
- `src/pages/PlaceOrder.tsx` (or equivalent order page) -- Add auto-capture logic for retailers without GPS when the order page loads

### Technical Details

**Inline form validation addition:**
```
// In handleSave():
if (!retailerData.latitude || !retailerData.longitude) {
  toast({ title: 'Location Required', description: 'Please tap the location button to capture GPS coordinates', variant: 'destructive' });
  return;
}
```

**Auto-capture on order page load:**
- On mount, check if the selected retailer has latitude/longitude
- If not, silently call `navigator.geolocation.getCurrentPosition()`
- Update the retailer record in Supabase with the captured coordinates
- This uses the same pattern already proven in `useRetailerVisitTracking.ts`

### What Stays the Same
- The main Add Retailer form validation (already working)
- The auto-capture during visit check-in (already working)
- No changes to the APK or native code

