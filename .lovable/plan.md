
## Fix Hierarchy Tab: Show Correct Target Data and Daily Averages

### Problem
When a target is set for a single month (e.g., July only), the Hierarchy Allocation tab does not show:
- Which month(s) the target applies to
- The daily average breakdown per user
- The correctly set target values (shows default "auto" data instead)

### Root Cause
The `HierarchyAllocationTab` reads config from the database but does not extract or pass `target_start_month` / `target_end_month` to `AllocationTable`. The `AllocationTable` itself has no awareness of target duration, and its user cards don't show month info or daily averages.

### Solution

**1. Pass target duration from config through the component chain**

- **`HierarchyAllocationTab.tsx`**: Read `target_start_month` and `target_end_month` from the fetched config and pass them as props to `AllocationTable`.
- **`AllocationTable.tsx`**: Accept `targetStartMonth` and `targetEndMonth` as new props.

**2. Show month range badge on each user card in AllocationTable**

In `renderUserCard()` (tree view) and `renderTableView()` (table view), add a badge next to the user's name showing the active month range (e.g., "Jul" for single month, "Apr - Sep" for a range). This uses the same `FY_MONTHS_LIST` array already used elsewhere.

**3. Add expandable Daily Average section per user**

When a user row is expanded in the tree view, show a collapsible section below the target inputs displaying:
- Target month(s) label
- Working days input (default 25)
- Calculated daily averages for quantity, revenue, and visits based on the active month count

**4. Ensure targets read from DB are shown correctly**

The existing query in `AllocationTable` fetches `user_business_plans` data correctly. The issue is that when targets are 0 (not yet allocated to subordinates), the display shows empty/zero values. This is expected behavior -- the hierarchy shows each user's allocated target, not the parent's total. The month badge and daily avg will make it clear what period the target covers.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/HierarchyAllocationTab.tsx` | Pass `config.target_start_month` and `config.target_end_month` to `AllocationTable` |
| `src/components/admin/AllocationTable.tsx` | Accept duration props, add month badge to user cards, add collapsible daily avg section in tree view |

### Technical Details

**Month mapping** (reuse existing pattern):
```
const FY_MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
// target_start_month=4 (July), target_end_month=4 (July) -> "Jul"
// target_start_month=1 (April), target_end_month=6 (September) -> "Apr - Sep"
```

**Daily Average calculation** (same as `HierarchyUserTargetNode`):
```
activeMonthCount = targetEndMonth - targetStartMonth + 1
monthlyTarget = totalTarget / activeMonthCount  (or totalTarget if single month)
dailyAvg = monthlyTarget / workingDays
```

**Expandable section**: Use the existing `expandedUsers` state to toggle a daily average panel below each user's target inputs, showing calculated per-day metrics in card format.
