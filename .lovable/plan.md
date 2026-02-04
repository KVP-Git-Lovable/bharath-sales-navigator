

# Leave Management Enhancement Plan

## Executive Summary

This plan outlines enhancements to the existing Leave Management module to provide administrators full control over leave configuration while seamlessly integrating with the Attendance and Productivity modules. All changes are **purely additive** and will not disturb existing functionality.

---

## Current State Analysis

### What Already Exists

| Component | Location | Status |
|-----------|----------|--------|
| **Leave Types Table** | `leave_types` | Basic (name, description only) |
| **Leave Policy Table** | `leave_policy` | Partial (yearly entitlement, accrual type, carry forward) |
| **Leave Balance Table** | `leave_balance` | Working (user balances by year) |
| **Leave Applications Table** | `leave_applications` | Working (request workflow) |
| **User Leave Policy Table** | `user_leave_policy` | Exists but unused (custom entitlements) |
| **Leave Balances Manager** | `src/components/attendance/LeaveBalancesManager.tsx` | Working (bulk/individual assignment) |
| **Attendance Policy Config** | `src/components/attendance/AttendancePolicyConfig.tsx` | Working (entitlements, week-off config) |
| **Leave Application Modal** | `src/components/LeaveApplicationModal.tsx` | Working (employee self-service) |
| **Attendance Management Page** | `src/pages/AttendanceManagement.tsx` | Working (admin leave approval) |

### Gaps to Address

| Feature | Current State | Enhancement Needed |
|---------|---------------|-------------------|
| Leave Types Master | Only name/description | Add code, proof required, half-day, active status |
| Leave Policy Rules | Basic rules | Add backdated limit, sandwich rule, max per month, LOP handling |
| Attendance Integration | Approval only | Auto-mark attendance as LEAVE on approval |
| Accrual Automation | Manual only | Cron job for monthly credits |
| Carry Forward Logic | Configured but not executed | Year-end automation |
| Validation Rules | None | Overlapping check, balance validation, backdated restrictions |
| Reporting | None | Leave ledger, team calendar, LOP reports |

---

## Phase 1: Database Schema Enhancements

### 1.1 Enhance `leave_types` Table

Add missing fields for complete leave type configuration:

```sql
ALTER TABLE leave_types
ADD COLUMN code TEXT UNIQUE,
ADD COLUMN yearly_limit INTEGER DEFAULT 12,
ADD COLUMN allow_half_day BOOLEAN DEFAULT true,
ADD COLUMN proof_required BOOLEAN DEFAULT false,
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN color TEXT DEFAULT '#3b82f6',
ADD COLUMN sort_order INTEGER DEFAULT 0;
```

### 1.2 Enhance `leave_policy` Table

Add advanced policy rules:

```sql
ALTER TABLE leave_policy
ADD COLUMN max_leaves_per_month INTEGER DEFAULT NULL,
ADD COLUMN backdated_days_allowed INTEGER DEFAULT 0,
ADD COLUMN sandwich_rule_enabled BOOLEAN DEFAULT false,
ADD COLUMN negative_balance_allowed BOOLEAN DEFAULT false,
ADD COLUMN auto_approval_threshold INTEGER DEFAULT 0,
ADD COLUMN min_days_advance_notice INTEGER DEFAULT 0,
ADD COLUMN probation_applicable BOOLEAN DEFAULT true,
ADD COLUMN encashment_allowed BOOLEAN DEFAULT false,
ADD COLUMN encashment_limit INTEGER DEFAULT 0;
```

### 1.3 Create `leave_approval_workflow` Table

Support multi-level approval:

