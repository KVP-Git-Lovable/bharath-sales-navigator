
## Scalable Hierarchy-Based Approval Architecture for Attendance Management

### Current State Analysis

**What exists today:**
- `employees` table with `manager_id` (single-level chain) and `secondary_manager_id`
- `leave_applications` has `current_approval_level` (integer, defaults 1) and `final_approved_by` — already partially prepared
- `regularization_requests` has only `approved_by` — no level tracking
- `get_all_subordinates()` DB function exists (recursive CTE) — already built
- `useSubordinates` hook separates `directReportIds` (level 1) from all subordinates
- Current approval flow: manager sees only direct reports, approves/rejects in one shot
- **No multi-level routing** — approval jumps straight to done regardless of hierarchy depth
- **No audit trail** for approval steps
- **No payroll locking** on attendance records

**What's missing:**
- `approval_requests` master table
- `approval_steps` per-level table
- `get_reporting_chain()` DB function (upward traversal from employee → managers)
- `approval_config` per entity type
- `approval_audit_log`
- `attendance.locked` field for payroll protection
- Manager dashboard that shows only their pending level
- Admin approval timeline view

---

### Architecture Decision: Additive, Not Breaking

Rather than ripping out the existing `leave_applications.status` flow (which would break current UI), we will:
1. **Add the approval engine tables alongside** existing tables
2. **Bridge them** via triggers and foreign keys
3. **Migrate the action layer** (`handleLeaveAction`, `handleRegularizationAction`) to use the new engine
4. Existing data stays intact; new submissions get routed through the new engine

---

### Phase 1: Database Layer (Migrations)

**Migration 1 — Core Approval Engine Tables**

```sql
-- 1. approval_config: configures how many levels each entity type requires
CREATE TABLE public.approval_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL UNIQUE, -- 'leave', 'regularization', 'expense'
  use_full_hierarchy boolean NOT NULL DEFAULT true,
  max_levels integer NOT NULL DEFAULT 10,
  final_approval_role text, -- optional: 'admin' to force final level to admin
  skip_levels boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed defaults
INSERT INTO public.approval_config (entity_type, use_full_hierarchy, max_levels)
VALUES 
  ('leave', true, 10),
  ('regularization', true, 10);

-- 2. approval_requests: one master record per submitted entity
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,                -- 'leave' | 'regularization' | 'expense'
  entity_id uuid NOT NULL,                  -- FK to the actual record
  requester_id uuid NOT NULL,               -- employee who submitted
  current_level integer NOT NULL DEFAULT 1,
  total_levels integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',   -- pending | approved | rejected | cancelled
  final_approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. approval_steps: one row per level per request
CREATE TABLE public.approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  level integer NOT NULL,
  approver_id uuid NOT NULL,               -- manager at this level
  status text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | skipped
  action_taken_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. approval_audit_log: immutable event log
CREATE TABLE public.approval_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid REFERENCES public.approval_requests(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,                    -- 'submitted' | 'approved' | 'rejected' | 'cancelled'
  performed_by uuid NOT NULL,
  level integer,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

-- 5. Add locked fields to attendance for payroll protection
ALTER TABLE public.attendance 
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid;
```

**Migration 2 — get_reporting_chain() DB Function**

```sql
-- Upward traversal: from employee → their manager chain
CREATE OR REPLACE FUNCTION public.get_reporting_chain(p_user_id uuid)
RETURNS TABLE(manager_id uuid, level integer, full_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE chain AS (
    SELECT e.manager_id, 1 AS lvl
    FROM employees e
    WHERE e.user_id = p_user_id
      AND e.manager_id IS NOT NULL
    
    UNION ALL
    
    SELECT e.manager_id, c.lvl + 1
    FROM employees e
    INNER JOIN chain c ON e.user_id = c.manager_id
    WHERE e.manager_id IS NOT NULL
      AND c.lvl < 10  -- safety cap
  )
  SELECT 
    c.manager_id,
    c.lvl as level,
    COALESCE(p.full_name, p.username, 'Unknown') as full_name
  FROM chain c
  LEFT JOIN profiles p ON p.id = c.manager_id
  ORDER BY c.lvl;
END;
$$;
```

