

## Parallel Leave Approval Workflow (Remove Forward Logic)

### Overview
Convert the current sequential (level-by-level) approval system into a parallel system where all managers in the hierarchy receive the request simultaneously. The first manager to act (approve/reject) makes the decision final.

### Database Changes (1 migration)

**1. Modify `create_approval_request` function**
- Keep creating steps for each manager in the chain, but set `total_levels = 1` and `current_level = 1` conceptually (or just leave them but they won't matter)
- The key change: all steps are immediately "active"

**2. Modify `process_approval_step` function**
- Remove the level-progression logic (no `current_level` advancement)
- When any approver acts:
  - If **approved**: set `approval_requests.status = 'approved'`, mark all other pending steps as `'skipped'`, set `final_approved_by`
  - If **rejected**: set `approval_requests.status = 'rejected'`, mark all other pending steps as `'skipped'`
- Always return `is_final = true` (no forwarding)

**3. No changes to `trigger_sync_entity_status`** -- it already handles syncing when `approval_requests.status` changes to approved/rejected

### Frontend Changes

**File: `src/hooks/useTeamAttendance.ts`**
- Remove the `current_level === level` filter (lines 176-178) -- all pending steps for pending requests should be visible
- Remove `isFinalLevel`, `myLevel`, `currentLevel`, `totalLevels` from the mapped data (or keep but they become irrelevant)
- Update toast messages: remove "Approved & forwarded" toast, always show "Approved" or "Rejected"

**File: `src/components/attendance/PendingApprovalsSection.tsx`**
- Remove the "L{level}/{total}" badge
- Remove the "Forwards to Level X after approval" indicator
- Change `getApproveLabel` to always return "Approve" (no "Final Approve" or "Approve & Forward")
- Remove `ChevronRight` forward indicator

**File: `src/hooks/useApprovalEngine.ts`**
- Update `useMyPendingSteps` to remove `current_level === level` filter
- Update `useProcessApprovalStep` toast messages (remove forward references)

**File: `src/hooks/useTeamAttendance.ts` (action handlers)**
- `handleLeaveAction`: Remove the "Approved & forwarded" toast branch, always show final result
- `handleRegularizationAction`: Same -- remove forward toast, simplify to approved/rejected only

### Technical Summary

The core change is in the database function `process_approval_step`:

```text
Before: Approve at level N -> advance current_level to N+1 -> next manager's turn
After:  Approve at any level -> mark request as approved -> skip all other steps -> done
```

This is a backwards-compatible change -- existing pending requests will work because all their steps are already "pending" and the new logic will accept any of them.

