

## Plan: Three Improvements to Beat Planning

### 1. Add "Remove Plan" option in Plan My Journey (BeatPlanning.tsx)

**Current behavior:** When beats are planned for a day, the floating action bar at the bottom shows "Clear All", "Save Plan", and "View My Visit" buttons. There is no way to remove an individual beat plan that has already been saved to the database -- you can only toggle beats on/off before saving, or clear ALL at once.

**Change:** Add a "Remove" button next to each selected/planned beat in the beats list. When a journey is already saved for the day and beats are loaded from the database, each planned beat card should show a red "Remove" button. Clicking it will:
- Remove the beat from the local `plannedBeats` state
- Delete that specific beat_plan row from the database immediately
- Clear the My Visits snapshot for that date
- Show a toast confirmation

**Files to modify:**
- `src/pages/BeatPlanning.tsx` (lines 790-845): Update the beat card rendering to add a delete/remove action for already-planned beats. The existing "Remove" button (line 830) only toggles local state -- we need to also persist the deletion to the database when the beat was previously saved.

---

### 2. Real-time duplicate validation for beat name in Create New Beat (MyBeats.tsx)

**Current behavior:** There is already a duplicate check at save time (lines 532-538 in `handleSaveBeat`), but the user only sees the error when they click "Create". There is no immediate inline feedback while typing.

**Change:** Add a real-time validation message below the beat name input that checks against:
- The locally loaded `beats` array (instant check)
- Show an inline red warning message like "A beat with this name already exists" as the user types

**Files to modify:**
- `src/pages/MyBeats.tsx` (lines 1484-1493): Add a `useMemo` or derived state that checks `beatName` against existing `beats` names. Display an inline error message below the input field and disable the save button when a duplicate is found.

---

### 3. Display beat owner details on BeatCard (BeatCard.tsx)

**Current behavior:** The BeatCard shows beat name, retailer count, metrics, territory, creation date -- but no information about who created/owns the beat.

**Change:** 
- Pass `created_by` (user ID) from the beat data to BeatCard
- Fetch the owner's profile name using a lightweight query or pass it from the parent
- Display "Owner: [Full Name]" in the BeatCard alongside the creation date

**Files to modify:**
- `src/pages/MyBeats.tsx`: Include `created_by` in the beat data passed to BeatCard. Fetch profile names for all beat owners in a single query.
- `src/components/BeatCard.tsx`: Accept an `ownerName` prop and display it in the card footer area.

---

### 4. Fix Schedule Recurring Visits functionality

**Current behavior:** The recurring visits UI exists in the Create Beat modal (MyBeats.tsx lines 1495-1727). When enabled, `generateBeatPlans()` is called (lines 632-710) which creates beat_plan rows in the database. The logic looks correct -- it generates dates based on daily/weekly/monthly/custom patterns and inserts them.

**Investigation needed:** I'll verify the `generateBeatPlans` function is actually being called and the beat plans are being created correctly. The issue may be:
- The `beatName` variable used inside `generateBeatPlans` references state that may be stale
- The end date calculation for "permanent" mode only generates 365 days ahead
- The function may silently fail if the insert errors out

**Fix:** 
- Ensure `generateBeatPlans` receives `beatName` as a parameter rather than reading from state
- Add proper error handling and user feedback
- Verify the beat_plans are actually visible in the BeatPlanning page after creation

**Files to modify:**
- `src/pages/MyBeats.tsx`: Fix the `generateBeatPlans` function to accept beat name as parameter, add better error logging, and ensure the recurring plans are visible in the journey planner.

---

### Technical Summary

| File | Changes |
|------|---------|
| `src/pages/BeatPlanning.tsx` | Add per-beat remove with DB deletion for already-saved plans |
| `src/pages/MyBeats.tsx` | Real-time beat name duplicate validation with inline error; fix `generateBeatPlans` to use passed parameters; pass owner data to BeatCard |
| `src/components/BeatCard.tsx` | Add `ownerName` prop and display owner info |

