
# Add New Gamification Activity: Total Visits

## Overview
Add a new gamification activity that awards 20 points when a user completes 50 or more total visits in a day. Partial completion should not award points.

## Activity Specifications
| Property | Value |
|----------|-------|
| Activity Name | Total Visits |
| Daily Target | 50 visits |
| Points Awarded | 20 points |
| Condition | All-or-nothing (50+ visits required) |
| Point Value | 1 point = ₹1 (existing conversion) |

## Code Changes

### 1. Add New Metric Type (`src/components/GamificationManagement.tsx`)

Add a new entry to the `METRIC_TYPES` array (after line 138):

```javascript
{
  value: "total_visits",
  label: "Total Visits",
  defaultPoints: 20,
  configType: "visit_threshold",
  description: "Awarded once per day when user completes the daily visit target (50+ visits required, no partial points)"
}
```

### 2. Add Validation for New Config Type

Update the validation logic in both `createActivity` and `updateActivity` functions to include:

```javascript
if (activityConfigType === "visit_threshold" && !metricConfig.daily_visit_target) {
  toast.error("Please configure daily visit target");
  return;
}
```

### 3. Add Configuration UI (`src/components/MetricConfigFields.tsx`)

Add a new case for `"total_visits"` in the switch statement:

```javascript
case "total_visits":
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <h4 className="font-semibold text-sm">Configuration</h4>
      <div>
        <Label htmlFor="dailyVisitTarget">Daily Visit Target</Label>
        <Input
          id="dailyVisitTarget"
          type="number"
          min="1"
          value={config?.daily_visit_target || 50}
          onChange={(e) => handleConfigUpdate("daily_visit_target", parseInt(e.target.value))}
          placeholder="e.g., 50"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Minimum number of total visits required per day to earn points
        </p>
      </div>
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Points are only awarded when the user meets or exceeds the target. 
          Partial completion does not award any points.
        </p>
      </div>
    </div>
  );
```

### 4. Save Configuration to Database

Update both `createActivity` and `updateActivity` to save the new config field in the `metadata` column (since `daily_visit_target` doesn't have a dedicated column yet):

```javascript
// In the insert/update call
metadata: {
  ...metricConfig,
  daily_visit_target: metricConfig.daily_visit_target || null,
}
```

## Files to be Modified

| File | Change |
|------|--------|
| `src/components/GamificationManagement.tsx` | Add new metric type, validation, and config saving |
| `src/components/MetricConfigFields.tsx` | Add configuration UI for total visits |

## Technical Notes

- **No Database Migration Required**: The `metadata` JSONB column can store the `daily_visit_target` configuration without schema changes
- **Existing Conversion Logic**: Uses `points_to_rupee_conversion` from `gamification_games` table (already supports 1 point = ₹1)
- **Tracking Logic**: The actual visit counting would be handled by the existing `gamification_daily_tracking` table when the backend awards points

## How It Will Work

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Total Visits Activity Flow                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User completes visits throughout the day                       │
│              ↓                                                   │
│  System tracks total visits in gamification_daily_tracking      │
│              ↓                                                   │
│  At end of day (or real-time check):                            │
│     IF visits >= 50  →  Award 20 points                         │
│     IF visits < 50   →  No points (partial not allowed)         │
│              ↓                                                   │
│  Points converted at 1 point = ₹1 for redemption                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
