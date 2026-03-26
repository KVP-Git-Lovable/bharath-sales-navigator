

# Fix: Half-Day Leave Showing as Full Day in Manager Approvals

## Problem

The `TeamApprovals.tsx` page ignores the `isHalfDay` and `halfDayPeriod` fields when displaying leave duration. The `getDayCount()` function only calculates based on date range, always showing "1 day" for single-day leaves — even when it's a half day.

The `PendingApprovalsSection.tsx` component already handles this correctly and can serve as a reference.

## Fix — Single File Change

**File:** `src/pages/TeamApprovals.tsx`

### 1. Update `getDayCount` to accept the approval object

```typescript
const getDayCount = (approval: PendingApproval) => {
  if (approval.isHalfDay || approval.daysRequested === 0.5) {
    const period = approval.halfDayPeriod === 'first_half' ? '1st Half' : 
                   approval.halfDayPeriod === 'second_half' ? '2nd Half' : '';
    return `Half Day${period ? ` - ${period}` : ''}`;
  }
  const days = approval.daysRequested ?? (
    !approval.endDate || approval.endDate === approval.date 
      ? 1 
      : differenceInDays(new Date(approval.endDate), new Date(approval.date)) + 1
  );
  return `${days} ${days === 1 ? 'day' : 'days'}`;
};
```

### 2. Update the display line (~line 217)

Change the call from `getDayCount(approval.date, approval.endDate)` to `getDayCount(approval)`.

No other files need changes.

