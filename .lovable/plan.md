

## Add Target Duration (Start/End Month) to Target Config

### Problem
Currently, the Target Management module is locked to a full Financial Year (April-March). There is no way to set targets for a specific subset of months (e.g., only July, or April-September).

### Solution
Add a **Target Duration** selector to the Create Target UI that lets the admin pick a Start Month and End Month within the FY. This filters the Monthly parameter breakdown and adjusts equal-divide calculations accordingly.

### Changes

**1. Database: Add two columns to `fy_target_config`**
- `target_start_month` (integer, default 1) -- 1=April, 2=May, ..., 12=March
- `target_end_month` (integer, default 12) -- 1=April, ..., 12=March

These will be added via a Supabase migration.

**2. UI: Add Target Duration section in `TargetConfigTab.tsx`**
- Add a new section between Target Parameters and FY Total Targets
- Two side-by-side Select dropdowns: "Start Month" and "End Month" (April through March)
- Default: April to March (full year)
- Styled consistently with the existing card/pill design

**3. Logic Updates in `TargetConfigTab.tsx`**
- Add `target_start_month` and `target_end_month` to the `TargetConfig` interface and default config
- Filter the Monthly breakdown (`FY_MONTHS`) to only show months within the selected range
- Update equal-divide logic to divide by the number of active months instead of always 12
- Include the new fields in save/load mutations

**4. State flow**
- When the user changes Start/End month, the monthly breakdown items auto-update to show only the relevant months
- Equal divide recalculates based on the active month count
- FY Total Targets remain as the overall target; the duration just controls the breakdown window

### Files Modified
- `src/components/admin/TargetConfigTab.tsx` -- UI + state + logic
- Supabase migration -- add `target_start_month` and `target_end_month` columns

