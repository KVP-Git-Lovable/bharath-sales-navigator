
# Attendance Module: Scalability & Compliance Hardening Plan

## Current State Assessment

After reviewing the codebase and database, here is what exists today:

**What is solid (no changes needed):**
- Check-in/out flow with face verification
- Offline-first architecture (IndexedDB + localStorage + Supabase)
- Leave application and approval triggers
- `remaining_balance` as a generated column (already correct)
- `leave_accrual_log` already has the right indexes (`user_id + year`, `leave_type_id`)
- Multi-tenancy: This project has NO `tenant_id` columns by design (explicitly excluded per architecture memory) — so Phase 3 does NOT apply here

**What needs fixing:**
- `LiveAttendanceMonitoring` fetches ALL attendance + ALL users + ALL visits every page load — a full table scan every render
- Summary stats (present/absent/avg hours) are computed in JavaScript after fetching raw rows
- No audit trail when attendance is modified (regularization, manual edits, auto-close)
- CSV export runs synchronously in the browser — will freeze/timeout at scale
- `attendance` table has only 2 indexes (PK + user_id+date) — missing `date` and `status` indexes
- `leave_applications` has NO indexes at all (only PK)
- `pg_cron` and `pg_net` extensions are NOT installed — cron jobs run via external scheduling (the `auto-end-day` edge function)
- No soft lock on closed/processed attendance days
- No `locked` flag to protect payroll-processed records

---

## Implementation Plan

### Phase 1 — Admin Summary Tables (Highest Priority)

**Problem:** `LiveAttendanceMonitoring.tsx` runs 3 full-table queries on mount:
- `SELECT * FROM attendance WHERE date >= first_of_month` (no row limit)
- `SELECT id, full_name, username FROM profiles` (all users)
- `SELECT user_id, planned_date, ... FROM visits WHERE planned_date >= first_of_month`

Then it computes `totalPresent`, `totalAbsent`, `averageHours` in JavaScript by iterating all rows.

**Solution: Two summary tables + triggers to keep them current**

#### New Table 1: `attendance_daily_admin_summary`

```text
id                  uuid PK
date                date (indexed)
total_employees     integer   -- count of all active employees
total_present       integer   -- status = present or regularized
total_absent        integer   -- no attendance record
total_on_leave      integer   -- status = leave or half_day_leave
total_half_day      integer   -- status = half_day_leave
avg_hours           numeric   -- average total_hours for present employees
total_hours_sum     numeric   -- sum of all hours (for computing averages)
created_at          timestamptz
updated_at          timestamptz
```

Unique constraint: `(date)`

#### New Table 2: `attendance_user_monthly_summary`

```text
id                  uuid PK
user_id             uuid (FK profiles, indexed)
year                integer
month               integer (1–12)
present_days        integer
absent_days         integer
leave_days          integer
half_day_leave_days integer
regularized_days    integer
total_hours         numeric
avg_daily_hours     numeric
lop_days            numeric    -- pulled from approved leave_applications
working_days        integer    -- from working_days_config
created_at          timestamptz
updated_at          timestamptz
```

Unique constraint: `(user_id, year, month)`

#### Indexes to add

```sql
-- Phase 1 Performance Indexes
CREATE INDEX idx_attendance_date ON attendance (date);
CREATE INDEX idx_attendance_status ON attendance (status);
CREATE INDEX idx_attendance_user_date_status ON attendance (user_id, date, status);
CREATE INDEX idx_leave_applications_user_id ON leave_applications (user_id);
CREATE INDEX idx_leave_applications_status ON leave_applications (status);
CREATE INDEX idx_leave_applications_start_date ON leave_applications (start_date);
CREATE INDEX idx_leave_applications_user_status ON leave_applications (user_id, status);
```

#### DB Functions to maintain summaries

`refresh_daily_admin_summary(p_date DATE)` — recalculates and upserts one row in `attendance_daily_admin_summary` for the given date. Called by:
- Trigger on `attendance` (AFTER INSERT OR UPDATE)
- Trigger on `leave_applications` (AFTER UPDATE WHERE status changed to 'approved')
- The `auto-end-day` edge function (add one call at the end)

`refresh_user_monthly_summary(p_user_id UUID, p_year INT, p_month INT)` — recalculates and upserts one row in `attendance_user_monthly_summary`. Called by same triggers.

#### UI Change: `LiveAttendanceMonitoring.tsx`

Replace the 3-query block with:
```
SELECT * FROM attendance_daily_admin_summary WHERE date = today  → summary cards (O(1))
SELECT * FROM attendance WHERE date = today LIMIT 200            → individual row grid
```
This drops the query from scanning a month of data to reading a single pre-computed row for the summary cards.

