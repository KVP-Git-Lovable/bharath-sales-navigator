

## Attendance Retry with Reason — Plan

### Problem
When attendance marking fails (e.g., due to network errors, GPS issues, or duplicate constraint violations), the user gets a generic error toast and has to retry blindly. The user wants: **after 2 failed attempts, show a dialog asking for a reason, then force-mark attendance**.

### Current State
- Face verification already has a retry mechanism (`faceVerificationAttempts` counter, bypasses after 2 attempts)
- Attendance insert failures go straight to a generic error toast in the catch block (line 766-778)
- The duplicate check (line 546-566) silently blocks re-marking with "Already Checked In" toast
- No mechanism to track overall attendance marking failure attempts

### What We Will Build

**Add an attendance failure attempt counter** (`attendanceFailureAttempts`) that tracks how many times the overall check-in process has failed (insert errors, network errors, etc.).

**After 2 failed attempts**, show a `ReasonDialog` asking the user to provide a reason (e.g., "GPS not working", "Network issue", "Photo upload failed"). On confirmation:
- Insert attendance with the reason stored in a new `manual_override_reason` column
- Bypass the normal flow and force-insert with `face_verification_status: 'override'`

### Database Change
Add a `manual_override_reason` column to the `attendance` table:
```sql
ALTER TABLE attendance ADD COLUMN manual_override_reason text;
```

### UI Changes in `src/pages/Attendance.tsx`
1. Add state: `attendanceFailureAttempts` (number), `showOverrideReasonDialog` (boolean), `pendingOverrideData` (cached photo/location for retry)
2. In the catch block (line 766): increment `attendanceFailureAttempts`. If count >= 2, set `showOverrideReasonDialog = true` and cache the pending data instead of just showing error toast
3. Add a reason dialog (reuse existing `RejectionReasonDialog` pattern or create a simple dialog) that on confirm:
   - Calls `supabase.from('attendance').insert(...)` with the cached data + `manual_override_reason`
   - Resets failure counter
   - Shows success toast

### Component Flow
```text
User clicks Check-In → Camera → Photo captured → Face verify → Insert attendance
  ↓ (fails)
Attempt 1: Show error toast, increment counter
  ↓ (user retries, fails again)
Attempt 2: Show "Provide Reason" dialog
  ↓ (user enters reason)
Force-insert attendance with manual_override_reason → Success
```

### Files to Modify
1. **Database migration** — Add `manual_override_reason` column to `attendance`
2. **`src/pages/Attendance.tsx`** — Add failure counter, override dialog, and force-insert logic
3. **`src/integrations/supabase/types.ts`** — Auto-updated after migration

