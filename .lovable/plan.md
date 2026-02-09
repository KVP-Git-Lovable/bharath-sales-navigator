

# Event-Based Activity Feature in My Visit Page

## Overview

Add an "Activity / Event" feature to the My Visit page that lets sales users log event-based activities (celebrations, demos, promotions) with flexible duration options. Activities create visit entries visible only in My Visit, and can be linked to orders and feedback.

## Database Changes

### New Table: `activity_events`

Stores activity metadata linked to a visit record.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| visit_id | uuid (FK -> visits.id) | The visit record this activity created |
| user_id | uuid (FK -> profiles.id) | Who created it |
| activity_type | text | Celebration / Event / Promotion / Demo / Other |
| duration_type | text | hour_based / half_day / full_day / multiple_days |
| activity_date | date | Primary date of the activity |
| start_time | timestamptz | For hour-based: start time |
| end_time | timestamptz | For hour-based: end time |
| half_day_type | text | first_half / second_half (for half day) |
| from_date | date | For multiple days: start date |
| to_date | date | For multiple days: end date |
| total_days | integer | Auto-calculated for multiple days |
| retailer_id | uuid (FK -> retailers.id) | Customer/Outlet (nullable) |
| retailer_name | text | Customer name (stored for display) |
| remarks | text | Notes |
| created_at | timestamptz | Auto-set |

### Visit Record Integration

When an activity is created, a visit record is inserted into the `visits` table with:
- `visit_type = 'activity'` (uses existing column)
- `status = 'planned'` (becomes productive when order is placed)
- Standard `retailer_id`, `user_id`, `planned_date`

RLS policies will mirror existing visit patterns (user can CRUD own records, admins see all).

## UI Components

### 1. Add Activity Modal (`src/components/AddActivityModal.tsx`)

A dialog triggered from the My Visit page with the following form:

**Step 1 -- Duration Selection (Radio Group)**
- Hour-based: Shows Activity Date + Start Time + End Time fields
- Half Day: Shows Activity Date + Half Day Type (First Half / Second Half) dropdown
- Full Day: Shows Activity Date picker only
- Multiple Days: Shows From Date + To Date pickers with auto-calculated total days

**Step 2 -- Common Fields**
- Activity Type dropdown: Celebration / Event / Promotion / Demo / Other
- Customer / Outlet: Searchable retailer select (from user's retailers)
- Remarks: Textarea for notes

**Submit**: Creates both the `activity_events` record and the corresponding `visits` record.

### 2. My Visit Page Changes (`src/pages/MyVisits.tsx`)

- Change the button grid from `grid-cols-3` to `grid-cols-4` to accommodate the new button
- Add "Activity" button with a calendar/sparkle icon next to Van Stock
- Add state for `isActivityModalOpen`
- Import and render `AddActivityModal`
- Activity visits will automatically appear in the visit list (they are regular visit records with `visit_type = 'activity'`)

### 3. VisitCard Activity Display (`src/components/VisitCard.tsx`)

When a visit has `visit_type = 'activity'`:
- Show an "Activity" badge with the activity type (e.g., "Promotion", "Demo")
- Show duration info (e.g., "2 hours", "Half Day", "Full Day", "Jan 5-8")
- Show linked order summary if orders exist
- All existing features (order, feedback, check-in/out) remain functional

### 4. Order Page Integration (`src/pages/Cart.tsx`)

When submitting an order from a visit that is an activity (`visit_type = 'activity'`):
- The order is linked via the existing `visit_id` field (already works)
- The visit status auto-updates to "productive" via the existing `auto_update_visit_status_on_order` trigger
- No additional code needed -- the existing order flow already links to the visit

### 5. Activity Details Hook (`src/hooks/useActivityEvents.ts`)

A small hook to:
- Fetch activity event details for a given visit_id (used by VisitCard for display)
- Cache results to avoid repeated queries
- Create new activity events

## File Changes Summary

| File | Action | What Changes |
|------|--------|-------------|
| **Database migration** | Create | New `activity_events` table + RLS policies |
| `src/components/AddActivityModal.tsx` | Create | Activity creation modal with duration options |
| `src/hooks/useActivityEvents.ts` | Create | Hook for activity CRUD and data fetching |
| `src/pages/MyVisits.tsx` | Edit | Add Activity button (grid-cols-4), modal state, import |
| `src/components/VisitCard.tsx` | Edit | Show activity badge, duration, type when visit_type = 'activity' |

## Technical Details

### Activity Creation Flow

```text
User clicks "Activity" button in My Visit
  -> AddActivityModal opens
  -> User fills duration, type, customer, remarks
  -> On submit:
     1. Insert into visits (visit_type='activity', retailer_id, planned_date, status='planned')
     2. Insert into activity_events (visit_id, duration details, activity_type, remarks)
     3. Dispatch 'visitDataChanged' event for UI refresh
     4. Activity appears in My Visit list as a visit card
```

### Order Linking (Already Works)

```text
User taps "Take Order" on an activity visit card
  -> Navigates to OrderEntry with visitId and retailerId
  -> Order is placed with visit_id reference
  -> DB trigger auto_update_visit_status_on_order sets visit to 'productive'
  -> VisitCard shows order value and productive status
```

### Duration Display Logic

```text
hour_based:  "10:00 AM - 12:00 PM (2 hrs)"
half_day:    "First Half" or "Second Half"
full_day:    "Full Day"
multiple_days: "Jan 5 - Jan 8 (4 days)"
```

### Scoping -- Activity Visits Only in My Visit

Activity visits use `visit_type = 'activity'` in the visits table. Since analytics and reports query visits without filtering by type, they will naturally include activity visits in productivity calculations (which is correct -- an activity with an order IS productive). The activity badge in the VisitCard makes them visually distinct. If strict exclusion from reports is needed later, a simple `WHERE visit_type != 'activity'` filter can be added.

