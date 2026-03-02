
## Add Status Filter to Team Approvals Page

### What Changes
Add a filter row below the Leave/Regularization tabs that lets you toggle between viewing **All**, **Pending**, or **Processed** requests.

### UI Design
A small segmented button group (similar style to the existing tabs) with three options:
- **All** -- shows everything (default)
- **Pending** -- only items awaiting action
- **Processed** -- only approved/rejected items

### Technical Changes

**File: `src/pages/TeamApprovals.tsx`**

1. Add a new state: `statusFilter` with type `'all' | 'pending' | 'processed'` (default `'all'`).
2. Add a filter row (3 small pill buttons) rendered between the tabs and the list.
3. Apply the filter to `currentList` before pagination:
   - `'pending'` -- keep items where `approvalStatus === 'pending'` or no status
   - `'processed'` -- keep items where `approvalStatus` is `'approved'` or `'rejected'`
   - `'all'` -- no filter
4. Reset `currentPage` to 1 when filter changes.
5. Update the empty state message to reflect the active filter.
