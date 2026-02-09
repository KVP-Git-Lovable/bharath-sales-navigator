

# Changes to Analytics

## 1. Update Retailer Monthly Productivity Subtext

**File**: `src/components/analytics/RetailerMonthlyProductivitySection.tsx` (line 223-225)

- Change text from: `This shows monthly data only. Select "This month" in the dropdown.`
- To: `This shows monthly data only. Select "Last month" in the dropdown.`
- Change color class from `text-destructive/80` to `text-blue-600`

## 2. Fix Productivity % in Order Details to Show Overall Productivity

**File**: `src/components/analytics/SupervisorReport.tsx`

**Problem**: The "Productivity" card in Order Details currently shows **Actual Productivity %** (productive / (productive + unproductive)). The user wants it to show **Overall Productivity %** (productive / planned).

**Current logic** (lines 574-586):
```
totals = sum of productive_visits / sum of total_visits
```
Where `total_visits` from the RPC = productive + unproductive (actual visits only, not planned).

**Fix**: Add a beat_plans query to calculate planned visits for the user, then compute Overall Productivity % = productive / planned.

### Technical Steps

1. In the `fetchUserDetails` function (around line 506), add a new parallel query to fetch beat plans for the user in the date range, then compute planned visits using the same beat-retailer counting logic used in `ProductivitySummarySection`:
   - Fetch `beat_plans` for the user in the date range
   - Get unique beat IDs, fetch retailers assigned to those beats
   - Count unique retailers across all planned dates = total planned visits

2. Update the `productivityPercent` calculation (line 585) to use:
   ```
   productivityPercent = (totalProductive / totalPlanned) * 100
   ```
   instead of `productive / total_visits`.

3. The `detailsSummary` state and display code (line 2264-2267) remain unchanged since they already reference `productivityPercent`.