---

### Phase 2 — Attendance Audit Log

**Problem:** When regularization is approved or `auto-end-day` runs, there is no record of what changed, who changed it, and from what value.

**Solution: New `attendance_audit_log` table**

```text
id              uuid PK
attendance_id   uuid (FK attendance, indexed)
user_id         uuid (the employee whose record changed)
changed_by      uuid (admin/manager who made the change, NULL for auto-close)
action_type     text  -- 'check_in', 'check_out', 'regularized', 'auto_closed', 'manual_edit', 'leave_marked'
old_values      jsonb -- { check_in_time, check_out_time, status, total_hours }
new_values      jsonb -- { check_in_time, check_out_time, status, total_hours }
ip_address      text  -- captured from request headers in edge functions
notes           text  -- e.g. "Auto-closed at midnight", "Regularized via #abc123"
created_at      timestamptz (default now())
```

Indexes: `(attendance_id)`, `(user_id, created_at)`, `(action_type, created_at)`

#### Trigger: `log_attendance_changes()`

Fires AFTER UPDATE on `attendance`. Compares OLD vs NEW, writes one row to `attendance_audit_log` for every meaningful field change (check_in_time, check_out_time, status, total_hours).

#### Edge function update: `auto-end-day`

After updating attendance, insert one `attendance_audit_log` row per user with `action_type = 'auto_closed'`, `changed_by = NULL`, and before/after snapshots.

#### UI: New "Audit Trail" sub-tab in Attendance Management

Under the existing tabs, add a read-only "Audit Trail" tab that shows:
- Employee name, date, action type, changed by, old → new times, timestamp
- Filters: date range, action type, employee
- Export to CSV

---

### Phase 3 — Multi-Tenant (NOT APPLICABLE)

This project explicitly excludes multi-tenancy by architecture decision. No `tenant_id` columns exist anywhere in the schema. This phase is skipped — the system uses user-based ownership via `user_id` and `employees.manager_id` hierarchy instead.

---

### Phase 4 — Attendance State Machine + Event Log

**Problem:** The `status` field is a free-text column with no enforcement of valid transitions (e.g., nothing prevents jumping from `present` to `leave` without an approval).

**Solution: Soft state machine via a PostgreSQL check constraint + event log table**

#### Valid status values (enforce via constraint)

```sql
ALTER TABLE attendance ADD CONSTRAINT chk_attendance_status 
CHECK (status IN ('present', 'leave', 'half_day_leave', 'regularized', 'auto_closed', 'absent'));
```

Note: `absent` is currently a synthetic client-side status (not stored in DB). We keep it that way. The constraint only applies to stored rows.

#### New Table: `attendance_event_log`

```text
id              uuid PK
attendance_id   uuid (FK attendance, indexed)
user_id         uuid
from_status     text  -- NULL for initial check-in
to_status       text
event_type      text  -- 'checked_in', 'checked_out', 'leave_marked', 'regularized', 'auto_closed'
triggered_by    uuid  -- user who triggered (NULL for system)
metadata        jsonb -- any extra context (face_confidence, location, etc.)
created_at      timestamptz
```

This table is append-only. It gives a complete timeline for debugging ("why did this attendance become regularized?").

The `log_attendance_changes` trigger (from Phase 2) can also write to this table to avoid duplication.

---

### Phase 5 — Leave Balance & Ledger Performance

**Current state (already good):**
- `remaining_balance` is already a database-generated column ✅
- `leave_accrual_log` already has `(user_id, year)` index ✅
- `leave_balance` already has unique index on `(user_id, leave_type_id, year)` ✅

**Remaining gaps:**

1. **LeaveLedger pagination:** The `LeaveLedger` component fetches ALL `leave_accrual_log` rows for a user+year with no `LIMIT`. Add server-side pagination (page size 20, load more button).

2. **Missing index on `leave_accrual_log.created_at`:** The ledger orders by `created_at DESC` but there is no index on that column.

```sql
CREATE INDEX idx_leave_accrual_log_created_at ON leave_accrual_log (created_at DESC);
CREATE INDEX idx_leave_accrual_log_user_year_type 
  ON leave_accrual_log (user_id, year, leave_type_id);
```

3. **Ledger never recalculates running total:** The `balance_after` column stores the snapshot at the time of the transaction. The UI displays this directly — no recalculation needed. ✅ Already correct.

---

### Phase 6 — Background CSV Export

**Problem:** `LiveAttendanceMonitoring.tsx` (line 389–420) runs `exportData()` synchronously, building the CSV in the browser from whatever is loaded in state. For large datasets this will timeout or produce incomplete data.

