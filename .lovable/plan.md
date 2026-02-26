

## Add First Half / Second Half Selection for Half-Day Leave

### Problem
When a user selects "Half Day" leave, the system automatically sets `half_day_period` to `'first_half'` without asking the user. There is no UI to choose between First Half and Second Half.

### Solution
Add a conditional radio group that appears when "Half Day" is selected, allowing the user to pick "First Half" or "Second Half". The selection is saved to the existing `half_day_period` column in `leave_applications`.

### Changes

**File: `src/components/LeaveApplicationModal.tsx`**

1. **Update state**: Change `half_day_period` from being hardcoded to a user-selectable state variable:
   - Add new state: `halfDayPeriod` with type `'first_half' | 'second_half'`, defaulting to `'first_half'`
   - Reset it when `leaveDay` changes back to `'full'`

2. **Add UI**: After the Full Day / Half Day radio group, conditionally render a "First Half" / "Second Half" selector when `leaveDay === 'half'`:
   - Two styled radio buttons or toggle buttons
   - First Half = morning session
   - Second Half = afternoon session

3. **Update submit logic**: Change line 103 from:
   ```
   half_day_period: leaveDay === 'half' ? 'first_half' : null
   ```
   to:
   ```
   half_day_period: leaveDay === 'half' ? halfDayPeriod : null
   ```

4. **Reset on close**: Include `halfDayPeriod` in the form reset after successful submission.

No database changes needed -- the `half_day_period` column already stores text values like `'first_half'` and `'second_half'`.