**Migration 3 — create_approval_request() DB Function**

```sql
-- Called when an employee submits leave/regularization
CREATE OR REPLACE FUNCTION public.create_approval_request(
  p_entity_type text,
  p_entity_id uuid,
  p_requester_id uuid
)
RETURNS uuid  -- returns the new approval_request id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chain RECORD;
  v_config RECORD;
  v_request_id uuid;
  v_levels integer := 0;
  v_step_level integer := 1;
BEGIN
  -- Get config for this entity type
  SELECT * INTO v_config 
  FROM approval_config 
  WHERE entity_type = p_entity_type;
  
  -- Build steps from reporting chain
  FOR v_chain IN 
    SELECT manager_id, level 
    FROM get_reporting_chain(p_requester_id)
    ORDER BY level
    LIMIT COALESCE(v_config.max_levels, 10)
  LOOP
    v_levels := v_levels + 1;
  END LOOP;
  
  -- If no chain, use 1 level (self-submit; admin must approve)
  IF v_levels = 0 THEN
    v_levels := 1;
  END IF;
  
  -- Create master request
  INSERT INTO approval_requests (entity_type, entity_id, requester_id, current_level, total_levels, status)
  VALUES (p_entity_type, p_entity_id, p_requester_id, 1, v_levels, 'pending')
  RETURNING id INTO v_request_id;
  
  -- Create a step for each manager in chain
  FOR v_chain IN 
    SELECT manager_id, level 
    FROM get_reporting_chain(p_requester_id)
    ORDER BY level
    LIMIT COALESCE(v_config.max_levels, 10)
  LOOP
    INSERT INTO approval_steps (approval_request_id, level, approver_id, status)
    VALUES (v_request_id, v_chain.level, v_chain.manager_id, 'pending');
  END LOOP;
  
  -- Log submission event
  INSERT INTO approval_audit_log (approval_request_id, entity_type, entity_id, action, performed_by, level, metadata)
  VALUES (v_request_id, p_entity_type, p_entity_id, 'submitted', p_requester_id, 0, 
          jsonb_build_object('total_levels', v_levels));
  
  RETURN v_request_id;
END;
$$;
```

**Migration 4 — process_approval_step() DB Function**

```sql
-- Called when a manager approves/rejects at their level
CREATE OR REPLACE FUNCTION public.process_approval_step(
  p_approval_request_id uuid,
  p_approver_id uuid,
  p_action text,       -- 'approved' | 'rejected'
  p_reason text DEFAULT NULL
)
RETURNS jsonb  -- {success, message, next_level, is_final}
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_step RECORD;
  v_next_level integer;
  v_is_final boolean := false;
BEGIN
  -- Fetch request
  SELECT * INTO v_request FROM approval_requests WHERE id = p_approval_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found');
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request already processed');
  END IF;
  
  -- Fetch the step for this approver at the current level
  SELECT * INTO v_step FROM approval_steps 
  WHERE approval_request_id = p_approval_request_id
    AND level = v_request.current_level
    AND approver_id = p_approver_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No pending step found for this approver');
  END IF;
  
  -- Update the step
  UPDATE approval_steps SET
    status = p_action,
    action_taken_at = now(),
    rejection_reason = p_reason
  WHERE id = v_step.id;
  
  -- Log action
  INSERT INTO approval_audit_log (approval_request_id, entity_type, entity_id, action, performed_by, level, metadata)
  VALUES (p_approval_request_id, v_request.entity_type, v_request.entity_id, p_action, p_approver_id, 
          v_request.current_level, jsonb_build_object('reason', p_reason));
  
  IF p_action = 'rejected' THEN
    -- Terminate workflow
    UPDATE approval_requests SET status = 'rejected', updated_at = now() WHERE id = p_approval_request_id;
    RETURN jsonb_build_object('success', true, 'message', 'Request rejected', 'is_final', true, 'action', 'rejected');
  END IF;
  
  -- Check if this was the final level
  v_next_level := v_request.current_level + 1;
  v_is_final := v_next_level > v_request.total_levels;
  
  IF v_is_final THEN
    UPDATE approval_requests SET
      status = 'approved',
      current_level = v_next_level,
      final_approved_by = p_approver_id,
      updated_at = now()
    WHERE id = p_approval_request_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Finally approved', 'is_final', true, 'action', 'approved');
  ELSE
    -- Advance to next level
    UPDATE approval_requests SET
      current_level = v_next_level,
      updated_at = now()
    WHERE id = p_approval_request_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Forwarded to next level', 'is_final', false, 'next_level', v_next_level, 'action', 'approved');
  END IF;
END;
$$;
```

