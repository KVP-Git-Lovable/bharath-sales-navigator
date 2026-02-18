
## Fix: Add Manager RLS Policies to leave_applications

### What's Wrong

The `leave_applications` table has two critical gaps in its Row Level Security policies:

1. **SELECT**: Managers cannot read their direct reports' leave applications — so the pending approval list is always empty for non-admin managers like Prajwal.
2. **UPDATE**: Managers cannot approve or reject leave applications — only admins can.

Suyog's leave application (ID: `0c99ba44`) is sitting in the database with `status = pending`, but Prajwal gets zero rows returned because RLS filters it out.

### Does it follow hierarchy?

The code in `useTeamAttendance.ts` already correctly handles this:
- Line 50: `approvalUserIds = directReportIds` — only **immediate reports** (level 1) get shown for approvals, not all subordinates. This is intentional — you only approve your direct reports' leaves.
- The `useSubordinates` hook fetches `directReportIds` (level = 1 only) correctly.

So the hierarchy logic is correct in code — the database just blocks the data.

### The Fix: 2 New RLS Policies (1 Migration File)

**Policy 1 — SELECT for managers:**
Allow a manager to read leave applications from their direct reports.
```sql
CREATE POLICY "Managers can view their direct reports' leave applications"
  ON public.leave_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = leave_applications.user_id
        AND e.manager_id = auth.uid()
    )
  );
```

**Policy 2 — UPDATE for managers:**
Allow a manager to approve or reject leave applications from their direct reports.
```sql
CREATE POLICY "Managers can update their direct reports' leave applications"
  ON public.leave_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = leave_applications.user_id
        AND e.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = leave_applications.user_id
        AND e.manager_id = auth.uid()
    )
  );
```

### Technical Details

- **File to create**: `supabase/migrations/[timestamp]_manager_leave_applications_rls.sql`
- **No code changes needed** — the frontend query and hook logic is already correct
- The `employees` table is used as the source of truth for the manager–subordinate relationship (same table used by `get_all_subordinates`)
- This is a **direct-reports-only** policy (one level deep), matching the existing app behavior where approvals only show immediate subordinates

### Expected Result After Fix

Prajwal logs in → navigates to Team Approvals → sees Suyog's pending Sick Leave for Feb 18 → can Approve or Reject it.
