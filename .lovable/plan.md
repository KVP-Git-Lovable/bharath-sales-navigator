

# Fix: Activities Should Count as Visits + Add Check-in/Check-out for Activities

## Problem 1: "No visits found" Shows When Activities Exist
When a user has only activities (no retailer visits) for a date, the page shows "No visits found" — but activities ARE visits (they create a record in the `visits` table with `visit_type = 'activity'`).

## Problem 2: No Check-in/Check-out on Activity Cards
Activity cards currently show name, type, duration, and remarks — but no way to check in or check out, unlike regular retailer visit cards.

---

## Changes

### 1. Hide "No visits found" when activities exist

**File:** `src/pages/MyVisits.tsx` (line ~1501)

The `ActivityEventsTable` component already fetches activities and renders above the empty state. The fix is to pass a callback or use a shared state so MyVisits knows whether activities exist for the selected date. When activities are present, the "No visits found" card should be hidden.

Approach: Add an `onActivitiesLoaded` callback prop to `ActivityEventsTable` that reports the count back to MyVisits. Then include `hasActivities` in the empty-state condition:

```
// Before (line 1501):
{!dataLoading && hasLoadedOnce && filteredVisits.length === 0 && (plannedBeats.length === 0 || searchTerm !== '') ? ...

// After:
{!dataLoading && hasLoadedOnce && filteredVisits.length === 0 && !hasActivities && (plannedBeats.length === 0 || searchTerm !== '') ? ...
```

### 2. Add Check-in / Check-out buttons to ActivityEventsTable

**File:** `src/components/ActivityEventsTable.tsx`

Each activity has a `visit_id` linking to the `visits` table, which already has `check_in_time` and `check_out_time` columns. The plan:

- Fetch the linked visit's check-in/check-out status alongside each activity
- Add Check In / Check Out buttons to each activity card (similar style to VisitCard but compact)
- On Check In: update `visits` SET `check_in_time = now(), status = 'in-progress'` WHERE `id = activity.visit_id`
- On Check Out: update `visits` SET `check_out_time = now(), status = 'productive'` WHERE `id = activity.visit_id`
- Show check-in/out timestamps when already checked in/out
- Only allow check-in/out for today's activities

### 3. Update ActivityEventsTable data fetching

**File:** `src/hooks/useActivityEvents.ts`

Update `fetchActivitiesForDate` to also join/fetch the linked visit's `check_in_time` and `check_out_time` so the UI can display status. Alternatively, fetch visits separately in the component.

---

## Technical Details

### MyVisits.tsx changes
- Add `const [hasActivities, setHasActivities] = useState(false);`
- Pass `onActivitiesLoaded={(count) => setHasActivities(count > 0)}` to `ActivityEventsTable`
- Add `hasActivities` to the empty-state condition guard

### ActivityEventsTable.tsx changes
- Fetch linked visit data: query `visits` table for `check_in_time, check_out_time, status` using each activity's `visit_id`
- Add Check In button (green, with LogIn icon) -- enabled only if today and not yet checked in
- Add Check Out button (outline, with LogOut icon) -- enabled only after check-in
- Show timestamps: "Checked in at 10:30 AM" / "Checked out at 2:15 PM"
- Supabase update calls to `visits` table on button click
- Dispatch `visitDataChanged` event after check-in/out for UI refresh

### ActivityEventsTable props update
```typescript
interface ActivityEventsTableProps {
  userId: string;
  selectedDate: string;
  onActivitiesLoaded?: (count: number) => void;  // NEW
}
```

### Activity card layout after changes
```
+------------------------------------------+
| Activity Name              [Event Badge] |
| Clock: 10:00 AM - 2:00 PM  Pin: Site X  |
| Remarks: "Promotion setup..."           |
| [Check In]  [Check Out]    In: 10:05 AM |
+------------------------------------------+
```

## No Database Schema Changes Needed
The `visits` table already has `check_in_time` and `check_out_time` columns. Activity events already link to visits via `visit_id`. We just need to use these existing columns.
