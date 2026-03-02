
## Show Approved/Rejected Requests on Approvals Page

### Problem
Currently, once a leave or regularization request is approved/rejected, it disappears from the Team Approvals page because the query only fetches `approval_steps` with `status = 'pending'`. The user wants processed requests to remain visible with a status label like "Approved by Manager-Name".

### Changes

#### 1. Update `PendingApproval` interface (`src/hooks/useTeamAttendance.ts`)
- Add `approvalStatus` field: `'pending' | 'approved' | 'rejected'`
- Add `approvedByName` field: `string | null` (the manager who took action)

#### 2. Add a new query for processed approvals (`src/hooks/useTeamAttendance.ts`)
- Create a second query that fetches `approval_steps` where `approver_id = user.id` and `status` is `'approved'` or `'rejected'`, joined with `approval_requests` that are also `approved` or `rejected`.
- Fetch the `final_approved_by` from `approval_requests` and resolve the approver's name from `profiles`.
- Fetch the same entity details (leave_applications / regularization_requests) as the existing pending query.
- Merge these processed approvals into the `pendingApprovals` array with their status and approver name set.
- Sort the combined list: pending items first, then processed items (most recent first).

#### 3. Update the `TeamApprovals` page UI (`src/pages/TeamApprovals.tsx`)
- For items where `approvalStatus` is not `'pending'`:
  - Replace the Approve/Reject action buttons with a status badge showing "Approved by [Name]" (green) or "Rejected" (red).
  - Hide the action buttons entirely for already-processed requests.
- Update the summary text to distinguish pending vs. total counts (e.g., "You have 3 pending and 5 processed requests").
- Update tab badge counts to show pending count specifically.

#### 4. Update `PendingApprovalsSection` component (`src/components/attendance/PendingApprovalsSection.tsx`)
- Same conditional rendering: show status badge instead of action buttons for processed items.

### Technical Details

**Query for processed steps (new query in `useTeamAttendance`):**
```text
approval_steps
  WHERE approver_id = user.id
  AND status IN ('approved', 'rejected')
  JOIN approval_requests (status IN ('approved', 'rejected'))
  + fetch final_approved_by profile name
  + fetch entity details (leave_applications / regularization_requests)
```

**UI rendering logic in TeamApprovals.tsx:**
```text
if (approval.approvalStatus !== 'pending') {
  -> Show Badge: "Approved by {approvedByName}" or "Rejected"
  -> Hide Approve/Reject buttons
} else {
  -> Show Approve/Reject buttons (existing behavior)
}
```

**Sorting:** Pending items appear first, followed by recently processed items ordered by action date descending.
