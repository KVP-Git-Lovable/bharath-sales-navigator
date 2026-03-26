

# Fix: Regularization Approval Not Updating Attendance Times

## Root Cause

When a manager approves a regularization request, the `trigger_sync_entity_status` function only updates the `regularization_requests` table (setting `status = 'approved'`). **It never applies the corrected `requested_check_in_time` / `requested_check_out_time` back to the `attendance` table.** There is no trigger or function that propagates the approved times to the actual attendance record.

## Fix

### Single Migration: Add trigger to update attendance on regularization approval

Create a new trigger function `apply_regularization_to_attendance()` that fires `AFTER UPDATE OF status ON regularization_requests`. When the status changes to `'approved'`, it:

1. Finds the matching attendance record by `user_id` and `attendance_date`
2. Updates `check_in_time` with `requested_check_in_time` (if provided)
3. Updates `check_out_time` with `requested_check_out_time` (if provided)
4. Recalculates `total_hours` from the new times
5. Sets `status = 'regularized'` on the attendance record
6. If no attendance record exists for that date, creates one with the requested times

```sql
CREATE OR REPLACE FUNCTION public.apply_regularization_to_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_attendance_id uuid;
  v_check_in timestamptz;
  v_check_out timestamptz;
  v_total_hours numeric;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Get existing attendance
    SELECT id, check_in_time, check_out_time 
    INTO v_attendance_id, v_check_in, v_check_out
    FROM attendance 
    WHERE user_id = NEW.user_id AND date = NEW.attendance_date
    LIMIT 1;

    -- Apply requested times (keep original if not requested)
    v_check_in := COALESCE(NEW.requested_check_in_time, v_check_in);
    v_check_out := COALESCE(NEW.requested_check_out_time, v_check_out);
    
    -- Calculate total hours
    IF v_check_in IS NOT NULL AND v_check_out IS NOT NULL THEN
      v_total_hours := ROUND(EXTRACT(EPOCH FROM (v_check_out - v_check_in)) / 3600.0, 2);
    END IF;

    IF v_attendance_id IS NOT NULL THEN
      UPDATE attendance SET
        check_in_time = v_check_in,
        check_out_time = v_check_out,
        total_hours = v_total_hours,
        status = 'regularized',
        updated_at = now()
      WHERE id = v_attendance_id;
    ELSE
      INSERT INTO attendance (user_id, date, check_in_time, check_out_time, total_hours, status)
      VALUES (NEW.user_id, NEW.attendance_date, v_check_in, v_check_out, v_total_hours, 'regularized');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

Then attach the trigger:
```sql
DROP TRIGGER IF EXISTS trg_apply_regularization ON regularization_requests;
CREATE TRIGGER trg_apply_regularization
  AFTER UPDATE OF status ON regularization_requests
  FOR EACH ROW
  EXECUTE FUNCTION apply_regularization_to_attendance();
```

### No UI changes needed
The attendance display components already read `check_in_time` and `check_out_time` from the `attendance` table. Once the trigger writes the corrected times, all views (Recent Attendance, calendar, reports) will automatically reflect the updated times.

## Summary

| Change | Type |
|---|---|
| `apply_regularization_to_attendance()` function + trigger | DB Migration |

This is a single migration with no code changes required. The trigger handles all cases: updating existing attendance records or creating new ones when no record exists for the regularized date.