**Migration 5 — RLS Policies**

```sql
-- approval_requests: user sees own, approver sees steps they own, admin sees all
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own approval requests"
ON public.approval_requests FOR SELECT
USING (requester_id = auth.uid());

CREATE POLICY "Approvers can view requests at their step"
ON public.approval_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM approval_steps s
  WHERE s.approval_request_id = approval_requests.id
    AND s.approver_id = auth.uid()
));

CREATE POLICY "Admins can view all approval requests"
ON public.approval_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- approval_steps: approver sees only their own steps
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approvers can view their own steps"
ON public.approval_steps FOR SELECT
USING (approver_id = auth.uid());

CREATE POLICY "Admins can view all steps"
ON public.approval_steps FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- audit log: read only for own requests and admins
ALTER TABLE public.approval_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit for own requests"
ON public.approval_audit_log FOR SELECT
USING (
  performed_by = auth.uid()
  OR EXISTS (SELECT 1 FROM approval_requests WHERE id = approval_audit_log.approval_request_id AND requester_id = auth.uid())
);

CREATE POLICY "Admins can view all audit logs"
ON public.approval_audit_log FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- approval_config: admin only write, authenticated read
ALTER TABLE public.approval_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read config"
ON public.approval_config FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage config"
ON public.approval_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
```

**Migration 6 — Trigger: Auto-call create_approval_request on insert**

```sql
-- When a leave application is inserted, auto-create the approval request
CREATE OR REPLACE FUNCTION public.trigger_create_leave_approval_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM create_approval_request('leave', NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leave_approval_request
AFTER INSERT ON public.leave_applications
FOR EACH ROW EXECUTE FUNCTION trigger_create_leave_approval_request();

-- Same for regularization
CREATE OR REPLACE FUNCTION public.trigger_create_regularization_approval_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM create_approval_request('regularization', NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_regularization_approval_request
AFTER INSERT ON public.regularization_requests
FOR EACH ROW EXECUTE FUNCTION trigger_create_regularization_approval_request();

-- When approval_requests.status flips to 'approved' for leave → update leave_applications.status
CREATE OR REPLACE FUNCTION public.trigger_sync_entity_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NEW.entity_type = 'leave' THEN
      UPDATE leave_applications SET 
        status = 'approved', 
        approved_by = NEW.final_approved_by, 
        approved_date = now(),
        final_approved_by = NEW.final_approved_by
      WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'regularization' THEN
      UPDATE regularization_requests SET 
        status = 'approved', 
        approved_by = NEW.final_approved_by, 
        approved_at = now()
      WHERE id = NEW.entity_id;
    END IF;
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    IF NEW.entity_type = 'leave' THEN
      UPDATE leave_applications SET status = 'rejected' WHERE id = NEW.entity_id;
    ELSIF NEW.entity_type = 'regularization' THEN
      UPDATE regularization_requests SET status = 'rejected' WHERE id = NEW.entity_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_entity_status
AFTER UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION trigger_sync_entity_status();
```

---

### Phase 2: Hook Layer Changes

**New hook: `useApprovalEngine.ts`**

This replaces the inline `handleLeaveAction` / `handleRegularizationAction` logic in `useTeamAttendance.ts` with engine-aware calls:

```typescript
// Key logic change
const handleApprovalAction = async (
  approvalRequestId: string,
  action: 'approved' | 'rejected',
  reason?: string
) => {
  const { data, error } = await supabase.rpc('process_approval_step', {
    p_approval_request_id: approvalRequestId,
    p_approver_id: user.id,
    p_action: action,
    p_reason: reason || null,
  });
  // If data.is_final → show "Finally approved" toast
  // If !data.is_final → show "Forwarded to Level X" toast
};
```

