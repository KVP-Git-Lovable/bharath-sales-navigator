

## Remove Editable Fields from Regularization Policy

Remove the entire "Editable Fields" section (Check-in Time, Check-out Time, Attendance Status, Reason Mandatory toggles) from the `RegularizationPolicyConfig` component.

### Changes

**File: `src/components/attendance/RegularizationPolicyConfig.tsx`**
- Delete the "Editable Fields" block (lines ~148-195) containing the 4 toggles: Check-in Time, Check-out Time, Attendance Status, and Reason Mandatory
- Delete the `<Separator />` immediately after that block
- Remove the `FileEdit` icon import since it will no longer be used
- Remove `allow_checkin_edit`, `allow_checkout_edit`, `allow_status_edit`, and `reason_mandatory` from the form state (they remain in the database schema but are no longer configurable from this UI)

No database or backend changes required.