```sql
CREATE TABLE leave_approval_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_type_id UUID REFERENCES leave_types(id),
  approval_level INTEGER NOT NULL DEFAULT 1,
  approver_type TEXT CHECK (approver_type IN ('manager', 'hr', 'admin', 'specific_user')),
  approver_user_id UUID REFERENCES auth.users(id),
  min_days_trigger INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.4 Enhance `leave_applications` Table

Add fields for tracking and LOP:

```sql
ALTER TABLE leave_applications
ADD COLUMN days_requested NUMERIC DEFAULT 0,
ADD COLUMN is_half_day BOOLEAN DEFAULT false,
ADD COLUMN half_day_period TEXT CHECK (half_day_period IN ('first_half', 'second_half')),
ADD COLUMN is_lop BOOLEAN DEFAULT false,
ADD COLUMN lop_days NUMERIC DEFAULT 0,
ADD COLUMN proof_document_url TEXT,
ADD COLUMN attendance_marked BOOLEAN DEFAULT false,
ADD COLUMN sandwich_days_added INTEGER DEFAULT 0,
ADD COLUMN current_approval_level INTEGER DEFAULT 1,
ADD COLUMN final_approved_by UUID REFERENCES auth.users(id);
```

### 1.5 Create `leave_accrual_log` Table

Track all accrual transactions:

```sql
CREATE TABLE leave_accrual_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER,
  accrual_type TEXT CHECK (accrual_type IN ('monthly', 'quarterly', 'yearly', 'carry_forward', 'adjustment', 'encashment')),
  days_credited NUMERIC NOT NULL,
  days_debited NUMERIC DEFAULT 0,
  balance_after NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.6 Create `leave_holidays_bridge` Table

Link holidays to leave calculations:

```sql
CREATE TABLE leave_holidays_bridge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_application_id UUID REFERENCES leave_applications(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  is_sandwich_day BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 2: Database Functions and Triggers

### 2.1 Leave Application Validation Function

```sql
CREATE OR REPLACE FUNCTION validate_leave_application()
RETURNS TRIGGER AS $$
DECLARE
  v_balance NUMERIC;
  v_policy RECORD;
  v_overlapping INTEGER;
  v_days_in_month INTEGER;
BEGIN
  -- Get policy for this leave type
  SELECT * INTO v_policy FROM leave_policy 
  WHERE leave_type_id = NEW.leave_type_id AND is_active = true;
  
  -- Check overlapping leaves
  SELECT COUNT(*) INTO v_overlapping FROM leave_applications
  WHERE user_id = NEW.user_id
    AND id != COALESCE(NEW.id, gen_random_uuid())
    AND status NOT IN ('rejected', 'cancelled')
    AND (NEW.start_date, NEW.end_date) OVERLAPS (start_date, end_date);
  
  IF v_overlapping > 0 THEN
    RAISE EXCEPTION 'Overlapping leave request exists';
  END IF;
  
  -- Check backdated limit
  IF v_policy.backdated_days_allowed IS NOT NULL THEN
    IF NEW.start_date < CURRENT_DATE - v_policy.backdated_days_allowed THEN
      RAISE EXCEPTION 'Backdated leave beyond allowed limit';
    END IF;
  END IF;
  
  -- Check balance (unless LOP allowed)
  SELECT remaining_balance INTO v_balance FROM leave_balance
  WHERE user_id = NEW.user_id 
    AND leave_type_id = NEW.leave_type_id 
    AND year = EXTRACT(YEAR FROM NEW.start_date);
  
  IF COALESCE(v_balance, 0) < NEW.days_requested AND NOT COALESCE(v_policy.negative_balance_allowed, false) THEN
    RAISE EXCEPTION 'Insufficient leave balance';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 Attendance Auto-Mark Trigger

```sql
CREATE OR REPLACE FUNCTION mark_attendance_on_leave_approval()
RETURNS TRIGGER AS $$
DECLARE
  leave_date DATE;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Mark attendance for each day of leave
    FOR leave_date IN SELECT generate_series(NEW.start_date, NEW.end_date, '1 day')::DATE
    LOOP
      INSERT INTO attendance (user_id, date, status, notes)
      VALUES (NEW.user_id, leave_date, 
              CASE WHEN NEW.is_half_day THEN 'half_day_leave' ELSE 'leave' END,
              'Auto-marked: ' || (SELECT name FROM leave_types WHERE id = NEW.leave_type_id))
      ON CONFLICT (user_id, date) 
      DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes;
    END LOOP;
    
    -- Deduct from balance
    UPDATE leave_balance 
    SET used_balance = used_balance + NEW.days_requested,
        remaining_balance = remaining_balance - NEW.days_requested
    WHERE user_id = NEW.user_id 
      AND leave_type_id = NEW.leave_type_id
      AND year = EXTRACT(YEAR FROM NEW.start_date);
      
    -- Mark LOP if balance goes negative
    IF (SELECT remaining_balance FROM leave_balance 
        WHERE user_id = NEW.user_id AND leave_type_id = NEW.leave_type_id 
        AND year = EXTRACT(YEAR FROM NEW.start_date)) < 0 THEN
      NEW.is_lop := true;
      NEW.lop_days := ABS((SELECT remaining_balance FROM leave_balance 
                          WHERE user_id = NEW.user_id AND leave_type_id = NEW.leave_type_id));
    END IF;
    
    NEW.attendance_marked := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 Monthly Accrual Function (for Cron)

```sql
CREATE OR REPLACE FUNCTION process_monthly_leave_accrual()
RETURNS void AS $$
DECLARE
  v_policy RECORD;
  v_user RECORD;
  v_credit NUMERIC;
