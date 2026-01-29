
# Plan: Fix "End My Day" to Auto-Capture All Activities

## Problem Summary

When clicking "End My Day" in the Attendance module, the system currently:
- Records attendance check-out time and location
- Cancels remaining "planned" visits
- Stops GPS tracking

**However, it fails to:**
1. Close "in-progress" visits with proper check-out times and mark them as 'unproductive'
2. Close active `retailer_visit_logs` entries (which track detailed time spent per retailer)

This leaves incomplete data in the system, affecting reports and analytics.

---

## Solution Overview

Enhance the "End My Day" check-out flow in `Attendance.tsx` to:
1. Auto-checkout all in-progress visits using their `updated_at` timestamp as the last activity time
2. Close all active retailer visit logs with proper time calculations

---

## Technical Implementation

### File: `src/pages/Attendance.tsx`

**Location:** After line 756 (after cancelling planned visits), add the following logic:

### Step 1: Auto-Checkout In-Progress Visits

```text
// Auto-checkout all in-progress visits using their last activity time
const { data: inProgressVisits } = await supabase
  .from('visits')
  .select('id, updated_at')
  .eq('user_id', user.id)
  .eq('planned_date', today)
  .eq('status', 'in-progress');

if (inProgressVisits && inProgressVisits.length > 0) {
  for (const visit of inProgressVisits) {
    // Use visit's updated_at as last activity time, fallback to current time
    const checkOutTime = visit.updated_at || timestamp;
    
    await supabase
      .from('visits')
      .update({
        check_out_time: checkOutTime,
        check_out_location: freshLocation,
        check_out_address: `${freshLocation.latitude}, ${freshLocation.longitude}`,
        status: 'unproductive',
        updated_at: new Date().toISOString()
      })
      .eq('id', visit.id);
  }
  console.log(`Auto checked-out ${inProgressVisits.length} in-progress visits`);
}
```

### Step 2: Close Active Retailer Visit Logs

```text
// Close all active retailer visit logs
const { data: activeLogs } = await supabase
  .from('retailer_visit_logs')
  .select('id, start_time, updated_at')
  .eq('user_id', user.id)
  .eq('visit_date', today)
  .is('end_time', null);

if (activeLogs && activeLogs.length > 0) {
  for (const log of activeLogs) {
    // Use updated_at as last activity time, fallback to current time
    const endTime = log.updated_at || timestamp;
    const startTimeMs = new Date(log.start_time).getTime();
    const endTimeMs = new Date(endTime).getTime();
    const timeSpentSeconds = Math.floor((endTimeMs - startTimeMs) / 1000);

    await supabase
      .from('retailer_visit_logs')
      .update({
        end_time: endTime,
        time_spent_seconds: Math.max(0, timeSpentSeconds)
      })
      .eq('id', log.id);
  }
  console.log(`Closed ${activeLogs.length} active retailer visit logs`);
}
```

---

## Why "unproductive" Status?

When a visit is auto-closed by "End My Day":
- The salesperson did not complete the visit workflow normally
- No order was placed (otherwise it would already be 'productive')
- Therefore, marking as 'unproductive' is the correct business logic

---

## Data Flow After Implementation

```text
User clicks "End My Day"
        │
        ▼
┌─────────────────────────────────────────────┐
│ 1. Record attendance check-out              │
│    (time, location, photo, face match)      │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ 2. Cancel all 'planned' visits              │
│    (existing behavior - unchanged)          │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ 3. NEW: Auto-checkout 'in-progress' visits  │
│    - Set check_out_time = updated_at        │
│    - Set status = 'unproductive'            │
│    - Set check_out_location = GPS           │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ 4. NEW: Close active retailer_visit_logs    │
│    - Set end_time = updated_at              │
│    - Calculate time_spent_seconds           │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ 5. Stop GPS tracking                        │
│    (existing behavior - unchanged)          │
└─────────────────────────────────────────────┘
```

---

## Summary of Changes

| File | Change Description |
|------|-------------------|
| `src/pages/Attendance.tsx` | Add auto-checkout logic for in-progress visits and retailer visit logs after line 756 |

This ensures complete data capture when ending the day, maintaining data integrity for reports and analytics.
