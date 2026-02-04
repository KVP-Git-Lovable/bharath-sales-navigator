

## Plan: Align "Time at Retailers" Calculation with TodaySummary

### Problem Identified
The "Time at Retailers" metric in the Analytics dashboard (`AttendanceMarketHoursSection.tsx`) uses a different calculation than the same metric shown in the `/today-summary` page:

| Current Location | Calculation Logic |
|------------------|-------------------|
| **TodaySummary** | Duration from **first visit start_time** to **last visit start_time** |
| **Analytics** | Sum of individual visit durations (`end_time` - `start_time` for each log) |

This creates data inconsistency where the same metric shows different values depending on where you view it.

### Solution
Update `AttendanceMarketHoursSection.tsx` to use the same calculation logic as TodaySummary — calculating "Time at Retailers" as the span from the first retailer visit to the last retailer visit for each user on each date.

### Implementation Steps

**1. Modify the retailer time calculation in `AttendanceMarketHoursSection.tsx`**

Replace the current logic that sums individual visit durations with:
- For each user and date, find the **earliest** `start_time` (first visit)
- Find the **latest** `start_time` (last visit) — matching TodaySummary which uses `start_time` for both, since `end_time` gets batch-updated
- Calculate the difference between last and first start times
- Convert to hours

**Current Logic (to be replaced):**
```text
For each visit log:
  hours += (end_time - start_time)
Total = sum of all individual durations
```

**New Logic (matching TodaySummary):**
```text
For each (user, date) group:
  firstStartTime = earliest start_time
  lastStartTime = latest start_time
  Total = lastStartTime - firstStartTime
```

### Technical Details

**File to modify:** `src/components/analytics/AttendanceMarketHoursSection.tsx`

**Changes in the `fetchData` function (lines 113-182):**

1. Remove the filtering for `end_time` not null (only require `start_time`)
2. Group visit logs by `user_id` and `visit_date`
3. For each group, find min and max `start_time`
4. Calculate hours as the difference between max and min start times
5. This aligns exactly with how TodaySummary calculates the metric

**Query change:**
```typescript
// Before: requires both start_time AND end_time
.not('start_time', 'is', null)
.not('end_time', 'is', null)

// After: only requires start_time (matching TodaySummary)
.not('start_time', 'is', null)
```

**Processing logic change:**
```typescript
// Group logs by user_id and visit_date
// For each group:
//   - Find earliest start_time
//   - Find latest start_time
//   - Hours = (latest - earliest) / (1000 * 60 * 60)
```

### Expected Outcome
After this change, the "Time at Retailers" value shown in the Analytics dashboard will exactly match the value shown in the TodaySummary page for any given user and date, ensuring consistent reporting across the application.