BEGIN
  FOR v_policy IN 
    SELECT * FROM leave_policy 
    WHERE is_active = true AND accrual_type = 'monthly'
  LOOP
    v_credit := v_policy.yearly_entitlement / 12.0;
    
    FOR v_user IN 
      SELECT id FROM profiles WHERE user_status = 'active'
    LOOP
      -- Credit the balance
      UPDATE leave_balance
      SET opening_balance = opening_balance + v_credit,
          remaining_balance = COALESCE(remaining_balance, 0) + v_credit
      WHERE user_id = v_user.id 
        AND leave_type_id = v_policy.leave_type_id
        AND year = EXTRACT(YEAR FROM CURRENT_DATE);
      
      -- Log the accrual
      INSERT INTO leave_accrual_log (user_id, leave_type_id, year, month, accrual_type, days_credited, balance_after)
      VALUES (v_user.id, v_policy.leave_type_id, EXTRACT(YEAR FROM CURRENT_DATE), 
              EXTRACT(MONTH FROM CURRENT_DATE), 'monthly', v_credit,
              (SELECT remaining_balance FROM leave_balance 
               WHERE user_id = v_user.id AND leave_type_id = v_policy.leave_type_id));
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.4 Year-End Carry Forward Function

```sql
CREATE OR REPLACE FUNCTION process_year_end_carry_forward()
RETURNS void AS $$
DECLARE
  v_policy RECORD;
  v_balance RECORD;
  v_carry NUMERIC;
  v_new_year INTEGER;
BEGIN
  v_new_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  FOR v_policy IN 
    SELECT lp.*, lt.name as leave_name FROM leave_policy lp
    JOIN leave_types lt ON lt.id = lp.leave_type_id
    WHERE lp.is_active = true
  LOOP
    FOR v_balance IN 
      SELECT * FROM leave_balance 
      WHERE leave_type_id = v_policy.leave_type_id 
        AND year = v_new_year - 1
        AND remaining_balance > 0
    LOOP
      IF v_policy.carry_forward_allowed THEN
        v_carry := LEAST(v_balance.remaining_balance, COALESCE(v_policy.max_carry_forward, v_balance.remaining_balance));
      ELSE
        v_carry := 0;
      END IF;
      
      -- Create or update new year balance with carry forward
      INSERT INTO leave_balance (user_id, leave_type_id, year, opening_balance, remaining_balance)
      VALUES (v_balance.user_id, v_policy.leave_type_id, v_new_year, 
              v_policy.yearly_entitlement + v_carry, v_policy.yearly_entitlement + v_carry)
      ON CONFLICT (user_id, leave_type_id, year) 
      DO UPDATE SET opening_balance = EXCLUDED.opening_balance + v_carry,
                    remaining_balance = leave_balance.remaining_balance + v_carry;
      
      -- Log carry forward
      IF v_carry > 0 THEN
        INSERT INTO leave_accrual_log (user_id, leave_type_id, year, accrual_type, days_credited, balance_after, notes)
        VALUES (v_balance.user_id, v_policy.leave_type_id, v_new_year, 'carry_forward', v_carry,
                (SELECT remaining_balance FROM leave_balance WHERE user_id = v_balance.user_id AND leave_type_id = v_policy.leave_type_id AND year = v_new_year),
                'Carried forward from ' || (v_new_year - 1));
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 3: UI Components

### 3.1 Enhanced Leave Types Manager (New Component)

**File:** `src/components/attendance/LeaveTypesManager.tsx`

```text
+------------------------------------------------------------------+
| Leave Types Master                                                |
+------------------------------------------------------------------+
| [+ Add Leave Type]                                                |
+------+--------+-------+----------+------+--------+--------+-------+
| Code | Name   | Limit | Half Day | Proof| Active | Color  | Action|
+------+--------+-------+----------+------+--------+--------+-------+
| CL   | Casual | 12    | Yes      | No   | Active | Blue   | Edit  |
| SL   | Sick   | 10    | Yes      | Yes  | Active | Red    | Edit  |
| EL   | Earned | 15    | No       | No   | Active | Green  | Edit  |
+------+--------+-------+----------+------+--------+--------+-------+
```

### 3.2 Enhanced Policy Configuration (Modify Existing)

**File:** `src/components/attendance/AttendancePolicyConfig.tsx`

Add new tabs:
- **Leave Rules**: Backdated limit, sandwich rule, max per month
- **LOP Configuration**: Negative balance, auto-LOP threshold
- **Approval Workflow**: Multi-level approval setup

```text
+------------------------------------------------------------------+
| Attendance Policy Configuration                                   |
+------------------------------------------------------------------+
| [Leave Entitlements] [Week-Off] [Leave Rules] [LOP Config]       |
+------------------------------------------------------------------+
| Leave Rules Tab:                                                  |
| ┌─────────────────────────────────────────────────────────────┐  |
| │ Backdated Leave Allowed: [3] days                           │  |
| │ Sandwich Rule: [✓] Include weekends/holidays between leaves │  |
| │ Max Leaves per Month: [4] days                              │  |
| │ Advance Notice Required: [1] day                            │  |
| └─────────────────────────────────────────────────────────────┘  |
+------------------------------------------------------------------+
```

### 3.3 Leave Calendar View (New Component)

**File:** `src/components/attendance/TeamLeaveCalendar.tsx`

Visual calendar showing team leave schedule:

```text
+------------------------------------------------------------------+
| Team Leave Calendar - February 2026                               |
+------------------------------------------------------------------+
| [< Prev]  [Feb 2026]  [Next >]    [Team: All ▼]                  |
+------------------------------------------------------------------+
|  Mon  |  Tue  |  Wed  |  Thu  |  Fri  |  Sat  |  Sun  |
+-------+-------+-------+-------+-------+-------+-------+
|   2   |   3   |   4   |   5   |   6   |   7   |   8   |
|       | John  | John  |       |       |       |       |
|       | (CL)  | (CL)  |       |       |       |       |
+-------+-------+-------+-------+-------+-------+-------+
```

### 3.4 Leave Ledger Component (New)

**File:** `src/components/attendance/LeaveLedger.tsx`

Individual employee leave transaction history:

```text
+------------------------------------------------------------------+
| Leave Ledger - John Doe                                           |
+------------------------------------------------------------------+
| Year: [2026 ▼]   Leave Type: [All ▼]                             |
+----------+------------+----------+----------+---------+-----------+
| Date     | Type       | Credit   | Debit    | Balance | Remarks   |
+----------+------------+----------+----------+---------+-----------+
| Jan 01   | Opening    | 12.00    | -        | 12.00   | FY Start  |
| Jan 15   | Casual     | -        | 2.00     | 10.00   | Approved  |
| Feb 01   | Accrual    | 1.00     | -        | 11.00   | Monthly   |
+----------+------------+----------+----------+---------+-----------+
```

### 3.5 LOP Report Component (New)

**File:** `src/components/attendance/LOPReport.tsx`

Track loss-of-pay instances for payroll integration:

```text
+------------------------------------------------------------------+
| LOP Report - February 2026                                        |
+------------------------------------------------------------------+
| [Export to Excel]                                                 |
+----------+------------+----------+----------+---------------------+
| Employee | Leave Type | LOP Days | Dates    | Reason              |
+----------+------------+----------+----------+---------------------+
| Jane Doe | Casual     | 2        | Feb 1-2  | Balance exhausted   |
| Mike Raj | Sick       | 1        | Feb 15   | No balance          |
+----------+------------+----------+----------+---------------------+
| Total LOP Days: 3                                                 |
+------------------------------------------------------------------+
```

---

## Phase 4: Navigation Integration

### 4.1 Update Attendance Management Tabs

**File:** `src/pages/AttendanceManagement.tsx`

Add new tabs to existing navigation:

```typescript
// Current tabs
['Live Attendance', 'Leave Management', 'Regularization', 'Leave Balances', 'Holidays', 'Working Days', 'Attendance Policy']

