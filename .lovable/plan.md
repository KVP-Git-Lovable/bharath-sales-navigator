

## Fix: Auto-Update Attendance on Regularization Approval

### Problem Found

The regularization approval flow has a **critical gap**: when a regularization request is fully approved through all hierarchy levels, the system updates `regularization_requests.status` to `'approved'` but **never writes the requested times back to the `attendance` table**.

Current flow:
1. Employee submits regularization request (requested check-in: 9:00 AM, actual: 11:50 AM)
2. Approval engine processes through hierarchy levels
3. Final approval triggers `trigger_sync_entity_status` which sets `regularization_requests.status = 'approved'`
4. **STOP** -- Nothing updates the `attendance` record

### Solution

Add a new trigger on the `regularization_requests` table that fires when `status` changes to `'approved'`, and updates (or creates) the corresponding `attendance` record with the requested times.

### Database Migration

Create a new trigger function `apply_regularization_to_attendance()` on `regularization_requests`:

```text
When regularization_requests.status changes to 'approved':
  1. Find the attendance record for (user_id, attendance_date)
  2. If found:
     - Update check_in_time to requested_check_in_time (if provided)
     - Update check_out_time to requested_check_out_time (if provided)
     - Set status to 'regularized'
     - Set regularized_request_id to the request ID
     - Recalculate total_hours based on new times
  3. If NOT found (absent day being regularized):
     - INSERT a new attendance record with the requested times
     - Set status to 'regularized'
     - Set regularized_request_id
```

Key details:
- Uses `COALESCE` so that if only check-in OR check-out is requested, the other field keeps its original value
- Recalculates `total_hours` as the difference between check-out and check-in in decimal hours
- Sets `attendance.status = 'regularized'` so it's visually distinct from normal 'present'
- Links via `regularized_request_id` for audit trail (column already exists)

### Files Changed

**Database only** -- single migration, no application code changes needed:

1. **New migration SQL**: Creates `apply_regularization_to_attendance()` function and attaches it as an `AFTER UPDATE` trigger on `regularization_requests`

### No Frontend Changes Needed

The `RegularizationRequestModal.tsx` already submits `requested_check_in_time` and `requested_check_out_time` correctly. The approval engine already sets the status to 'approved'. The only missing piece is this database trigger to propagate the approved times into `attendance`.

