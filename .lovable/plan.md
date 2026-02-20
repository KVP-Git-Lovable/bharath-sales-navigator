
## Two Bugs Found & Fixed

### Bug 1: "Present" shown instead of "On Leave"

**Root Cause (in `useTeamAttendance.ts` lines 307–311):**

When a leave is approved, the trigger `mark_attendance_on_leave_approval` correctly creates an `attendance` row with `status = 'leave'`. However, the team hook fetches **all** attendance records for today without a status filter. The `attendanceMap` contains Satyaprakash's record (status=`'leave'`), so `att` is truthy. The logic then runs:

```ts
if (att) {
  todayStatus = att.status === 'regularized' ? 'regularized' : 'present'; // ← always hits 'present'
} else if (isOnLeave) {
  todayStatus = 'on_leave'; // ← never reached
}
```

The `else if (isOnLeave)` branch is **never reached** because the attendance row exists. The employee is shown as "Present" even though their attendance row says `status = 'leave'`.

**Fix:** Add a check for `att.status === 'leave'` before defaulting to `'present'`:

```ts
if (att) {
  if (att.status === 'leave' || att.status === 'half_day_leave') {
    todayStatus = 'on_leave';
  } else if (att.status === 'regularized') {
    todayStatus = 'regularized';
  } else {
    todayStatus = 'present';
  }
} else if (isOnLeave) {
  todayStatus = 'on_leave';
}
```

Also fix the `presentUserIds` set — it should exclude `'leave'` status rows so the summary counts are also correct:

```ts
// Before (counts ALL attendance including 'leave' as present):
const presentUserIds = new Set(todayAttendance.map((a: any) => a.user_id));

// After (only count actual present/regularized/late):
const presentUserIds = new Set(
  todayAttendance
    .filter((a: any) => !['leave', 'half_day_leave'].includes(a.status))
    .map((a: any) => a.user_id)
);
```

This also fixes the summary cards ("1 Present, 0 On Leave" → correct counts).

---

### Bug 2: "Unknown Leave Type" in My Leave Applications

**Root Cause (in `MyLeaveApplications.tsx` + database schema):**

There are **two duplicate foreign keys** from `leave_applications.leave_type_id` → `leave_types.id`:
- `fk_leave_applications_leave_type_id`
- `leave_applications_leave_type_id_fkey`

When PostgREST joins using `leave_types!leave_applications_leave_type_id_fkey`, it returns the result as a **single object** (not an array). But the transform code checks `Array.isArray(item.leave_types)` — since it's an object, `Array.isArray` returns `false`, so the null fallback is used → "Unknown Leave Type".

**Fix (two parts):**

**Part A — Drop the duplicate FK (database migration):**
```sql
ALTER TABLE public.leave_applications 
DROP CONSTRAINT IF EXISTS fk_leave_applications_leave_type_id;
```
This removes the ambiguity so PostgREST always uses `leave_applications_leave_type_id_fkey`.

**Part B — Fix the transform in `MyLeaveApplications.tsx`:**
Handle both cases (object and array) robustly so even if the shape changes, it never breaks:

```ts
const transformedData = (data || []).map(item => ({
  ...item,
  leave_types: Array.isArray(item.leave_types)
    ? (item.leave_types.length > 0 ? item.leave_types[0] : null)
    : (item.leave_types || null)   // ← handle the object case
}));
```

---

### Files to Modify

**1. `src/hooks/useTeamAttendance.ts`**
- Line 286: Fix `presentUserIds` to exclude `'leave'`/`'half_day_leave'` status rows
- Lines 307–312: Fix `todayStatus` logic to check `att.status === 'leave'`

**2. `src/components/MyLeaveApplications.tsx`**
- Lines 61–66: Fix the `leave_types` transform to handle both object and array shapes

**3. New database migration**
- Drop duplicate FK `fk_leave_applications_leave_type_id` from `leave_applications`

No other files need to change. These are precise, surgical fixes.