// Enhanced tabs
['Live Attendance', 'Leave Management', 'Regularization', 'Leave Balances', 'Leave Types', 'Leave Calendar', 'Holidays', 'Working Days', 'Attendance Policy', 'Reports']
```

### 4.2 Add Reports Sub-menu

New reports tab with:
- Leave Ledger
- Team Leave Summary
- LOP Report
- Leave Trend Analysis

---

## Phase 5: Automation (Edge Functions / Cron)

### 5.1 Monthly Accrual Cron Job

Schedule via `pg_cron` on the 1st of each month:

```sql
SELECT cron.schedule(
  'monthly-leave-accrual',
  '0 0 1 * *',
  $$SELECT process_monthly_leave_accrual()$$
);
```

### 5.2 Year-End Carry Forward Cron Job

Schedule for December 31st:

```sql
SELECT cron.schedule(
  'year-end-carry-forward',
  '0 23 31 12 *',
  $$SELECT process_year_end_carry_forward()$$
);
```

---

## Phase 6: Validation Checklist

### Application Validation Rules

| Rule | Implementation |
|------|----------------|
| No overlapping leaves | Trigger validation |
| Balance availability | Check before submission |
| Backdated limit | Policy-based validation |
| Sandwich rule | Auto-include weekends/holidays |
| Max per month | Policy enforcement |
| Proof requirement | UI enforcement by leave type |
| LOP auto-conversion | Trigger on negative balance |

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/attendance/LeaveTypesManager.tsx` | Leave types CRUD with enhanced fields |
| `src/components/attendance/TeamLeaveCalendar.tsx` | Visual team leave calendar |
| `src/components/attendance/LeaveLedger.tsx` | Individual leave transaction history |
| `src/components/attendance/LOPReport.tsx` | Loss-of-pay tracking report |
| `src/components/attendance/LeaveRulesConfig.tsx` | Advanced policy rules configuration |
| `src/components/attendance/ApprovalWorkflowConfig.tsx` | Multi-level approval setup |
| `src/hooks/useLeaveManagement.ts` | Hook for leave operations and validations |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AttendanceManagement.tsx` | Add new tabs for Leave Types, Calendar, Reports |
| `src/components/attendance/AttendancePolicyConfig.tsx` | Add Leave Rules and LOP Config tabs |
| `src/components/attendance/LeaveBalancesManager.tsx` | Link to leave ledger, add bulk operations |
| `src/components/LeaveApplicationModal.tsx` | Add proof upload, half-day selection, validation |
| `src/components/MyLeaveApplications.tsx` | Show LOP indicator, sandwich days info |

---

## Database Migration Summary

```sql
-- Phase 1: Schema enhancements
ALTER TABLE leave_types ADD COLUMN code TEXT, ...;
ALTER TABLE leave_policy ADD COLUMN max_leaves_per_month INTEGER, ...;
ALTER TABLE leave_applications ADD COLUMN days_requested NUMERIC, ...;