**Solution: `export_jobs` table + edge function**

#### New Table: `export_jobs`

```text
id              uuid PK
requested_by    uuid (FK profiles)
export_type     text   -- 'attendance_monthly', 'leave_summary', etc.
params          jsonb  -- { month, year, user_ids, ... }
status          text   -- 'pending', 'processing', 'completed', 'failed'
file_url        text   -- Supabase Storage path when done
error_message   text   -- if failed
created_at      timestamptz
completed_at    timestamptz
```

Index: `(requested_by, created_at)`

#### New Edge Function: `generate-attendance-export`

1. Admin clicks "Export" → inserts row into `export_jobs` with `status = 'pending'`
2. Edge function is triggered (via Supabase webhook on INSERT or polled via cron)
3. Function:
   - Marks job `status = 'processing'`
   - Queries `attendance` + `profiles` + `leave_applications` for the requested period
   - Generates CSV using Deno's standard library
   - Uploads to `attendance-exports` Supabase Storage bucket (private)
   - Updates `export_jobs.status = 'completed'`, `file_url = signed URL (24h expiry)`
   - Inserts a `notifications` row for the requesting admin: "Your export is ready — Download"
4. Admin sees notification in the app → clicks download link

#### UI Change

Replace the current synchronous export button in `LiveAttendanceMonitoring.tsx`:
- Button now shows "Request Export"
- Shows a history of recent export jobs for the admin
- "Download" button appears when job is `completed`
- Toast: "Export started — you'll be notified when it's ready"

---

### Phase 7 — Attendance Policy Improvements

These are additive columns/config, not breaking changes:

#### New columns on `attendance` table:

```sql
ALTER TABLE attendance ADD COLUMN is_late boolean DEFAULT false;
ALTER TABLE attendance ADD COLUMN late_minutes integer DEFAULT 0;  
ALTER TABLE attendance ADD COLUMN geofence_validated boolean DEFAULT false;
ALTER TABLE attendance ADD COLUMN check_in_ip text;
ALTER TABLE attendance ADD COLUMN check_out_ip text;
```

#### New config in `attendance_policy_config` (or extend existing):

Add fields:
- `grace_minutes` (integer, default 15) — late tolerance window after shift start
- `minimum_hours` (numeric, default 8.0) — hours below which day is flagged as half-day
- `geofence_radius_meters` (integer, default 500) — radius around HQ/beat for valid check-in
- `allow_multiple_checkin` (boolean, default false) — prevent duplicate check-ins

#### `is_late` trigger

After check-in: if `check_in_time` > `shift_start + grace_minutes`, set `is_late = true`, `late_minutes = diff`.

Note: IP tracking requires the Edge Function (verify-face-match or a new check-in function) to capture `req.headers.get('x-forwarded-for')` and write it to the attendance record.

---

### Phase 8 — Activity Logging Accuracy (Already Fixed)

This was corrected in the previous session. The `get_activity_logging_summary` function now uses `date_trunc('day', now())` for the "Today" window. No further changes needed. ✅

---

### Phase 9 — Analytics Cache

**Problem:** If heatmaps or monthly trends are ever added to the admin dashboard, running them against raw `attendance` rows at scale will be slow.

**Solution: Daily analytics precompute**

#### New Table: `attendance_analytics_cache`

```text
id                  uuid PK
cache_key           text (unique) -- e.g. 'monthly_heatmap_2026_02'
cache_type          text          -- 'monthly_heatmap', 'dept_trend', 'user_trend'
data                jsonb         -- precomputed result
computed_at         timestamptz
expires_at          timestamptz   -- typically next day midnight
```

A daily cron job (via the existing `auto-end-day` edge function or a new `refresh-analytics-cache` edge function) recomputes and upserts cache entries.

UI components read from this cache first; if expired or missing, they fall back to a live query and trigger a background refresh.

---

### Phase 10 — Soft Lock for Closed Days

**Problem:** Currently an admin can approve a regularization for any date — even dates from 3 months ago that have been included in payroll.

**Solution: `locked` flag on `attendance` table**

```sql
ALTER TABLE attendance ADD COLUMN locked boolean DEFAULT false;
ALTER TABLE attendance ADD COLUMN locked_at timestamptz;
ALTER TABLE attendance ADD COLUMN locked_by uuid;
ALTER TABLE attendance ADD COLUMN lock_reason text; -- 'payroll_processed', 'month_closed'
```

#### Lock enforcement