**Updated `useTeamAttendance.ts`:**
- `pendingApprovals` query changes: instead of querying `leave_applications.status = 'pending'` for direct reports, it queries `approval_steps` where `approver_id = auth.uid()` and `status = 'pending'`, then joins to `approval_requests` and entity tables
- This means a Level 2 manager automatically sees requests that have cleared Level 1
- Each `PendingApproval` item now carries `approvalRequestId` (from `approval_requests.id`) alongside the entity id

**New query shape for pending approvals:**
```sql
SELECT 
  ar.id as approval_request_id,
  ar.entity_type,
  ar.entity_id,
  ar.current_level,
  ar.total_levels,
  ast.level as my_level,
  ast.id as step_id
FROM approval_steps ast
JOIN approval_requests ar ON ar.id = ast.approval_request_id
WHERE ast.approver_id = auth.uid()
  AND ast.status = 'pending'
  AND ar.current_level = ast.level  -- only show when it's MY turn
ORDER BY ar.created_at ASC;
```

---

### Phase 3: UI Changes

**`TeamApprovals.tsx` and `PendingApprovalsSection.tsx`:**
- Show approval level badge: "Level 1 of 3" on each card
- Show "Will forward to: [Next Manager Name]" when it's not the final level
- Approve button label changes based on context: "Approve & Forward →" (not final) vs "Final Approve ✓" (final level)
- After approval at non-final level: card disappears (goes to next manager)

**New: `ApprovalTimeline` component (for Admin view):**
- Admin can see full audit trail for any leave/regularization
- Shows each level with timestamp, approver name, action taken
- Used in `AttendanceManagement.tsx` admin panel

**Updated `AttendanceManagement.tsx`:**
- Regularization tab shows `approval_requests` with full step history
- Can see which level is currently pending

**New: `ApprovalConfigPanel` component:**
- In `AttendanceManagement.tsx` settings tab
- Configure max levels, whether to use full hierarchy, final approval role

---

### Phase 4: Payroll Locking (Phase 3 scope)

**`attendance.locked` field** (already in migration 1):
- Admin can lock a month's attendance from `AttendanceManagement.tsx`
- `process_approval_step()` checks `attendance.locked` before approving regularization and returns error if locked
- UI shows lock status indicator on attendance rows

---

### Implementation Order

**Step 1 — Database migrations (all 6 in one migration file)**
- Create tables, functions, triggers, RLS policies

**Step 2 — `useApprovalEngine.ts` hook**
- `process_approval_step` RPC wrapper
- `useMyPendingSteps` query (approval_steps where approver = me, my turn)
- `useApprovalTimeline` query (audit log for a given entity)

**Step 3 — Update `useTeamAttendance.ts`**
- Replace direct `leave_applications` + `regularization_requests` pending queries with `approval_steps`-based query
- Replace `handleLeaveAction` / `handleRegularizationAction` with `processApprovalStep`

**Step 4 — Update `TeamApprovals.tsx` + `PendingApprovalsSection.tsx`**
- Add level badge and forward indicators
- Update button labels

**Step 5 — `ApprovalTimeline` component + admin integration**
- Admin can see full timeline per request

**Step 6 — `ApprovalConfigPanel` in AttendanceManagement settings**
- Allow configuring levels per entity type

---

### Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Trigger vs manual call for routing | DB trigger to sync status back to entity tables | Keeps existing UI working without changes to RegularizationRequestModal or leave submission |
| Who sees what | `approval_steps.approver_id = auth.uid()` AND `ar.current_level = step.level` | Ensures manager only sees it when it's their turn |
| Backward compat | Old `handleLeaveAction` kept but bridges to `process_approval_step` | Zero regression for current data/flows |
| Payroll lock enforcement | In `process_approval_step` DB function | Server-side, cannot be bypassed from client |
| Config storage | `approval_config` table | Admin can change levels without code deployment |