-- Phase 2: New tables
CREATE TABLE leave_approval_workflow (...);
CREATE TABLE leave_accrual_log (...);
CREATE TABLE leave_holidays_bridge (...);

-- Phase 3: Functions
CREATE FUNCTION validate_leave_application();
CREATE FUNCTION mark_attendance_on_leave_approval();
CREATE FUNCTION process_monthly_leave_accrual();
CREATE FUNCTION process_year_end_carry_forward();

-- Phase 4: Triggers
CREATE TRIGGER validate_leave_before_insert ...;
CREATE TRIGGER mark_attendance_after_approval ...;

-- Phase 5: RLS Policies
-- (Admin full access, users view own data)
```

---

## Integration Points

### Attendance Module
- Auto-mark attendance as LEAVE on approval
- Block punch-in on leave days
- Calculate working days excluding approved leaves

### Productivity Module
- Exclude leave days from productivity calculations
- Adjust visit targets for leave periods

### Payroll Integration (Future)
- Export LOP days for salary deduction
- Leave encashment calculations

---

## Backward Compatibility

All existing functionality will continue to work:
- Current leave applications flow unchanged
- Existing leave balances preserved
- Current policy configurations honored
- No breaking changes to existing data

The enhancements are purely additive, extending the existing tables and adding new components alongside the current implementation.

