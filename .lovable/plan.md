

## Remove Forward Logic from Team Approvals Page

### Problem
The `TeamApprovals.tsx` page still shows "Approve & Forward" buttons, level badges ("L1/2"), and "Will forward to Level 2 after approval" text -- all remnants of the old sequential workflow that should have been removed during the parallel approval migration.

### Changes (1 file)

**File: `src/pages/TeamApprovals.tsx`**

1. **Remove `getLevelBadge` function** (lines 88-103) and its usage on line 185 -- no more "L1/2" badges
2. **Simplify `getApproveLabel`** (lines 105-109) -- always return `'Approve'`
3. **Remove forward indicator** (lines 213-219) -- the "Will forward to Level X after approval" text and `ChevronRight` icon
4. **Simplify approve button styling** (lines 226-231) -- always use green (`bg-green-600`), remove the conditional blue/green based on `isFinalLevel`
5. **Remove unused import** -- `ChevronRight` from lucide-react (line 7)

All buttons will simply say "Approve" with consistent green styling, matching the parallel workflow where any manager's action is final.