A trigger `prevent_locked_attendance_changes()` fires BEFORE UPDATE on `attendance`:
```
IF OLD.locked = true AND auth.uid() is not system admin THEN
  RAISE EXCEPTION 'This attendance record is locked and cannot be modified';
END IF;
```

#### Admin UI

In `LiveAttendanceMonitoring.tsx`, add a "Lock Month" button (admin only):
- Admin selects a month → confirms → batch UPDATE sets `locked = true` for all attendance rows in that month
- Locks also block new regularization requests for locked dates (validated before inserting into `regularization_requests`)

---

## Technical Implementation Order

### Week 1 (Performance Critical)

| Step | What | Files Changed |
|---|---|---|
| 1 | DB Migration: `attendance_daily_admin_summary`, `attendance_user_monthly_summary`, performance indexes | New migration file |
| 2 | DB Functions: `refresh_daily_admin_summary()`, `refresh_user_monthly_summary()` | Same migration |
| 3 | DB Triggers: fire refresh functions on attendance + leave_applications changes | Same migration |
| 4 | Update `LiveAttendanceMonitoring.tsx` to read from summary table for stat cards | `LiveAttendanceMonitoring.tsx` |
| 5 | Update `auto-end-day` edge function to call refresh after bulk close | `supabase/functions/auto-end-day/index.ts` |

### Week 2 (Compliance)

| Step | What | Files Changed |
|---|---|---|
| 6 | DB Migration: `attendance_audit_log` table + trigger `log_attendance_changes()` | New migration file |
| 7 | New UI tab "Audit Trail" in `AttendanceManagement.tsx` | `AttendanceManagement.tsx`, new `AttendanceAuditLog.tsx` |
| 8 | DB Migration: `export_jobs` table + `attendance-exports` storage bucket | New migration file |
| 9 | New edge function `generate-attendance-export` | `supabase/functions/generate-attendance-export/index.ts` |
| 10 | Update export button in `LiveAttendanceMonitoring.tsx` to async pattern | `LiveAttendanceMonitoring.tsx` |
| 11 | LeaveLedger pagination (load 20 at a time, "Load more" button) | `LeaveLedger.tsx` |

### Week 3 (Advanced)

| Step | What | Files Changed |
|---|---|---|
| 12 | DB Migration: `attendance_event_log` table + status check constraint | New migration file |
| 13 | DB Migration: `attendance_analytics_cache` table | New migration file |
| 14 | New edge function `refresh-analytics-cache` | `supabase/functions/refresh-analytics-cache/index.ts` |
| 15 | DB Migration: `locked` column on `attendance` + lock trigger | New migration file |
| 16 | Attendance policy: `grace_minutes`, `minimum_hours`, `geofence_radius_meters` columns | New migration file |
| 17 | "Lock Month" admin button in `LiveAttendanceMonitoring.tsx` | `LiveAttendanceMonitoring.tsx` |
| 18 | `is_late` and `late_minutes` computation in check-in trigger | New migration file |

---

## Summary of All Database Changes

| New Table | Purpose |
|---|---|
| `attendance_daily_admin_summary` | Pre-aggregated daily stats for admin dashboard |
| `attendance_user_monthly_summary` | Per-user monthly totals for reports |
| `attendance_audit_log` | Full before/after history of every attendance change |
| `attendance_event_log` | State machine event timeline per record |
| `attendance_analytics_cache` | Precomputed heatmaps and trend data |
| `export_jobs` | Background export job queue |

| New Indexes | On Table |
|---|---|
| `idx_attendance_date` | `attendance` |
| `idx_attendance_status` | `attendance` |
| `idx_attendance_user_date_status` | `attendance` |
| `idx_leave_applications_user_id` | `leave_applications` |
| `idx_leave_applications_status` | `leave_applications` |
| `idx_leave_applications_user_status` | `leave_applications` |
| `idx_leave_accrual_log_created_at` | `leave_accrual_log` |
| `idx_attendance_audit_log_attendance_id` | `attendance_audit_log` |
| `idx_attendance_audit_log_user_created` | `attendance_audit_log` |

| New Columns | On Table |
|---|---|
| `locked`, `locked_at`, `locked_by`, `lock_reason` | `attendance` |
| `is_late`, `late_minutes` | `attendance` |
| `geofence_validated`, `check_in_ip`, `check_out_ip` | `attendance` |

---

## What We Are NOT Changing

- Check-in/out UI flow
- Face verification logic
- Leave approval DB trigger (`mark_attendance_on_leave_approval`)
- Regularization UI
- Working days calculation logic
- Offline-first IndexedDB architecture
- `remaining_balance` generated column (already correct)
- Multi-tenancy (not applicable to this project)
