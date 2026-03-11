

# Fix: Switch to Static Noto Sans Font Files

## Problem
The current font URLs point to variable-weight Noto Sans fonts (`v36` with axis parameters), which jsPDF cannot parse correctly — causing a `/BBox` error in Adobe and broken `₹` rendering.

## Change
**File:** `src/components/analytics/SupervisorReport.tsx` — lines 1517-1520 only.

Replace the font URLs with static `v27` variants:

```
Regular: https://fonts.gstatic.com/s/notosans/v27/o-0IIpQlx3QUlC5A4PNr6TRAsA.ttf
Bold:    https://fonts.gstatic.com/s/notosans/v27/o-0NIIpQlx3QUlC5A4PNjXhFVNyB.ttf
```

Also remove the unused `fontBaseUrl` variable on line 1517.

No other files or sections are touched.

