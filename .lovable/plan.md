

# Fix Activity Display on My Visit Page

## Problem

Activities are created successfully (confirmed in database), but they are invisible on the My Visit page. This happens because the page only displays retailers from beat plans -- activity visits (with `visit_type = 'activity'`) are not part of any beat plan, so they never appear in the list.

## Solution

Add a dedicated **Activity Table/Section** on the My Visit page below the main visit list, and add an **Activity Name** field to the creation form.

---

## Changes Overview

### 1. Database: Add `activity_name` column to `activity_events` table

Add a new `activity_name` text column (nullable) to let users give each activity a custom name.

### 2. New Component: `ActivityEventsTable` (`src/components/ActivityEventsTable.tsx`)

A standalone section displayed on the My Visit page that:
- Fetches activity events for the current user and selected date directly from the `activity_events` table (joined with retailer info)
- Displays them in a card-based table with columns: Activity Name, Activity Type, Duration, Customer/Outlet, Status, and Remarks
- Shows an amber-themed header to distinguish it from the regular visit list
- Auto-refreshes when a new activity is created (listens for `visitDataChanged` event)
- For multi-day activities, shows them on all dates within the range (from_date to to_date)
- Each row shows the activity badge, formatted duration, and a link to view the linked visit

### 3. Update `AddActivityModal` (`src/components/AddActivityModal.tsx`)

- Add an **"Activity Name"** text input field at the top of the form (e.g., "Diwali Celebration", "Product Launch Demo")
- Pass the activity name to the create function

### 4. Update `useActivityEvents` hook (`src/hooks/useActivityEvents.ts`)

- Add `activity_name` to the `ActivityEvent` interface and `CreateActivityParams`
- Include `activity_name` in the insert payload
- Add a new function `fetchActivitiesForDate` that queries activities by user_id and date (handles both single-day and multi-day ranges)

### 5. Update My Visit Page (`src/pages/MyVisits.tsx`)

- Import and render `ActivityEventsTable` below the visits list
- Pass `selectedDate` and `userId` as props so it fetches the right data

---

## Technical Details

### ActivityEventsTable query logic

```text
Fetch activities where:
  - user_id = current user
  - AND (
      activity_date = selectedDate                           -- single day activities
      OR (from_date <= selectedDate AND to_date >= selectedDate)  -- multi-day range
    )
Order by created_at DESC
```

### Activity Table display columns

| Column | Source |
|--------|--------|
| Activity Name | activity_name (new field) or activity_type as fallback |
| Type | activity_type (Celebration, Event, Promotion, Demo, Other) |
| Duration | Formatted via formatActivityDuration() |
| Customer | retailer_name |
| Remarks | remarks |

### File changes summary

| File | Action | What Changes |
|------|--------|-------------|
| Database migration | Create | Add `activity_name` column to `activity_events` |
| `src/components/ActivityEventsTable.tsx` | Create | New activity table component for My Visit page |
| `src/components/AddActivityModal.tsx` | Edit | Add Activity Name input field |
| `src/hooks/useActivityEvents.ts` | Edit | Add activity_name support + fetchActivitiesForDate |
| `src/pages/MyVisits.tsx` | Edit | Render ActivityEventsTable below visit list |

